import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/ScorePill";
import { computeScore } from "@/lib/scoreEngine";
import { toast } from "sonner";
import { Save } from "lucide-react";


const QUARTERS = ["Q1","Q2","Q3","Q4"] as const;

export function CheckIn() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"Q1"|"Q2"|"Q3"|"Q4">("Q1");

  const { data: goals = [] } = useQuery({
    queryKey: ["checkin-goals", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("goals").select("*, check_ins(*)").eq("employee_id", user!.id).in("status", ["APPROVED","LOCKED"]).order("created_at")).data ?? [],
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles"], queryFn: async () => (await supabase.from("cycles").select("*")).data ?? [],
  });
  const activeQuarterCycle = (cycles as any[]).find((c) => c.is_active && QUARTERS.includes(c.phase));
  const windowOpen = activeQuarterCycle?.phase === tab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Quarterly Check-in</h1>
        <p className="text-muted-foreground">Log actual achievement and update progress for each goal.</p>
      </div>
      {!windowOpen && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          {tab} check-in window is currently <strong>closed</strong>. You can still review entries; saving is disabled.
        </div>
      )}
      <Tabs value={tab} onValueChange={(v: string) => setTab(v as "Q1"|"Q2"|"Q3"|"Q4")}>
        <TabsList>{QUARTERS.map((q) => <TabsTrigger key={q} value={q}>{q}</TabsTrigger>)}</TabsList>
        {QUARTERS.map((q) => (
          <TabsContent key={q} value={q} className="space-y-3">
            {goals.length === 0 && <p className="text-sm text-muted-foreground">No approved goals yet.</p>}
            {(goals as any[]).map((g) => (
              <CheckInRow key={g.id} goal={g} quarter={q} disabled={!windowOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["checkin-goals"] })} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CheckInRow({ goal, quarter, disabled, onSaved }: { goal: any; quarter: string; disabled: boolean; onSaved: () => void }) {
  const existing = (goal.check_ins ?? []).find((c: any) => c.quarter === quarter);
  const [actual, setActual] = useState<number>(existing?.actual_achievement ?? 0);
  const [status, setStatus] = useState<string>(existing?.progress_status ?? "NOT_STARTED");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setActual(existing?.actual_achievement ?? 0);
    setStatus(existing?.progress_status ?? "NOT_STARTED");
  }, [existing?.id, quarter]);

  const score = computeScore(goal.uom_type, Number(goal.target), Number(actual));

  const save = async () => {
    setBusy(true);
    const payload: any = {
      goal_id: goal.id, quarter,
      planned_target: Number(goal.target) / 4,
      actual_achievement: Number(actual),
      progress_status: status,
      computed_score: score,
    };
    const { error } = existing
      ? await supabase.from("check_ins").update(payload).eq("id", existing.id)
      : await supabase.from("check_ins").insert(payload);
    if (error) { setBusy(false); toast.error(error.message); return; }

    // Sync siblings sharing the same parent_goal_id
    const parentId = goal.parent_goal_id ?? (goal.is_shared ? goal.id : null);
    if (parentId) {
      const { data: siblings } = await supabase.from("goals")
        .select("id, employee_id, uom_type, target")
        .or(`parent_goal_id.eq.${parentId},id.eq.${parentId}`);
      const others = (siblings ?? []).filter((s: any) => s.id !== goal.id);
      for (const sib of others) {
        const sibScore = computeScore(sib.uom_type, Number(sib.target), Number(actual));
        const { data: existSib } = await supabase.from("check_ins")
          .select("id").eq("goal_id", sib.id).eq("quarter", quarter as any).maybeSingle();
        const sibPayload: any = {
          goal_id: sib.id, quarter,
          planned_target: Number(sib.target) / 4,
          actual_achievement: Number(actual),
          progress_status: status,
          computed_score: sibScore,
        };
        if (existSib?.id) await supabase.from("check_ins").update(sibPayload).eq("id", existSib.id);
        else await supabase.from("check_ins").insert(sibPayload);
      }
    }
    setBusy(false);
    toast.success(`${quarter} saved`);
    onSaved();
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-2"><CardTitle className="font-display text-base">{goal.title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-1"><Label className="text-xs">Thrust</Label><div className="text-sm">{goal.thrust_area}</div></div>
        <div><Label className="text-xs">UoM</Label><div><Badge variant="outline">{goal.uom_type}</Badge></div></div>
        <div><Label className="text-xs">Target</Label><div className="text-sm font-medium">{goal.target}</div></div>
        <div><Label className="text-xs">Actual Achievement</Label><Input type="number" value={actual} onChange={(e) => setActual(Number(e.target.value))} disabled={disabled || goal.uom_type === "ZERO" && false} step="any" /></div>
        <div><Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="ON_TRACK">On Track</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-5 flex items-center justify-between border-t pt-3">
          <ScorePill score={score} />
          <Button size="sm" onClick={save} disabled={busy || disabled}><Save className="mr-1 h-4 w-4" /> Save</Button>
        </div>
        {existing?.manager_comment && (
          <div className="md:col-span-5 rounded bg-muted px-3 py-2 text-xs">
            <strong>Manager note:</strong> {existing.manager_comment}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

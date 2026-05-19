import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";


export function Escalations() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ["escalations"],
    queryFn: async () => (await supabase.from("escalation_logs").select("*").order("triggered_at", { ascending: false })).data ?? [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, name, email").order("name")).data ?? [],
  });
  const nameOf = (id: string | null) => (profiles as any[]).find((p) => p.id === id)?.name ?? "—";

  const runCheck = async () => {
    setRunning(true);
    try {
      const [cyclesRes, rolesRes, goalsRes, existingRes] = await Promise.all([
        supabase.from("cycles").select("*").eq("is_active", true),
        supabase.from("user_roles").select("user_id, role").eq("role", "employee"),
        supabase.from("goals").select("id, employee_id, status, created_at, updated_at"),
        supabase.from("escalation_logs").select("reason, user_id").eq("resolved", false),
      ]);

      const employees = (rolesRes.data ?? []).map((r: any) => r.user_id);
      const goals = goalsRes.data ?? [];
      const existing = new Set((existingRes.data ?? []).map((e: any) => `${e.user_id ?? ""}|${e.reason}`));
      const now = new Date();
      const inserts: { user_id: string | null; reason: string }[] = [];

      // (a) GOAL_SETTING cycle open 7+ days: employees with no SUBMITTED/APPROVED goal
      const gsCycle = (cyclesRes.data ?? []).find((c: any) => c.phase === "GOAL_SETTING");
      if (gsCycle && differenceInDays(now, new Date(gsCycle.opens_at)) >= 7) {
        const submitters = new Set(
          goals.filter((g: any) => ["SUBMITTED", "APPROVED"].includes(g.status)).map((g: any) => g.employee_id)
        );
        for (const uid of employees) {
          if (!submitters.has(uid)) {
            const reason = `No goals submitted 7+ days after ${gsCycle.year} goal-setting cycle opened`;
            const key = `${uid}|${reason}`;
            if (!existing.has(key)) inserts.push({ user_id: uid, reason });
          }
        }
      }

      // (b) SUBMITTED goals not approved within 5 days
      for (const g of goals) {
        if (g.status !== "SUBMITTED") continue;
        if (differenceInDays(now, new Date(g.updated_at)) >= 5) {
          const reason = `Goal pending manager approval 5+ days (goal ${g.id.slice(0, 8)})`;
          const key = `${g.employee_id}|${reason}`;
          if (!existing.has(key)) inserts.push({ user_id: g.employee_id, reason });
        }
      }

      if (!inserts.length) {
        toast.success("Escalation check complete — no new violations");
      } else {
        const { error } = await supabase.from("escalation_logs").insert(inserts);
        if (error) throw error;
        toast.success(`Logged ${inserts.length} new escalation(s)`);
        qc.invalidateQueries({ queryKey: ["escalations"] });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  // Auto-run escalation check on first mount if log is empty
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!running && logs.length === 0) runCheck(); }, [logs.length]);

  const resolve = async (id: string) => {
    const { error } = await supabase.from("escalation_logs")
      .update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Resolved");
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };

  const open = (logs as any[]).filter((l) => !l.resolved);
  const closed = (logs as any[]).filter((l) => l.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><AlertTriangle className="h-7 w-7" /> Escalations</h1>
        <Button onClick={runCheck} disabled={running}>
          <PlayCircle className="mr-1 h-4 w-4" /> {running ? "Checking…" : "Run Escalation Check"}
        </Button>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Flags employees who haven't submitted goals 7+ days after the goal-setting cycle opened.</p>
          <p>• Flags goals submitted but not approved by a manager within 5 days.</p>
          <p>Duplicate open entries are skipped automatically.</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle>Open ({open.length})</CardTitle></CardHeader>
        <CardContent>
          {!open.length && <p className="text-sm text-muted-foreground">No open escalations 🎉</p>}
          <div className="space-y-2">
            {open.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <div>
                  <div className="text-sm font-medium">{l.reason}</div>
                  <div className="text-xs text-muted-foreground">{nameOf(l.user_id)} · {format(new Date(l.triggered_at), "MMM d, HH:mm")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolve(l.id)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Resolve
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle>Resolved ({closed.length})</CardTitle></CardHeader>
        <CardContent>
          {!closed.length && <p className="text-sm text-muted-foreground">None.</p>}
          <div className="space-y-2">
            {closed.slice(0, 20).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{l.reason}</div>
                  <div className="text-xs text-muted-foreground">{nameOf(l.user_id)} · {format(new Date(l.triggered_at), "MMM d")}</div>
                </div>
                <Badge variant="secondary">Resolved</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

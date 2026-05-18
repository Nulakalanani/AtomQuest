import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/ScorePill";
import { computeScore } from "@/lib/scoreEngine";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export function ManagerCheckIns() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"Q1" | "Q2" | "Q3" | "Q4">("Q1");

  const { data: reports = [] } = useQuery({
    queryKey: ["mgr-checkins", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("*, goals(*, check_ins(*))").eq("manager_id", user!.id)).data ?? [],
  });

  const totalCheckins = (reports as any[]).reduce(
    (s, r) => s + r.goals.reduce((gs: number, g: any) => gs + (g.check_ins?.length ?? 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Team Check-ins</h1>
        <p className="text-muted-foreground">{(reports as any[]).length} direct report(s) · {totalCheckins} check-in(s)</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          {QUARTERS.map((q) => <TabsTrigger key={q} value={q}>{q}</TabsTrigger>)}
        </TabsList>

        {QUARTERS.map((q) => (
          <TabsContent key={q} value={q} className="space-y-4 mt-4">
            {!(reports as any[]).length && (
              <p className="text-sm text-muted-foreground">No direct reports assigned yet.</p>
            )}
            {(reports as any[]).map((r: any) => {
              const quarterCheckins = r.goals.flatMap((g: any) =>
                (g.check_ins ?? []).filter((c: any) => c.quarter === q).map((c: any) => ({ g, c }))
              );
              return (
                <Card key={r.id} className="border-0 shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="font-display text-base">{r.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <Badge variant={quarterCheckins.length > 0 ? "default" : "secondary"}>
                      {quarterCheckins.length} / {r.goals.length} submitted
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quarterCheckins.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">No {q} check-ins submitted yet.</p>
                    )}
                    {quarterCheckins.map(({ g, c }: any) => (
                      <CheckInItem
                        key={c.id}
                        goal={g}
                        ci={c}
                        managerId={user!.id}
                        onSaved={() => qc.invalidateQueries({ queryKey: ["mgr-checkins"] })}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CheckInItem({
  goal,
  ci,
  managerId,
  onSaved,
}: {
  goal: any;
  ci: any;
  managerId: string;
  onSaved: () => void;
}) {
  const [comment, setComment] = useState(ci.manager_comment ?? "");
  const [busy, setBusy] = useState(false);
  const score = computeScore(goal.uom_type, Number(goal.target), Number(ci.actual_achievement));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("check_ins")
      .update({ manager_comment: comment, manager_id: managerId, computed_score: score })
      .eq("id", ci.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Comment saved");
    onSaved();
  };

  return (
    <div className="rounded-lg border p-3 text-sm space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="font-medium">{goal.title}</div>
          <div className="text-xs text-muted-foreground">
            Planned {Number(ci.planned_target).toFixed(1)} · Actual {ci.actual_achievement} ·{" "}
            <Badge variant="outline" className="text-[10px]">{ci.progress_status}</Badge>
          </div>
        </div>
        <ScorePill score={score} />
      </div>
      <div className="space-y-1">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add coaching note (optional)…"
          rows={2}
        />
        <Button size="sm" onClick={save} disabled={busy}>
          Save Note
        </Button>
      </div>
      {ci.manager_comment && ci.manager_comment === comment && (
        <p className="text-[10px] text-muted-foreground">Last saved: {ci.manager_comment}</p>
      )}
    </div>
  );
}

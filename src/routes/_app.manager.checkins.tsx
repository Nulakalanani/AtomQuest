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


export function ManagerCheckIns() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: reports = [] } = useQuery({
    queryKey: ["mgr-checkins", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*, goals(*, check_ins(*))").eq("manager_id", user!.id)).data ?? [],
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Team Check-ins</h1>
      {(reports as any[]).map((r) => (
        <Card key={r.id} className="border-0 shadow-card">
          <CardHeader><CardTitle className="font-display text-base">{r.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {r.goals.flatMap((g: any) =>
              (g.check_ins ?? []).map((c: any) => (
                <CheckInItem key={c.id} goal={g} ci={c} managerId={user!.id} onSaved={() => qc.invalidateQueries({ queryKey: ["mgr-checkins"] })} />
              ))
            )}
            {r.goals.every((g: any) => !g.check_ins?.length) && <p className="text-xs text-muted-foreground">No check-ins yet.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CheckInItem({ goal, ci, managerId, onSaved }: any) {
  const [comment, setComment] = useState(ci.manager_comment ?? "");
  const [busy, setBusy] = useState(false);
  const score = computeScore(goal.uom_type, +goal.target, +ci.actual_achievement);

  const save = async () => {
    if (!comment.trim()) return toast.error("Comment is required");
    setBusy(true);
    await supabase.from("check_ins").update({ manager_comment: comment, manager_id: managerId, computed_score: score }).eq("id", ci.id);
    setBusy(false); toast.success("Comment saved"); onSaved();
  };

  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div><strong>{ci.quarter}</strong> · {goal.title}</div>
        <ScorePill score={score} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Planned {ci.planned_target} · Actual {ci.actual_achievement} · Status <Badge variant="outline" className="text-[10px]">{ci.progress_status}</Badge></div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Check-in note…" rows={2} className="mt-2" />
      <Button size="sm" onClick={save} disabled={busy} className="mt-2">Save Note</Button>
    </div>
  );
}

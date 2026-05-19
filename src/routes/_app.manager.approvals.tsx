import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X } from "lucide-react";


export function Approvals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pending = [] } = useQuery({
    queryKey: ["pending-approvals", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data: reports } = await supabase.from("profiles").select("id, name, email").eq("manager_id", user!.id);
      const ids = (reports ?? []).map((r) => r.id);
      if (!ids.length) return [];
      const { data: goals } = await supabase.from("goals").select("*").in("employee_id", ids).eq("status", "SUBMITTED");
      return (reports ?? []).map((r) => ({ ...r, goals: (goals ?? []).filter((g) => g.employee_id === r.id) })).filter((r) => r.goals.length);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Pending Approvals</h1>
      {!pending.length && <p className="text-muted-foreground">All caught up — no submissions waiting.</p>}
      {(pending as any[]).map((emp) => (
        <Card key={emp.id} className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">{emp.name}</CardTitle>
            <Badge>{emp.goals.length} goals</Badge>
          </CardHeader>
          <CardContent>
            <ApprovalPanel goals={emp.goals} onChange={() => qc.invalidateQueries({ queryKey: ["pending-approvals"] })} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApprovalPanel({ goals, onChange }: { goals: any[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Record<string, { target: number; weightage: number }>>({});
  const [returnComment, setReturnComment] = useState("");
  const [busy, setBusy] = useState(false);

  const get = (g: any) => editing[g.id] ?? { target: g.target, weightage: g.weightage };
  const set = (id: string, patch: any) => setEditing((e) => ({ ...e, [id]: { ...get({ id, ...e[id] }), ...patch } }));

  const total = goals.reduce((s, g) => s + Number(get(g).weightage), 0);

  const approve = async () => {
    if (total !== 100) return toast.error("Total weightage must equal 100% before approving");
    setBusy(true);
    for (const g of goals) {
      const e = get(g);
      await supabase.from("goals").update({
        target: Number(e.target), weightage: Number(e.weightage),
        status: "APPROVED", locked: true,
      }).eq("id", g.id);
    }
    setBusy(false); toast.success("Approved & locked"); onChange();
  };

  const returnRework = async () => {
    if (!returnComment.trim()) return toast.error("Add a comment");
    setBusy(true);
    for (const g of goals) {
      await supabase.from("goals").update({ status: "RETURNED", return_comment: returnComment }).eq("id", g.id);
    }
    setBusy(false); toast.success("Returned for rework"); onChange();
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground"><tr className="text-left"><th>Title</th><th>UoM</th><th>Target</th><th>Weight %</th></tr></thead>
        <tbody>
          {goals.map((g) => {
            const e = get(g);
            return (
              <tr key={g.id} className="border-t">
                <td className="py-2"><div className="font-medium">{g.title}</div><div className="text-xs text-muted-foreground">{g.thrust_area}</div></td>
                <td><Badge variant="outline">{g.uom_type}</Badge></td>
                <td><Input className="h-8 w-20" type="number" value={e.target} onChange={(ev) => set(g.id, { target: Number(ev.target.value) })} /></td>
                <td><Input className="h-8 w-20" type="number" value={e.weightage} onChange={(ev) => set(g.id, { weightage: Number(ev.target.value) })} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t pt-3">
        <div className={`text-sm ${total === 100 ? "text-success" : "text-destructive"}`}>Total: {total}%</div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm"><X className="mr-1 h-4 w-4" /> Return for Rework</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Return for Rework</DialogTitle></DialogHeader>
              <Textarea value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Explain what to fix…" rows={4} />
              <Button onClick={returnRework} disabled={busy}>Send back</Button>
            </DialogContent>
          </Dialog>
          <Button size="sm" onClick={approve} disabled={busy}><Check className="mr-1 h-4 w-4" /> Approve & Lock</Button>
        </div>
      </div>
    </div>
  );
}

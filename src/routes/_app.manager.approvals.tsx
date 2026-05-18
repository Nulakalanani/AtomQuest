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
      return (reports ?? [])
        .map((r) => ({ ...r, goals: (goals ?? []).filter((g) => g.employee_id === r.id) }))
        .filter((r) => r.goals.length);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Pending Approvals</h1>
      {!pending.length && (
        <p className="text-muted-foreground">All caught up — no submissions waiting.</p>
      )}
      {(pending as any[]).map((emp) => (
        <Card key={emp.id} className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">{emp.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{emp.email}</p>
            </div>
            <Badge>{emp.goals.length} goal{emp.goals.length !== 1 ? "s" : ""}</Badge>
          </CardHeader>
          <CardContent>
            <ApprovalPanel
              goals={emp.goals}
              employeeId={emp.id}
              managerId={user!.id}
              onChange={() => qc.invalidateQueries({ queryKey: ["pending-approvals"] })}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApprovalPanel({
  goals,
  employeeId,
  managerId,
  onChange,
}: {
  goals: any[];
  employeeId: string;
  managerId: string;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Record<string, { target: number; weightage: number }>>({});
  const [returnComment, setReturnComment] = useState("");
  const [busy, setBusy] = useState(false);

  const get = (g: any) => editing[g.id] ?? { target: g.target, weightage: g.weightage };
  const set = (id: string, patch: any) =>
    setEditing((e) => ({ ...e, [id]: { ...get({ id, ...e[id] }), ...patch } }));

  const total = goals.reduce((s, g) => s + Number(get(g).weightage), 0);

  const approve = async () => {
    if (total !== 100) return toast.error("Total weightage must equal 100% before approving");
    setBusy(true);
    try {
      // First apply any inline edits
      for (const g of goals) {
        const e = get(g);
        if (Number(e.target) !== Number(g.target) || Number(e.weightage) !== Number(g.weightage)) {
          await supabase.from("goals")
            .update({ target: Number(e.target), weightage: Number(e.weightage) })
            .eq("id", g.id);
        }
      }
      // Use the server-side approval function which validates 100% constraint
      const { data, error } = await supabase.rpc("approve_employee_goals", {
        p_employee_id: employeeId,
        p_manager_id: managerId,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.ok) throw new Error(result.error);
      toast.success(`Approved & locked ${result.approved} goal(s)`);
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const returnRework = async () => {
    if (!returnComment.trim()) return toast.error("Add a comment before returning");
    setBusy(true);
    try {
      for (const g of goals) {
        await supabase.from("goals")
          .update({ status: "RETURNED", return_comment: returnComment })
          .eq("id", g.id);
      }
      toast.success("Returned for rework");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="text-left">
              <th className="pb-2">Title</th>
              <th className="pb-2">UoM</th>
              <th className="pb-2">Target</th>
              <th className="pb-2">Weight %</th>
              <th className="pb-2">Thrust</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => {
              const e = get(g);
              return (
                <tr key={g.id} className="border-t">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{g.title}</div>
                    {g.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{g.description}</div>
                    )}
                  </td>
                  <td className="pr-3">
                    <Badge variant="outline">{g.uom_type}</Badge>
                  </td>
                  <td className="pr-3">
                    <Input
                      className="h-8 w-24"
                      type="number"
                      value={e.target}
                      onChange={(ev) => set(g.id, { target: Number(ev.target.value) })}
                      disabled={g.uom_type === "ZERO"}
                    />
                  </td>
                  <td className="pr-3">
                    <Input
                      className="h-8 w-20"
                      type="number"
                      value={e.weightage}
                      onChange={(ev) => set(g.id, { weightage: Number(ev.target.value) })}
                      min={10}
                      max={100}
                    />
                  </td>
                  <td className="text-xs text-muted-foreground">{g.thrust_area}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t pt-3 flex-wrap gap-3">
        <div className={`text-sm font-medium ${total === 100 ? "text-success" : "text-destructive"}`}>
          Total: {total}% {total === 100 ? "✓" : `(need ${100 - total > 0 ? "+" : ""}${100 - total}%)`}
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <X className="mr-1 h-4 w-4" /> Return for Rework
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Return for Rework</DialogTitle></DialogHeader>
              <Textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                placeholder="Explain what to fix…"
                rows={4}
              />
              <Button onClick={returnRework} disabled={busy}>Send back</Button>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            onClick={approve}
            disabled={busy || total !== 100}
            title={total !== 100 ? `Weightage must total 100% (currently ${total}%)` : ""}
          >
            <Check className="mr-1 h-4 w-4" /> Approve & Lock
          </Button>
        </div>
      </div>
    </div>
  );
}

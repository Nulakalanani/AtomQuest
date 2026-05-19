import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Unlock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function AdminGoals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["admin-locked-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*, profiles!goals_employee_id_fkey(name, email)")
        .eq("status", "APPROVED")
        .eq("locked", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const unlock = async (goal: any) => {
    if (!window.confirm(`Unlock this goal and return it for editing?\n\n"${goal.title}" — ${(goal.profiles as any)?.name}`)) return;
    if (!user) return;
    setBusy(goal.id);
    try {
      const { error: updateError } = await supabase
        .from("goals")
        .update({ locked: false, status: "RETURNED" })
        .eq("id", goal.id);
      if (updateError) throw updateError;

      const { error: auditError } = await supabase.from("audit_logs").insert({
        goal_id: goal.id,
        changed_by: user.id,
        field: "locked",
        old_value: "true",
        new_value: "false",
        action: "UNLOCK",
      });
      if (auditError) console.warn("Audit log insert failed:", auditError.message);

      toast.success("Goal unlocked and returned for editing");
      qc.invalidateQueries({ queryKey: ["admin-locked-goals"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-7 w-7" /> Manage Goals
        </h1>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Approved & Locked Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Once goals are approved, they are locked for editing. Use "Unlock" to return a goal to the employee for correction.
            The action is fully audited.
          </p>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Goal Title</TableHead>
                  <TableHead>Thrust Area</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Weight %</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(goals as any[]).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <div>{(g.profiles as any)?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{(g.profiles as any)?.email ?? ""}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="font-medium truncate" title={g.title}>{g.title}</div>
                      {g.description && (
                        <div className="text-xs text-muted-foreground truncate">{g.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{g.thrust_area}</TableCell>
                    <TableCell><Badge variant="outline">{g.uom_type}</Badge></TableCell>
                    <TableCell className="text-right">{g.target}</TableCell>
                    <TableCell className="text-right">{g.weightage}%</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unlock(g)}
                        disabled={busy === g.id}
                      >
                        <Unlock className="mr-1 h-3 w-3" />
                        {busy === g.id ? "Unlocking…" : "Unlock"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!goals.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No locked goals found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

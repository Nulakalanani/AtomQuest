import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, CheckCheck } from "lucide-react";


export function Approvals() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["pending-approvals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: reports } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("manager_id", user!.id);
      const ids = (reports ?? []).map((r) => r.id);
      if (!ids.length) return [];
      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .in("employee_id", ids)
        .eq("status", "SUBMITTED");
      return (reports ?? [])
        .map((r) => ({
          ...r,
          goals: (goals ?? []).filter((g) => g.employee_id === r.id),
        }))
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
            <CardTitle className="font-display text-lg">{emp.name}</CardTitle>
            <Badge>{emp.goals.length} goals</Badge>
          </CardHeader>
          <CardContent>
            <ApprovalPanel
              employeeId={emp.id}
              goals={emp.goals}
              onChange={() => qc.invalidateQueries({ queryKey: ["pending-approvals"] })}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApprovalPanel({
  employeeId,
  goals,
  onChange,
}: {
  employeeId: string;
  goals: any[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Record<string, { target: number; weightage: number }>>({});
  const [returnComments, setReturnComments] = useState<Record<string, string>>({});
  const [showReturn, setShowReturn] = useState<Record<string, boolean>>({});
  const [actioned, setActioned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const get = (g: any) => editing[g.id] ?? { target: g.target, weightage: g.weightage };
  const setVal = (id: string, patch: any) =>
    setEditing((e) => ({ ...e, [id]: { ...(e[id] ?? { target: 0, weightage: 0 }), ...patch } }));

  const pending = goals.filter((g) => !actioned.has(g.id));
  const total = pending.reduce((s, g) => s + Number(get(g).weightage), 0);

  // Validate a single goal's edited values
  const validateSingle = (goal: any): string | null => {
    const e = get(goal);
    if (Number(e.weightage) < 10)
      return `"${goal.title}" has weightage ${e.weightage}% — minimum is 10%`;
    return null;
  };

  // Validate all pending goals before bulk approve
  const validateAll = (): string | null => {
    if (total !== 100)
      return `Total weightage must equal 100% (currently ${total}%)`;
    for (const g of pending) {
      const err = validateSingle(g);
      if (err) return err;
    }
    return null;
  };

  // Approve a single goal (still checks its own weightage)
  const approveSingle = async (goal: any) => {
    const err = validateSingle(goal);
    if (err) return toast.error(err);

    setBusy(goal.id);
    const e = get(goal);
    const { error } = await supabase.from("goals").update({
      target: Number(e.target),
      weightage: Number(e.weightage),
      status: "APPROVED",
      locked: true,
    }).eq("id", goal.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`"${goal.title}" approved`);
    setActioned((prev) => new Set([...prev, goal.id]));
    onChange();
  };

  const toggleReturn = (id: string) =>
    setShowReturn((prev) => ({ ...prev, [id]: !prev[id] }));

  const returnSingle = async (goal: any) => {
    const comment = returnComments[goal.id]?.trim();
    if (!comment) return toast.error("Add a return comment first");
    setBusy(goal.id);
    const { error } = await supabase.from("goals").update({
      status: "RETURNED",
      return_comment: comment,
    }).eq("id", goal.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`"${goal.title}" returned for rework`);
    setActioned((prev) => new Set([...prev, goal.id]));
    onChange();
  };

  // Approve all — first apply any inline edits, then call the DB function
  // which atomically validates min 10% per goal and total = 100%
  const approveAll = async () => {
    if (pending.length === 0) return toast.info("No remaining goals to approve");
    const err = validateAll();
    if (err) return toast.error(err);

    setBulkBusy(true);

    // Apply any inline edits first
    for (const g of pending) {
      const e = get(g);
      const { error } = await supabase.from("goals").update({
        target: Number(e.target),
        weightage: Number(e.weightage),
      }).eq("id", g.id);
      if (error) {
        setBulkBusy(false);
        return toast.error(`Failed to save edits for "${g.title}": ${error.message}`);
      }
    }

    // Atomic approve via DB function (validates constraints server-side)
    const { data: result, error: fnErr } = await supabase.rpc("approve_employee_goals", {
      p_employee_id: employeeId,
    });

    setBulkBusy(false);

    if (fnErr) return toast.error(fnErr.message);

    if (result === "WEIGHTAGE_NOT_100") return toast.error("Total weightage must equal 100%");
    if (result === "MIN_WEIGHTAGE_VIOLATION") return toast.error("One or more goals have weightage below 10%");
    if (result === "UNAUTHORIZED") return toast.error("Not authorised to approve these goals");
    if (result !== "OK") return toast.error(`Unexpected result: ${result}`);

    toast.success("All remaining goals approved & locked");
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="text-left">
              <th className="py-2 pr-3">Title</th>
              <th className="pr-3">UoM</th>
              <th className="pr-3">Target</th>
              <th className="pr-3">Weight %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => {
              const e = get(g);
              const done = actioned.has(g.id);
              return (
                // Fixed: use React.Fragment with key instead of shorthand <>
                <tr key={`row-${g.id}`} className={`border-t ${done ? "opacity-50" : ""}`}>
                  <td className="py-2 pr-3">
                    <div className="font-medium">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{g.thrust_area}</div>
                  </td>
                  <td className="pr-3"><Badge variant="outline">{g.uom_type}</Badge></td>
                  <td className="pr-3">
                    <Input
                      className="h-8 w-20"
                      type="number"
                      value={e.target}
                      disabled={done}
                      onChange={(ev) => setVal(g.id, { target: Number(ev.target.value) })}
                    />
                  </td>
                  <td className="pr-3">
                    <Input
                      className={`h-8 w-20 ${Number(e.weightage) < 10 ? "border-destructive" : ""}`}
                      type="number"
                      value={e.weightage}
                      disabled={done}
                      min={10}
                      onChange={(ev) => setVal(g.id, { weightage: Number(ev.target.value) })}
                    />
                    {Number(e.weightage) < 10 && !done && (
                      <p className="mt-0.5 text-[10px] text-destructive">Min 10%</p>
                    )}
                  </td>
                  <td>
                    {done ? (
                      <Badge variant="secondary">Done</Badge>
                    ) : (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => approveSingle(g)}
                          disabled={busy === g.id}
                          className="h-8"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          {busy === g.id ? "…" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleReturn(g.id)}
                          disabled={busy === g.id}
                          className="h-8"
                        >
                          <X className="mr-1 h-3 w-3" /> Return
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {/* Return comment rows rendered as separate tbody rows to avoid nesting issues */}
            {goals.map((g) => {
              const done = actioned.has(g.id);
              if (!showReturn[g.id] || done) return null;
              return (
                <tr key={`return-${g.id}`} className="border-b">
                  <td colSpan={5} className="pb-3 pt-1">
                    <div className="flex gap-2 items-start">
                      <Textarea
                        className="flex-1 text-sm"
                        placeholder="Explain what to fix…"
                        rows={2}
                        value={returnComments[g.id] ?? ""}
                        onChange={(ev) =>
                          setReturnComments((prev) => ({ ...prev, [g.id]: ev.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => returnSingle(g)}
                        disabled={busy === g.id}
                      >
                        {busy === g.id ? "…" : "Send back"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <div
          className={`text-sm ${
            pending.length === 0
              ? "text-muted-foreground"
              : total === 100
              ? "text-success"
              : "text-destructive"
          }`}
        >
          {pending.length > 0 ? `Remaining total: ${total}%` : "All goals actioned"}
        </div>
        <Button
          size="sm"
          onClick={approveAll}
          disabled={bulkBusy || pending.length === 0}
        >
          <CheckCheck className="mr-1 h-4 w-4" />
          {bulkBusy ? "Approving…" : `Approve All Remaining (${pending.length})`}
        </Button>
      </div>
    </div>
  );
}

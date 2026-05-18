import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ListChecks, Download } from "lucide-react";
import { exportToCSV } from "@/lib/exportHelper";


export function Completion() {
  const { data } = useQuery({
    queryKey: ["completion"],
    queryFn: async () => {
      const [p, g, c, r] = await Promise.all([
        supabase.from("profiles").select("id, name, manager_id"),
        supabase.from("goals").select("id, employee_id, status"),
        supabase.from("check_ins").select("goal_id, quarter"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return { profiles: p.data ?? [], goals: g.data ?? [], cis: c.data ?? [], roles: r.data ?? [] };
    },
  });
  if (!data) return <p>Loading…</p>;

  const employeeIds = new Set(
    (data.roles as any[]).filter((r) => r.role === "employee").map((r) => r.user_id)
  );
  const managerName: Record<string, string> = Object.fromEntries(
    data.profiles.map((p: any) => [p.id, p.name])
  );

  const rows = (data.profiles as any[])
    .filter((p) => employeeIds.has(p.id))
    .map((p: any) => {
      const myGoals = data.goals.filter((g: any) => g.employee_id === p.id);
      const submitted = myGoals.filter((g: any) => ["SUBMITTED", "APPROVED"].includes(g.status)).length;
      const approved = myGoals.filter((g: any) => g.status === "APPROVED").length;
      const myGoalIds = new Set(myGoals.map((g: any) => g.id));
      const myCis = data.cis.filter((c: any) => myGoalIds.has(c.goal_id));
      const has = (q: string) => myCis.some((c: any) => c.quarter === q);
      return {
        id: p.id,
        name: p.name,
        manager: p.manager_id ? (managerName[p.manager_id] ?? "—") : "—",
        submitted,
        approved,
        q1: has("Q1"), q2: has("Q2"), q3: has("Q3"), q4: has("Q4"),
      };
    });

  const handleExport = () => {
    exportToCSV(
      `completion-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        Employee: r.name, Manager: r.manager,
        Submitted: r.submitted, Approved: r.approved,
        Q1: r.q1 ? "Yes" : "No", Q2: r.q2 ? "Yes" : "No",
        Q3: r.q3 ? "Yes" : "No", Q4: r.q4 ? "Yes" : "No",
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><ListChecks className="h-7 w-7" /> Completion Dashboard</h1>
        <Button variant="outline" onClick={handleExport}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
      </div>
      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle>Goal & Check-in Completion by Employee</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-center">Submitted</TableHead>
                <TableHead className="text-center">Approved</TableHead>
                <TableHead className="text-center">Q1</TableHead>
                <TableHead className="text-center">Q2</TableHead>
                <TableHead className="text-center">Q3</TableHead>
                <TableHead className="text-center">Q4</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.manager}</TableCell>
                  <TableCell className="text-center">{r.submitted}</TableCell>
                  <TableCell className="text-center">{r.approved}</TableCell>
                  {(["q1","q2","q3","q4"] as const).map((q) => (
                    <TableCell key={q} className="text-center">
                      {r[q] ? <span className="text-success">✅</span> : <span className="text-destructive">❌</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No employees found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

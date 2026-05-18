import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScorePill } from "@/components/ScorePill";
import { computeScore } from "@/lib/scoreEngine";
import { Building2, Users, Target, CheckSquare, AlertTriangle, TrendingUp } from "lucide-react";

export function AdminOverview() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id, name, email, manager_id").order("name")).data ?? [],
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () =>
      (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["admin-all-goals"],
    queryFn: async () =>
      (await supabase.from("goals").select("*, check_ins(*)").order("created_at")).data ?? [],
  });

  const { data: cycle } = useQuery({
    queryKey: ["active-cycle"],
    queryFn: async () =>
      (await supabase.from("cycles").select("*").eq("is_active", true).maybeSingle()).data,
  });

  const { data: openEscalations = [] } = useQuery({
    queryKey: ["escalations-count"],
    queryFn: async () =>
      (await supabase.from("escalation_logs").select("id").eq("resolved", false)).data ?? [],
  });

  const employees = (profiles as any[]).filter((p) =>
    (allRoles as any[]).some((r) => r.user_id === p.id && r.role === "employee")
  );
  const managers = (profiles as any[]).filter((p) =>
    (allRoles as any[]).some((r) => r.user_id === p.id && r.role === "manager")
  );

  const submitted = (goals as any[]).filter((g) => g.status === "SUBMITTED").length;
  const approved = (goals as any[]).filter((g) => g.status === "APPROVED" || g.locked).length;
  const draft = (goals as any[]).filter((g) => g.status === "DRAFT").length;

  // Org-level weighted score
  let scoreNum = 0, scoreW = 0;
  for (const g of goals as any[]) {
    const latest = (g.check_ins ?? []).sort((a: any, b: any) =>
      b.quarter.localeCompare(a.quarter)
    )[0];
    if (latest) {
      const sc = computeScore(g.uom_type, Number(g.target), Number(latest.actual_achievement));
      scoreNum += sc * Number(g.weightage);
      scoreW += Number(g.weightage);
    }
  }
  const orgScore = scoreW ? scoreNum / scoreW : null;

  // Per-employee status
  const employeeStatus = employees.map((emp: any) => {
    const empGoals = (goals as any[]).filter((g) => g.employee_id === emp.id);
    const status =
      empGoals.every((g) => g.locked || g.status === "APPROVED")
        ? "APPROVED"
        : empGoals.some((g) => g.status === "SUBMITTED")
        ? "SUBMITTED"
        : empGoals.length > 0
        ? "DRAFT"
        : "NONE";
    const totalW = empGoals.reduce((s: number, g: any) => s + Number(g.weightage), 0);
    let sNum = 0, sW = 0;
    for (const g of empGoals) {
      const latest = (g.check_ins ?? []).sort((a: any, b: any) =>
        b.quarter.localeCompare(a.quarter)
      )[0];
      if (latest) {
        sNum += computeScore(g.uom_type, Number(g.target), Number(latest.actual_achievement)) * Number(g.weightage);
        sW += Number(g.weightage);
      }
    }
    const score = sW ? sNum / sW : null;
    const managerName = (profiles as any[]).find((p) => p.id === emp.manager_id)?.name ?? "—";
    return { ...emp, status, totalW, score, goalCount: empGoals.length, managerName };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7" /> Org Overview
        </h1>
        {cycle && (
          <Badge variant="secondary" className="mt-1">
            Active cycle: {(cycle as any).phase} · {(cycle as any).year}
          </Badge>
        )}
        {!cycle && (
          <Badge variant="destructive" className="mt-1">
            No active cycle — <Link to="/admin/cycles" className="ml-1 underline">configure one</Link>
          </Badge>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={<Users className="h-5 w-5" />} label="Employees" value={String(employees.length)} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Managers" value={String(managers.length)} />
        <StatCard icon={<Target className="h-5 w-5" />} label="Total Goals" value={String((goals as any[]).length)} hint={`${draft} draft · ${submitted} pending · ${approved} approved`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Org Score" value={orgScore != null ? `${orgScore.toFixed(1)}%` : "—"} />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          label="Open Escalations"
          value={String((openEscalations as any[]).length)}
          href="/admin/escalations"
          urgent={(openEscalations as any[]).length > 0}
        />
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link to="/admin/users"><Button size="sm" variant="secondary">Manage Users & Roles</Button></Link>
        <Link to="/admin/cycles"><Button size="sm" variant="secondary">Manage Cycles</Button></Link>
        <Link to="/admin/analytics"><Button size="sm" variant="secondary">Analytics</Button></Link>
        <Link to="/admin/audit"><Button size="sm" variant="secondary">Audit Trail</Button></Link>
        <Link to="/admin/escalations"><Button size="sm" variant="outline">Run Escalation Check</Button></Link>
      </div>

      {/* Employee table */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base">Employee Goal Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr className="text-left">
                <th className="p-3">Employee</th>
                <th className="p-3">Manager</th>
                <th className="p-3">Goals</th>
                <th className="p-3">Weightage</th>
                <th className="p-3">Status</th>
                <th className="p-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {employeeStatus.map((emp: any) => (
                <tr key={emp.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-xs text-muted-foreground">{emp.email}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{emp.managerName}</td>
                  <td className="p-3">{emp.goalCount}</td>
                  <td className="p-3">
                    <span className={emp.totalW === 100 ? "text-success font-medium" : emp.totalW > 0 ? "text-warning" : "text-muted-foreground"}>
                      {emp.totalW}%
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        emp.status === "APPROVED" ? "default" :
                        emp.status === "SUBMITTED" ? "secondary" :
                        emp.status === "DRAFT" ? "outline" : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {emp.status === "NONE" ? "No Goals" : emp.status}
                    </Badge>
                  </td>
                  <td className="p-3"><ScorePill score={emp.score} /></td>
                </tr>
              ))}
              {!employees.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No employees yet. <Link to="/admin/users" className="underline">Add users and assign roles.</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon, label, value, hint, href, urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  urgent?: boolean;
}) {
  const inner = (
    <Card className={`border-0 shadow-card ${urgent ? "border border-destructive/40" : ""}`}>
      <CardContent className="p-5 flex items-start gap-3">
        <div className={`mt-0.5 ${urgent ? "text-destructive" : "text-muted-foreground"}`}>{icon}</div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-bold">{value}</div>
          {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

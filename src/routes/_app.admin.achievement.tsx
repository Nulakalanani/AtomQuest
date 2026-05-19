import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/exportHelper";
import { ScorePill } from "@/components/ScorePill";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export function AchievementReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["achievement-report"],
    queryFn: async () => {
      const [pRes, rRes, gRes, cRes] = await Promise.all([
        supabase.from("profiles").select("id, name, manager_id"),
        supabase.from("user_roles").select("user_id, role").eq("role", "employee"),
        supabase.from("goals").select("*").eq("status", "APPROVED"),
        supabase.from("check_ins").select("*"),
      ]);
      return {
        profiles: pRes.data ?? [],
        roles: rRes.data ?? [],
        goals: gRes.data ?? [],
        checkIns: cRes.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;

  const profileMap: Record<string, string> = Object.fromEntries(
    data.profiles.map((p: any) => [p.id, p.name])
  );
  const employeeIds = new Set(data.roles.map((r: any) => r.user_id));

  // Build flat rows: one per goal × quarter
  const rows: any[] = [];
  for (const goal of data.goals as any[]) {
    if (!employeeIds.has(goal.employee_id)) continue;
    const employeeName = profileMap[goal.employee_id] ?? "—";
    const managerProfile = data.profiles.find((p: any) => p.id === goal.employee_id) as any;
    const managerName = managerProfile?.manager_id ? (profileMap[managerProfile.manager_id] ?? "—") : "—";
    const plannedPerQ = Number(goal.target) / 4;

    for (const q of QUARTERS) {
      const ci = data.checkIns.find((c: any) => c.goal_id === goal.id && c.quarter === q);
      rows.push({
        employeeName,
        managerName,
        goalTitle: goal.title,
        thrustArea: goal.thrust_area,
        uomType: goal.uom_type,
        annualTarget: goal.target,
        quarter: q,
        plannedTarget: plannedPerQ,
        actualAchievement: ci ? ci.actual_achievement : null,
        computedScore: ci ? ci.computed_score : null,
        progressStatus: ci ? ci.progress_status : "NOT_STARTED",
      });
    }
  }

  const handleCSV = () => {
    exportToCSV(
      `achievement-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        "Employee Name": r.employeeName,
        "Manager Name": r.managerName,
        "Goal Title": r.goalTitle,
        "Thrust Area": r.thrustArea,
        "UoM Type": r.uomType,
        "Annual Target": r.annualTarget,
        Quarter: r.quarter,
        "Planned Target": r.plannedTarget,
        "Actual Achievement": r.actualAchievement ?? "—",
        "Computed Score": r.computedScore ?? "—",
        "Progress Status": r.progressStatus,
      }))
    );
  };

  const handleExcel = () => {
    exportToExcel(
      `achievement-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [{
        name: "Achievement Report",
        rows: rows.map((r) => ({
          "Employee Name": r.employeeName,
          "Manager Name": r.managerName,
          "Goal Title": r.goalTitle,
          "Thrust Area": r.thrustArea,
          "UoM Type": r.uomType,
          "Annual Target": r.annualTarget,
          Quarter: r.quarter,
          "Planned Target": r.plannedTarget,
          "Actual Achievement": r.actualAchievement ?? "—",
          "Computed Score": r.computedScore ?? "—",
          "Progress Status": r.progressStatus,
        })),
      }]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-7 w-7" /> Achievement Report
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCSV}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={handleExcel}>
            <Download className="mr-1 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Goal × Quarter Achievement ({rows.length} rows)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Goal Title</TableHead>
                <TableHead>Thrust Area</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Annual Target</TableHead>
                <TableHead className="text-center">Quarter</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium whitespace-nowrap">{r.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{r.managerName}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={r.goalTitle}>{r.goalTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{r.thrustArea}</TableCell>
                  <TableCell><Badge variant="outline">{r.uomType}</Badge></TableCell>
                  <TableCell className="text-right">{r.annualTarget}</TableCell>
                  <TableCell className="text-center font-medium">{r.quarter}</TableCell>
                  <TableCell className="text-right">{r.plannedTarget}</TableCell>
                  <TableCell className="text-right">
                    {r.actualAchievement !== null ? r.actualAchievement : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.computedScore !== null ? <ScorePill score={r.computedScore} /> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.progressStatus === "COMPLETED" ? "default" :
                        r.progressStatus === "ON_TRACK" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {r.progressStatus.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No approved goals found. Goals must be approved before they appear here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

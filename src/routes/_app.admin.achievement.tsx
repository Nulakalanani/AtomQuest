import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScorePill } from "@/components/ScorePill";
import { computeScore } from "@/lib/scoreEngine";
import { exportToCSV, exportToExcel } from "@/lib/exportHelper";
import { Download, FileSpreadsheet, Search, BarChart2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
type Quarter = (typeof QUARTERS)[number];

function plannedFor(goal: any, q: Quarter): number {
  const map: Record<Quarter, string> = {
    Q1: "planned_q1",
    Q2: "planned_q2",
    Q3: "planned_q3",
    Q4: "planned_q4",
  };
  const v = goal[map[q]];
  return v != null ? Number(v) : Number(goal.target) / 4;
}

export function AchievementReport() {
  const [search, setSearch] = useState("");
  const [filterQ, setFilterQ] = useState<Quarter | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["achievement-report"],
    queryFn: async () => {
      const [profilesRes, rolesRes, goalsRes, cисRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email, manager_id").order("name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("goals").select("*").order("created_at"),
        supabase.from("check_ins").select("*"),
      ]);
      return {
        profiles: profilesRes.data ?? [],
        roles: rolesRes.data ?? [],
        goals: goalsRes.data ?? [],
        checkIns: cисRes.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <BarChart2 className="h-7 w-7" /> Achievement Report
        </h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const employeeIds = new Set(
    data.roles.filter((r: any) => r.role === "employee").map((r: any) => r.user_id)
  );
  const profileMap: Record<string, any> = Object.fromEntries(
    data.profiles.map((p: any) => [p.id, p])
  );

  // Build flat rows: one row per goal per quarter that has a check-in, plus rows for goals with no check-in
  const rows: any[] = [];

  for (const goal of data.goals as any[]) {
    if (!employeeIds.has(goal.employee_id)) continue;
    const emp = profileMap[goal.employee_id];
    if (!emp) continue;
    const mgr = goal.manager_id
      ? profileMap[goal.manager_id]?.name
      : profileMap[emp.manager_id]?.name ?? "—";

    const quarters: Quarter[] =
      filterQ === "ALL" ? [...QUARTERS] : [filterQ];

    for (const q of quarters) {
      const ci = (data.checkIns as any[]).find(
        (c) => c.goal_id === goal.id && c.quarter === q
      );
      const planned = plannedFor(goal, q);
      const actual = ci ? Number(ci.actual_achievement) : null;
      const score =
        actual !== null
          ? computeScore(goal.uom_type, Number(goal.target), actual)
          : null;
      const progressStatus = ci?.progress_status ?? "—";

      if (filterStatus !== "ALL" && progressStatus !== filterStatus) continue;

      rows.push({
        employeeName: emp.name,
        employeeEmail: emp.email,
        manager: mgr,
        goalTitle: goal.title,
        thrustArea: goal.thrust_area,
        uomType: goal.uom_type,
        annualTarget: Number(goal.target),
        weightage: Number(goal.weightage),
        goalStatus: goal.status,
        isShared: goal.is_shared,
        quarter: q,
        plannedTarget: planned,
        actualAchievement: actual,
        progressStatus,
        score,
        managerComment: ci?.manager_comment ?? "—",
      });
    }
  }

  // Filter by search
  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.goalTitle?.toLowerCase().includes(q) ||
      r.thrustArea?.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalGoals = new Set(
    filtered.map((r) => `${r.employeeEmail}-${r.goalTitle}`)
  ).size;
  const withActual = filtered.filter((r) => r.actualAchievement !== null);
  const avgScore =
    withActual.length
      ? Math.round(
          (withActual.reduce((s, r) => s + (r.score ?? 0), 0) / withActual.length) * 10
        ) / 10
      : null;
  const completedCount = filtered.filter((r) => r.progressStatus === "COMPLETED").length;

  const handleExportCSV = () => {
    exportToCSV(
      `achievement-report-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((r) => ({
        Employee: r.employeeName,
        Email: r.employeeEmail,
        Manager: r.manager,
        "Goal Title": r.goalTitle,
        "Thrust Area": r.thrustArea,
        UoM: r.uomType,
        "Annual Target": r.annualTarget,
        "Weightage (%)": r.weightage,
        "Goal Status": r.goalStatus,
        "Shared Goal": r.isShared ? "Yes" : "No",
        Quarter: r.quarter,
        "Planned Target": r.plannedTarget.toFixed(2),
        "Actual Achievement": r.actualAchievement ?? "—",
        "Progress Status": r.progressStatus,
        "Score (%)": r.score ?? "—",
        "Manager Comment": r.managerComment,
      }))
    );
  };

  const handleExportExcel = () => {
    exportToExcel(
      `achievement-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        {
          name: "Achievement Report",
          rows: filtered.map((r) => ({
            Employee: r.employeeName,
            Email: r.employeeEmail,
            Manager: r.manager,
            "Goal Title": r.goalTitle,
            "Thrust Area": r.thrustArea,
            UoM: r.uomType,
            "Annual Target": r.annualTarget,
            "Weightage (%)": r.weightage,
            "Goal Status": r.goalStatus,
            "Shared Goal": r.isShared ? "Yes" : "No",
            Quarter: r.quarter,
            "Planned Target": r.plannedTarget,
            "Actual Achievement": r.actualAchievement ?? "",
            "Progress Status": r.progressStatus,
            "Score (%)": r.score ?? "",
            "Manager Comment": r.managerComment,
          })),
        },
      ]
    );
  };

  const STATUS_COLOR: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-800",
    ON_TRACK: "bg-blue-100 text-blue-800",
    NOT_STARTED: "bg-gray-100 text-gray-700",
    "—": "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <BarChart2 className="h-7 w-7" /> Achievement Report
          </h1>
          <p className="text-muted-foreground">
            Planned Target vs. Actual Achievement — all employees, all quarters
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Unique Goals", value: totalGoals },
          { label: "Check-ins Logged", value: withActual.length },
          { label: "Avg Score (%)", value: avgScore ?? "—" },
          { label: "Completed", value: completedCount },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-lg bg-muted p-4"
          >
            <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
            <div className="text-2xl font-medium">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 w-56"
            placeholder="Search employee / goal…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterQ}
          onValueChange={(v) => setFilterQ(v as Quarter | "ALL")}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Quarters</SelectItem>
            {QUARTERS.map((q) => (
              <SelectItem key={q} value={q}>
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="ON_TRACK">On Track</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="—">No check-in yet</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} row(s)</span>
      </div>

      {/* Report Table */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base">
            Planned vs. Actual — Detail View
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr className="text-left">
                <th className="p-3">Employee</th>
                <th className="p-3">Manager</th>
                <th className="p-3">Goal</th>
                <th className="p-3">Thrust</th>
                <th className="p-3">UoM</th>
                <th className="p-3">Wt%</th>
                <th className="p-3">Q</th>
                <th className="p-3 text-right">Planned</th>
                <th className="p-3 text-right">Actual</th>
                <th className="p-3">Status</th>
                <th className="p-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={idx} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{r.employeeName}</div>
                    <div className="text-[10px] text-muted-foreground">{r.employeeEmail}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.manager}</td>
                  <td className="p-3 max-w-[180px]">
                    <div className="truncate font-medium">{r.goalTitle}</div>
                    {r.isShared && (
                      <Badge variant="secondary" className="text-[9px] mt-0.5">Shared</Badge>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.thrustArea}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">{r.uomType}</Badge>
                  </td>
                  <td className="p-3 text-xs font-medium">{r.weightage}%</td>
                  <td className="p-3">
                    <Badge className="text-[10px]">{r.quarter}</Badge>
                  </td>
                  <td className="p-3 text-right font-medium">
                    {r.plannedTarget.toFixed(1)}
                  </td>
                  <td className="p-3 text-right">
                    {r.actualAchievement !== null ? (
                      <span
                        className={
                          r.actualAchievement >= r.plannedTarget
                            ? "text-green-700 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      >
                        {r.actualAchievement}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        STATUS_COLOR[r.progressStatus] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.progressStatus === "NOT_STARTED"
                        ? "Not Started"
                        : r.progressStatus === "ON_TRACK"
                        ? "On Track"
                        : r.progressStatus === "COMPLETED"
                        ? "Completed"
                        : r.progressStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.score !== null ? <ScorePill score={r.score} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={11}
                    className="p-10 text-center text-muted-foreground"
                  >
                    {search || filterQ !== "ALL" || filterStatus !== "ALL"
                      ? "No rows match the current filters."
                      : "No achievement data yet. Employees need to submit check-ins first."}
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

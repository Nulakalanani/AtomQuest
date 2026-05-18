import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeScore } from "@/lib/scoreEngine";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";


const COLORS = ["var(--color-primary)", "var(--color-accent)", "var(--color-success)", "var(--color-destructive)", "var(--color-chart-5)"];

export function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [g, c, p] = await Promise.all([
        supabase.from("goals").select("*"),
        supabase.from("check_ins").select("*"),
        supabase.from("profiles").select("id, name, manager_id"),
      ]);
      return { goals: g.data ?? [], cis: c.data ?? [], profiles: p.data ?? [] };
    },
  });
  if (!data) return <p>Loading…</p>;

  // Quarter trend (avg score per quarter)
  const quarterTrend = ["Q1","Q2","Q3","Q4"].map((q) => {
    const cis = data.cis.filter((c: any) => c.quarter === q);
    const scores = cis.map((c: any) => {
      const g = data.goals.find((g: any) => g.id === c.goal_id);
      return g ? computeScore(g.uom_type, +g.target, +c.actual_achievement) : 0;
    });
    const avg = scores.length ? scores.reduce((s: number, n: number) => s+n, 0) / scores.length : 0;
    return { quarter: q, avg: Math.round(avg * 10) / 10 };
  });

  // Goal distribution by thrust area
  const byThrust = Object.entries(
    data.goals.reduce((acc: any, g: any) => { acc[g.thrust_area] = (acc[g.thrust_area] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // UoM distribution
  const byUom = Object.entries(
    data.goals.reduce((acc: any, g: any) => { acc[g.uom_type] = (acc[g.uom_type] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Manager effectiveness: % of (employee × quarter) cells with a check-in
  const managers = (data.profiles as any[]).filter((p) => (data.profiles as any[]).some((e) => e.manager_id === p.id));
  const goalIds = new Map<string, string>(); // goal_id -> employee_id
  (data.goals as any[]).forEach((g) => goalIds.set(g.id, g.employee_id));
  const managerEff = managers.map((m) => {
    const team = (data.profiles as any[]).filter((p) => p.manager_id === m.id);
    const totalCells = team.length * 4;
    if (!totalCells) return { name: m.name, pct: 0 };
    let filled = 0;
    for (const emp of team) {
      for (const q of ["Q1","Q2","Q3","Q4"]) {
        const has = (data.cis as any[]).some((c) => c.quarter === q && goalIds.get(c.goal_id) === emp.id);
        if (has) filled++;
      }
    }
    return { name: m.name, pct: Math.round((filled / totalCells) * 100) };
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle className="font-display text-base">Quarter-on-Quarter Avg Score</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer><LineChart data={quarterTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="quarter" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="avg" stroke="var(--color-primary)" strokeWidth={2} /></LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle className="font-display text-base">Goals by Thrust Area</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer><BarChart data={byThrust as any}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" /></BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle className="font-display text-base">UoM Distribution</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byUom as any} dataKey="value" nameKey="name" outerRadius={90} label>
                  {(byUom as any[]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle className="font-display text-base">Manager Effectiveness (Check-in %)</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={managerEff}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="pct" fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

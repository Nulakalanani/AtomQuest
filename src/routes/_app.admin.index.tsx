import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/exportHelper';
import { computeScore } from '@/lib/scoreEngine';
import { Download, Server } from 'lucide-react';

export function AdminOverview() {
  const { data } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const [profiles, goals, checkins, pending] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('goals').select('*, profiles!goals_employee_id_fkey(name, email)'),
        supabase.from('check_ins').select('*, goals(*, profiles!goals_employee_id_fkey(name))'),
        supabase.from('goals').select('id').eq('status', 'SUBMITTED'),
      ]);
      return {
        profiles: profiles.data ?? [], goals: goals.data ?? [],
        checkins: checkins.data ?? [], pending: pending.data ?? [],
      };
    },
  });

  if (!data) return <p>Loading…</p>;
  const totalEmp = data.profiles.length;
  const submittedEmp = new Set(data.goals.filter((g: any) => ['SUBMITTED','APPROVED','LOCKED'].includes(g.status)).map((g: any) => g.employee_id)).size;
  const approvedGoals = data.goals.filter((g: any) => g.status === 'APPROVED' || g.locked).length;
  const q1Done = new Set(data.checkins.filter((c: any) => c.quarter === 'Q1').map((c: any) => c.goal_id)).size;

  const exportReport = () => {
    const rows = data.goals.map((g: any) => {
      const cis = data.checkins.filter((c: any) => c.goal_id === g.id);
      const get = (q: string) => cis.find((c: any) => c.quarter === q)?.actual_achievement ?? '';
      const latest = cis.sort((a: any, b: any) => b.quarter.localeCompare(a.quarter))[0];
      const score = latest ? computeScore(g.uom_type, +g.target, +latest.actual_achievement) : '';
      return {
        Employee: g.profiles?.name ?? '', Email: g.profiles?.email ?? '',
        Goal: g.title, Thrust: g.thrust_area, UoM: g.uom_type, Target: g.target, Weight: g.weightage,
        Q1: get('Q1'), Q2: get('Q2'), Q3: get('Q3'), Q4: get('Q4'),
        Score: score, Status: g.status,
      };
    });
    exportToExcel(`AtomQuest_Achievement_${new Date().toISOString().slice(0,10)}.xlsx`, [{ name: 'Achievement Report', rows }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Org Overview</h1>
          <p className="text-muted-foreground">Real-time completion across the organization.</p>
        </div>
        <Button onClick={exportReport}><Download className="mr-1 h-4 w-4" /> Export Excel</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Employees" value={totalEmp} />
        <Stat label="Submitted goals" value={`${submittedEmp}/${totalEmp}`} pct={totalEmp ? submittedEmp/totalEmp : 0} />
        <Stat label="Approved goals" value={approvedGoals} />
        <Stat label="Pending approval" value={data.pending.length} highlight={data.pending.length > 0} />
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Completion funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <Funnel label="Goals submitted" v={submittedEmp} total={totalEmp} />
            <Funnel label="Goals approved" v={new Set(data.goals.filter((g:any) => g.status === 'APPROVED' || g.locked).map((g:any) => g.employee_id)).size} total={totalEmp} />
            <Funnel label="Q1 check-ins" v={q1Done} total={approvedGoals} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2"><Server className="h-4 w-4" /> Architecture & Cost</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Estimated monthly infra cost: <strong className="text-foreground">$0</strong> on free tier (edge-deployed).
          Auth, Postgres with RLS, server functions, and audit triggers all included.
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/cycles"><Button variant="outline" size="sm">Configure cycles</Button></Link>
        <Link to="/admin/thrust"><Button variant="outline" size="sm">Thrust areas</Button></Link>
        <Link to="/admin/audit"><Button variant="outline" size="sm">Audit trail</Button></Link>
        <Link to="/admin/analytics"><Button variant="outline" size="sm">Analytics</Button></Link>
        <Link to="/admin/achievement"><Button variant="outline" size="sm">Achievement Report</Button></Link>
        <Link to="/admin/goals"><Button variant="outline" size="sm">Manage Goals</Button></Link>
      </div>
    </div>
  );
}

function Stat({ label, value, pct, highlight }: any) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={`font-display text-2xl font-bold ${highlight ? 'text-accent' : ''}`}>{value}</div>
        {pct != null && <div className="mt-2 h-1.5 w-full rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${pct*100}%` }} /></div>}
      </CardContent>
    </Card>
  );
}

function Funnel({ label, v, total }: { label: string; v: number; total: number }) {
  const pct = total ? v/total : 0;
  return (
    <div>
      <div className="flex justify-between text-xs"><span>{label}</span><span>{v}/{total} ({Math.round(pct*100)}%)</span></div>
      <div className="mt-1 h-2 w-full rounded bg-muted"><div className="h-full rounded" style={{ width: `${pct*100}%`, background: 'var(--gradient-primary)' }} /></div>
    </div>
  );
}

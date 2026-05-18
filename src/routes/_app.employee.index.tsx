import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScorePill } from '@/components/ScorePill';
import { computeScore } from '@/lib/scoreEngine';
import { FileEdit, ClipboardCheck, Target } from 'lucide-react';

export function EmployeeDashboard() {
  const { user, profile } = useAuth();
  const { data: goals = [] } = useQuery({
    queryKey: ['my-goals', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('goals').select('*, check_ins(*)').eq('employee_id', user!.id).order('created_at');
      return data ?? [];
    },
  });
  const { data: cycle } = useQuery({
    queryKey: ['active-cycle'],
    queryFn: async () => {
      const { data } = await supabase.from('cycles').select('*').eq('is_active', true).maybeSingle();
      return data;
    },
  });

  const totalWeight = goals.reduce((s, g: any) => s + Number(g.weightage), 0);
  const status = (goals[0] as any)?.status ?? 'DRAFT';
  const overallScore = (() => {
    let acc = 0, w = 0;
    for (const g of goals as any[]) {
      const latest = (g.check_ins ?? []).sort((a: any, b: any) => b.quarter.localeCompare(a.quarter))[0];
      if (latest) {
        const sc = computeScore(g.uom_type, Number(g.target), Number(latest.actual_achievement));
        acc += sc * Number(g.weightage); w += Number(g.weightage);
      }
    }
    return w ? acc / w : null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Hi, {profile?.name?.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground">Here's your goal performance at a glance.</p>
        </div>
        {cycle && (
          <Badge variant="secondary" className="text-xs">
            Active cycle: <span className="ml-1 font-semibold">{(cycle as any).phase} · {(cycle as any).year}</span>
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Goals" value={String(goals.length)} hint={`${totalWeight}% weightage`} />
        <StatCard label="Status" value={status} />
        <StatCard label="Overall Score" value={overallScore == null ? '—' : `${overallScore.toFixed(1)}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="font-display text-lg flex items-center gap-2"><FileEdit className="h-5 w-5" /> Goal Sheet</CardTitle><Link to="/employee/goals"><Button size="sm">{goals.length ? 'View' : 'Create'}</Button></Link></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Build up to 8 goals with strict weightage rules. Submit for manager approval.</CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="font-display text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Quarterly Check-in</CardTitle><Link to="/employee/checkin"><Button size="sm" variant="secondary">Open</Button></Link></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Log actual achievement per quarter. Scores are computed automatically.</CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Target className="h-5 w-5" /> Your Goals</CardTitle></CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <p className="text-muted-foreground">No goals yet.</p>
              <Link to="/employee/goals"><Button className="mt-3">Start your goal sheet</Button></Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground"><tr className="text-left">
                  <th className="pb-2">Title</th><th>Thrust</th><th>UoM</th><th>Target</th><th>Weight</th><th>Latest Score</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {(goals as any[]).map((g) => {
                    const latest = (g.check_ins ?? []).sort((a: any, b: any) => b.quarter.localeCompare(a.quarter))[0];
                    const sc = latest ? computeScore(g.uom_type, Number(g.target), Number(latest.actual_achievement)) : null;
                    return (
                      <tr key={g.id} className="border-t">
                        <td className="py-2 font-medium">{g.title}</td>
                        <td className="text-muted-foreground">{g.thrust_area}</td>
                        <td><Badge variant="outline" className="text-[10px]">{g.uom_type}</Badge></td>
                        <td>{g.target}</td>
                        <td>{g.weightage}%</td>
                        <td><ScorePill score={sc} /></td>
                        <td><Badge variant={g.status === 'APPROVED' ? 'default' : 'secondary'} className="text-[10px]">{g.status}{g.locked ? ' 🔒' : ''}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-bold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

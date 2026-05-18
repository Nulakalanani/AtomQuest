import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScorePill } from '@/components/ScorePill';
import { computeScore } from '@/lib/scoreEngine';

export function Team() {
  const { user } = useAuth();
  const { data: reports = [] } = useQuery({
    queryKey: ['reports', user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from('profiles').select('*, goals(*, check_ins(*))').eq('manager_id', user!.id)).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">My Team</h1>
        <p className="text-muted-foreground">{reports.length} direct report{reports.length === 1 ? '' : 's'}</p>
      </div>
      <div className="flex gap-2">
        <Link to="/manager/approvals"><Button size="sm">Pending Approvals</Button></Link>
        <Link to="/manager/checkins"><Button size="sm" variant="secondary">Check-ins</Button></Link>
      </div>
      <div className="grid gap-4">
        {(reports as any[]).map((r) => {
          const submitted = r.goals.filter((g: any) => g.status === 'SUBMITTED').length;
          const approved = r.goals.filter((g: any) => g.status === 'APPROVED' || g.locked).length;
          const totalW = r.goals.reduce((s: number, g: any) => s + Number(g.weightage), 0);
          let scoreSum = 0, w = 0;
          for (const g of r.goals) {
            const latest = (g.check_ins ?? []).sort((a:any,b:any) => b.quarter.localeCompare(a.quarter))[0];
            if (latest) { scoreSum += computeScore(g.uom_type, +g.target, +latest.actual_achievement) * +g.weightage; w += +g.weightage; }
          }
          const overall = w ? scoreSum / w : null;
          return (
            <Card key={r.id} className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base">{r.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </div>
                <ScorePill score={overall} />
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-3 text-sm">
                <Stat label="Goals" value={r.goals.length} />
                <Stat label="Weightage" value={`${totalW}%`} />
                <Stat label="Submitted" value={submitted} />
                <Stat label="Approved" value={approved} />
              </CardContent>
            </Card>
          );
        })}
        {!reports.length && <p className="text-sm text-muted-foreground">No reports assigned yet.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="font-display font-semibold">{value}</div></div>;
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Target, Sparkles, ShieldCheck, BarChart3 } from 'lucide-react';
import { seedDemoData } from '@/lib/seed.functions';

export function Landing() {
  const { session, effectiveRole, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('employee@atomquest.com');
  const [password, setPassword] = useState('password123');
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!loading && session && effectiveRole) {
      navigate(effectiveRole === 'admin' ? '/admin' : effectiveRole === 'manager' ? '/manager' : '/employee');
    }
  }, [session, effectiveRole, loading, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success('Welcome back');
  };

  const quickLogin = (em: string) => {
    setEmail(em);
    setPassword('password123');
    setTimeout(() =>
      supabase.auth.signInWithPassword({ email: em, password: 'password123' })
        .then(({ error }) => error ? toast.error(error.message + ' — demo users pre-created in DB') : toast.success('Signed in')), 0);
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const result = await seedDemoData();
      if (result.ok) {
        toast.success('Demo data ready — try any login button');
      } else {
        toast.info(result.message);
      }
    } catch (e: any) {
      toast.error(e.message || 'Seed check failed');
    } finally { setSeeding(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-subtle)' }}>
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">A</div>
          <div>
            <div className="font-display text-lg font-semibold leading-none">AtomQuest</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Goal Portal</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground hidden md:block">Enterprise-grade · Secure by design</div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8 md:grid-cols-2 md:py-16">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Production-grade demo
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
            Corporate goals,<br/>
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              from plan to score.
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Multi-step goal sheet wizard, manager approvals, quarterly check-ins, auto-computed scores,
            audit trail, analytics, and Excel export — all role-gated end-to-end.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            <Feature icon={Target} label="Weightage gauge" />
            <Feature icon={ShieldCheck} label="Audit trail" />
            <Feature icon={BarChart3} label="Live analytics" />
            <Feature icon={Sparkles} label="Excel export" />
          </div>
        </div>

        <Card className="border-0 shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display">Sign in</CardTitle>
            <CardDescription>Use a demo account or create your own.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} />
              <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
            </form>
            <div className="relative my-2 text-center">
              <span className="bg-card relative z-10 px-3 text-xs uppercase tracking-wider text-muted-foreground">demo accounts</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => quickLogin('employee@atomquest.com')}>Employee</Button>
              <Button variant="outline" size="sm" onClick={() => quickLogin('manager@atomquest.com')}>Manager</Button>
              <Button variant="outline" size="sm" onClick={() => quickLogin('admin@atomquest.com')}>Admin</Button>
            </div>
            <Button onClick={seed} disabled={seeding} variant="secondary" className="w-full">
              {seeding ? 'Checking…' : '🌱 Seed Demo Data (first run only)'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No account? <Link to="/signup" className="underline">Create one</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-card">
      <Icon className="h-4 w-4 text-primary" /> {label}
    </div>
  );
}

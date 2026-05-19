import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

// Pages
import { Landing } from '@/routes/index';
import { Signup } from '@/routes/signup';
import { EmployeeDashboard } from '@/routes/_app.employee.index';
import { GoalSheetWizard } from '@/routes/_app.employee.goals';
import { CheckIn } from '@/routes/_app.employee.checkin';
import { Team } from '@/routes/_app.manager.index';
import { Approvals } from '@/routes/_app.manager.approvals';
import { ManagerCheckIns } from '@/routes/_app.manager.checkins';
import { AdminOverview } from '@/routes/_app.admin.index';
import { Analytics } from '@/routes/_app.admin.analytics';
import { Audit } from '@/routes/_app.admin.audit';
import { Completion } from '@/routes/_app.admin.completion';
import { CyclesAdmin } from '@/routes/_app.admin.cycles';
import { Escalations } from '@/routes/_app.admin.escalations';
import { SharedGoals } from '@/routes/_app.admin.shared';
import { ThrustAdmin } from '@/routes/_app.admin.thrust';
import { AchievementReport } from '@/routes/_app.admin.achievement';
import { AdminGoals } from '@/routes/_app.admin.goals';

const queryClient = new QueryClient();

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { session, effectiveRole, loading } = useAuth();
  if (loading) return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
  if (!session) return <Navigate to="/" replace />;
  if (roles && effectiveRole && !roles.includes(effectiveRole)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const { session, loading, effectiveRole, refresh } = useAuth();
  const [healing, setHealing] = useState(false);

  if (loading) return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
  if (!session) return <Navigate to="/" replace />;

  if (!effectiveRole) {
    const selfHeal = async () => {
      setHealing(true);
      const { assignSelfEmployeeRole } = await import('@/lib/seed.functions');
      const result = await assignSelfEmployeeRole();
      if (result.ok) {
        await refresh();
        window.location.reload();
      } else {
        alert(result.message);
      }
      setHealing(false);
    };

    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="space-y-4">
          <h1 className="font-display text-xl">Setting up your account…</h1>
          <p className="text-sm text-muted-foreground">
            Your role hasn't been assigned yet.
          </p>
          <button
            onClick={selfHeal}
            disabled={healing}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {healing ? 'Assigning role…' : 'Activate my account'}
          </button>
          <p className="text-xs text-muted-foreground">
            Or ask an admin to assign your role in the Supabase dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <AppShell><Outlet /></AppShell>;
}

function DashboardRedirect() {
  const { effectiveRole } = useAuth();
  if (effectiveRole === 'admin') return <Navigate to="/admin" replace />;
  if (effectiveRole === 'manager') return <Navigate to="/manager" replace />;
  return <Navigate to="/employee" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              {/* Employee */}
              <Route path="/employee" element={<ProtectedRoute roles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/employee/goals" element={<ProtectedRoute roles={['employee']}><GoalSheetWizard /></ProtectedRoute>} />
              <Route path="/employee/checkin" element={<ProtectedRoute roles={['employee']}><CheckIn /></ProtectedRoute>} />
              {/* Manager */}
              <Route path="/manager" element={<ProtectedRoute roles={['manager']}><Team /></ProtectedRoute>} />
              <Route path="/manager/approvals" element={<ProtectedRoute roles={['manager']}><Approvals /></ProtectedRoute>} />
              <Route path="/manager/checkins" element={<ProtectedRoute roles={['manager']}><ManagerCheckIns /></ProtectedRoute>} />
              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminOverview /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><Analytics /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute roles={['admin']}><Audit /></ProtectedRoute>} />
              <Route path="/admin/completion" element={<ProtectedRoute roles={['admin']}><Completion /></ProtectedRoute>} />
              <Route path="/admin/cycles" element={<ProtectedRoute roles={['admin']}><CyclesAdmin /></ProtectedRoute>} />
              <Route path="/admin/escalations" element={<ProtectedRoute roles={['admin']}><Escalations /></ProtectedRoute>} />
              <Route path="/admin/shared" element={<ProtectedRoute roles={['admin']}><SharedGoals /></ProtectedRoute>} />
              <Route path="/admin/thrust" element={<ProtectedRoute roles={['admin']}><ThrustAdmin /></ProtectedRoute>} />
              <Route path="/admin/achievement" element={<ProtectedRoute roles={['admin']}><AchievementReport /></ProtectedRoute>} />
              <Route path="/admin/goals" element={<ProtectedRoute roles={['admin']}><AdminGoals /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

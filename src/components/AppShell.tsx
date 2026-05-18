import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileEdit, ClipboardCheck, Users, CheckSquare,
  Settings2, Building2, ScrollText, BarChart3, Target, LogOut,
  Share2, ListChecks, AlertTriangle,
} from 'lucide-react';
import { useAuth, type AppRole } from '@/lib/auth';
import { RoleSwitcher } from './RoleSwitcher';

const NAV: Record<AppRole, { to: string; label: string; icon: typeof Target }[]> = {
  employee: [
    { to: '/employee',           label: 'My Dashboard',       icon: LayoutDashboard },
    { to: '/employee/goals',     label: 'Goal Sheet',         icon: FileEdit },
    { to: '/employee/checkin',   label: 'Quarterly Check-in', icon: ClipboardCheck },
  ],
  manager: [
    { to: '/manager',            label: 'Team',               icon: Users },
    { to: '/manager/approvals',  label: 'Approvals',          icon: CheckSquare },
    { to: '/manager/checkins',   label: 'Check-ins',          icon: ClipboardCheck },
  ],
  admin: [
    { to: '/admin',              label: 'Org Overview',       icon: Building2 },
    { to: '/admin/cycles',       label: 'Cycles',             icon: Settings2 },
    { to: '/admin/thrust',       label: 'Thrust Areas',       icon: Target },
    { to: '/admin/shared',       label: 'Shared Goals',       icon: Share2 },
    { to: '/admin/completion',   label: 'Completion',         icon: ListChecks },
    { to: '/admin/escalations',  label: 'Escalations',        icon: AlertTriangle },
    { to: '/admin/audit',        label: 'Audit Trail',        icon: ScrollText },
    { to: '/admin/analytics',    label: 'Analytics',          icon: BarChart3 },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, effectiveRole, signOut } = useAuth();
  const location = useLocation();
  const items = effectiveRole ? NAV[effectiveRole] : [];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground font-display font-bold">
            A
          </div>
          <div>
            <div className="font-display font-semibold leading-none">AtomQuest</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Goal Portal</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((it) => {
            const active = location.pathname === it.to || location.pathname.startsWith(it.to + '/');
            return (
              <NavLink
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/40'
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-1 text-xs">
            <div className="font-medium truncate">{profile?.name}</div>
            <div className="text-sidebar-foreground/60 truncate">{profile?.email}</div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/40"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
          <div className="text-sm text-muted-foreground">
            <span className="capitalize">{effectiveRole}</span> workspace
          </div>
          <RoleSwitcher />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

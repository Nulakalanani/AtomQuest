import { useAuth, type AppRole } from '@/lib/auth';
import { Crown, Briefcase, User as UserIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const META: Record<AppRole, { label: string; icon: typeof Crown; color: string }> = {
  admin:    { label: 'Admin',    icon: Crown,      color: 'bg-accent text-accent-foreground' },
  manager:  { label: 'Manager',  icon: Briefcase,  color: 'bg-primary text-primary-foreground' },
  employee: { label: 'Employee', icon: UserIcon,   color: 'bg-success text-success-foreground' },
};

export function RoleSwitcher() {
  const { roles, effectiveRole, setEffectiveRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (roles.length <= 1) return null;

  const switchTo = (r: AppRole) => {
    setEffectiveRole(r);
    const target = r === 'admin' ? '/admin' : r === 'manager' ? '/manager' : '/employee';
    if (!location.pathname.startsWith(target)) navigate(target);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border bg-card p-1 text-xs shadow-card">
      <span className="px-2 text-muted-foreground">Demo:</span>
      {roles.map((r) => {
        const M = META[r];
        const active = effectiveRole === r;
        return (
          <button
            key={r}
            onClick={() => switchTo(r)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition ${active ? M.color : 'hover:bg-muted'}`}
          >
            <M.icon className="h-3 w-3" />
            {M.label}
          </button>
        );
      })}
    </div>
  );
}

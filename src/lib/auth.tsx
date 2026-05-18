import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "employee" | "manager" | "admin";

export interface Profile {
  id: string;
  name: string;
  email: string;
  manager_id: string | null;
  department: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  effectiveRole: AppRole | null;
  setEffectiveRole: (r: AppRole) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [effectiveRole, setEffectiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    const rs = (r ?? []).map((x: any) => x.role as AppRole);
    setRoles(rs);
    // Pick highest privilege as default
    const pref =
      (typeof window !== "undefined" && (localStorage.getItem("effectiveRole") as AppRole)) || null;
    const initial =
      pref && rs.includes(pref) ? pref :
      rs.includes("admin") ? "admin" :
      rs.includes("manager") ? "manager" :
      rs[0] ?? null;
    setEffectiveRoleState(initial);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null); setRoles([]); setEffectiveRoleState(null);
      }
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const setEffectiveRole = (r: AppRole) => {
    setEffectiveRoleState(r);
    if (typeof window !== "undefined") localStorage.setItem("effectiveRole", r);
  };

  return (
    <Ctx.Provider
      value={{
        session, user: session?.user ?? null, profile, roles, effectiveRole,
        setEffectiveRole, loading,
        signOut: async () => { await supabase.auth.signOut(); },
        refresh: async () => { if (session?.user) await loadProfile(session.user.id); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

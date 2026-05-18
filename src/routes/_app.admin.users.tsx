import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Search, ShieldCheck, UserCheck } from "lucide-react";
import type { AppRole } from "@/lib/auth";

const ROLES: AppRole[] = ["employee", "manager", "admin"];

const ROLE_COLOR: Record<AppRole, string> = {
  admin: "bg-accent/20 text-accent-foreground border-accent/30",
  manager: "bg-primary/10 text-primary border-primary/20",
  employee: "bg-success/20 text-success-foreground border-success/30",
};

export function UsersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const profiles = profilesRes.data ?? [];
      const roles = rolesRes.data ?? [];
      return profiles.map((p) => ({
        ...p,
        roles: roles
          .filter((r) => r.user_id === p.id)
          .map((r) => r.role as AppRole),
      }));
    },
  });

  const users = (data ?? []).filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    setBusy(`${userId}-${role}`);
    try {
      const { error } = await supabase.rpc("admin_set_user_role", {
        p_user_id: userId,
        p_role: role,
        p_add: !has,
      });
      if (error) throw error;
      toast.success(has ? `Removed ${role} role` : `Granted ${role} role`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const setManager = async (employeeId: string, managerId: string) => {
    setBusy(`manager-${employeeId}`);
    try {
      const { error } = await supabase.rpc("admin_set_manager", {
        p_employee_id: employeeId,
        p_manager_id: managerId === "_none" ? null : managerId,
      });
      if (error) throw error;
      toast.success("Manager updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const managers = (data ?? []).filter((u) => u.roles.includes("manager") || u.roles.includes("admin"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" /> Users & Roles
          </h1>
          <p className="text-muted-foreground">
            Assign roles and reporting lines for all users.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> {users.length} users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Roles</th>
                <th className="p-3">Reports to</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES.map((role) => {
                        const has = u.roles.includes(role);
                        const key = `${u.id}-${role}`;
                        return (
                          <button
                            key={role}
                            disabled={busy === key}
                            onClick={() => toggleRole(u.id, role, has)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition
                              ${has ? ROLE_COLOR[role] : "border-border text-muted-foreground opacity-40 hover:opacity-70"}
                              ${busy === key ? "cursor-wait opacity-50" : "cursor-pointer"}`}
                          >
                            {has ? <UserCheck className="h-3 w-3" /> : null}
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={u.manager_id ?? "_none"}
                      onValueChange={(v) => setManager(u.id, v)}
                      disabled={busy === `manager-${u.id}`}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="No manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">
                          <span className="text-muted-foreground">No manager</span>
                        </SelectItem>
                        {managers
                          .filter((m) => m.id !== u.id)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">How roles work</p>
          <p>Click a role badge to grant or revoke it. A user can hold multiple roles simultaneously — the RoleSwitcher in the top bar lets them switch views.</p>
          <p>Set "Reports to" so managers see the right employees in Approvals and Check-ins. A user without a manager assigned will not appear in any manager's team.</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 text-sm space-y-2">
          <p className="font-medium text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> SSO / Azure AD
          </p>
          <p className="text-muted-foreground">
            This portal supports Single Sign-On via Supabase's built-in SAML 2.0 / OIDC provider.
            To enable Azure AD login: in the Supabase Dashboard → Authentication → Providers,
            enable "Azure" and paste your Azure AD Tenant ID and Client ID.
            All existing role assignments carry over — Azure AD users are matched by email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

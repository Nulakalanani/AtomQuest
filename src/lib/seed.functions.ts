import { supabase } from '@/integrations/supabase/client';

export async function seedDemoData(): Promise<{ ok: boolean; message: string }> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email')
    .in('email', ['employee@atomquest.com', 'manager@atomquest.com', 'admin@atomquest.com']);

  if (profiles && profiles.length >= 3) {
    return { ok: true, message: 'Demo data already exists! Login with any demo account.' };
  }

  return {
    ok: false,
    message: 'Demo users need to be seeded via the Supabase admin panel or were pre-created in the database.',
  };
}

/**
 * Safety net: if the current authenticated user has no role assigned,
 * assign them the 'employee' role. Call this from the "no role" screen.
 */
export async function assignSelfEmployeeRole(): Promise<{ ok: boolean; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not logged in' };

  const { data: existingRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (existingRoles && existingRoles.length > 0) {
    return { ok: true, message: 'Role already assigned' };
  }

  const { error } = await supabase.from('user_roles').insert({
    user_id: user.id,
    role: 'employee',
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Employee role assigned. Please refresh.' };
}

import { supabase } from '@/integrations/supabase/client';

// Client-side seed: creates users via auth.signUp (not admin API)
// For the hackathon, demo users are already in DB so this just confirms readiness
export async function seedDemoData(): Promise<{ ok: boolean; message: string }> {
  // Check if demo data exists
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

-- ============================================================
-- ATOMQUEST DEMO SEED — run AFTER all migrations
-- Creates 3 demo accounts for judge walkthrough
-- ============================================================
-- NOTE: Run this in Supabase SQL Editor.
-- Passwords are set to "Demo@1234" for all accounts.
-- You will need to create the auth users via the Supabase
-- Authentication dashboard, or use the signup flow, then
-- run the role-assignment block below.
-- ============================================================

-- STEP 1 — After creating auth users (admin@demo.com,
--           manager@demo.com, employee@demo.com with password
--           Demo@1234), run this to grant roles:

-- Find user IDs first:
-- SELECT id, email FROM auth.users WHERE email IN (
--   'admin@demo.com', 'manager@demo.com', 'employee@demo.com'
-- );

-- Then update profiles (the trigger creates them on signup):
-- UPDATE public.profiles SET name = 'Admin User'    WHERE email = 'admin@demo.com';
-- UPDATE public.profiles SET name = 'Priya Manager' WHERE email = 'manager@demo.com';
-- UPDATE public.profiles SET name = 'Rahul Employee' WHERE email = 'employee@demo.com';

-- Grant roles:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin'    FROM auth.users WHERE email = 'admin@demo.com'
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'manager'  FROM auth.users WHERE email = 'manager@demo.com'
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'employee' FROM auth.users WHERE email = 'employee@demo.com'
-- ON CONFLICT DO NOTHING;

-- Set manager relationship:
-- UPDATE public.profiles
-- SET manager_id = (SELECT id FROM auth.users WHERE email = 'manager@demo.com')
-- WHERE email = 'employee@demo.com';

-- STEP 2 — Seed a goal-setting cycle (2026) and make it active:
INSERT INTO public.cycles (year, phase, opens_at, closes_at, is_active)
VALUES (
  2026,
  'GOAL_SETTING',
  '2026-01-01T00:00:00Z',
  '2026-03-31T23:59:59Z',
  true
) ON CONFLICT DO NOTHING;

-- STEP 3 — Seed thrust areas:
INSERT INTO public.thrust_areas (name, active)
VALUES
  ('Revenue Growth', true),
  ('Customer Experience', true),
  ('Operational Excellence', true),
  ('People & Culture', true),
  ('Innovation & Technology', true),
  ('Compliance & Risk', true)
ON CONFLICT (name) DO NOTHING;

-- STEP 4 — Verify everything looks correct:
SELECT
  p.name,
  p.email,
  string_agg(ur.role, ', ') AS roles,
  pm.name AS manager
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.profiles pm ON pm.id = p.manager_id
GROUP BY p.id, pm.name
ORDER BY p.name;

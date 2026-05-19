-- Allow a user to insert their own profile row during signup.
-- This is safe: auth.uid() = id ensures they can only insert for themselves.
CREATE POLICY "profiles_self_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow a user to read their own profile.
-- (Add only if a SELECT policy doesn't already exist for self-read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_self_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "profiles_self_read"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (id = auth.uid())
    $policy$;
  END IF;
END
$$;

-- Allow a user to insert their own role row during signup.
CREATE POLICY "user_roles_self_insert"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

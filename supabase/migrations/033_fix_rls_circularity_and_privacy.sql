-- Migration 033: Fix RLS Circularity and Privacy
-- Re-applying the fix that prevents profiles table from being recursive during role checks.

BEGIN;

-- 1. Use JWT metadata directly in functions to avoid table lookups
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'
         OR (auth.jwt() ->> 'email') = 'admin@passos.com';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop and recreation of profile policies to use these non-recursive functions
DROP POLICY IF EXISTS "profiles_select_authenticated_v3" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_authenticated_v3" ON public.profiles;

CREATE POLICY "profiles_select_v4" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  is_superadmin() = true
  OR 
  (current_user_role() IN ('admin', 'warden') AND role != 'superadmin')
  OR 
  id = auth.uid()
  OR 
  current_user_role() IS NULL
);

CREATE POLICY "profiles_update_v4"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  (current_user_role() IN ('admin', 'warden') AND role != 'superadmin')
);

COMMIT;

-- ============================================================
-- PassOS Migration: Robust Superadmin RLS
-- Ensures Superadmins can always see all data even if metadata is stale.
-- ============================================================

BEGIN;

-- 1. Create a truly robust superadmin check function
-- This uses SECURITY DEFINER to avoid recursion on the profiles table
CREATE OR REPLACE FUNCTION public.check_is_superadmin_robust()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- First try the fast JWT metadata path
    IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin' THEN
        RETURN TRUE;
    END IF;

    -- Fallback: Check the database directly (Safe inside SECURITY DEFINER)
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Update the profiles select policy to use the robust check
DROP POLICY IF EXISTS "profiles_select_authenticated_v3" ON public.profiles;

CREATE POLICY "profiles_select_robust_v1" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  public.check_is_superadmin_robust() = true
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'warden') AND role != 'superadmin')
  OR 
  id = auth.uid()
);

-- 3. Also fix the 'tenants' table RLS for superadmins
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_superadmin_select" ON public.tenants;
CREATE POLICY "tenants_superadmin_select" 
ON public.tenants FOR SELECT 
TO authenticated 
USING (public.check_is_superadmin_robust() = true OR status = 'active');

COMMIT;

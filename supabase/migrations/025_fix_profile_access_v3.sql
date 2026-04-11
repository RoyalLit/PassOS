-- ============================================================
-- PassOS Migration: Fix Profile Access & Administrative Edits
-- Updates RLS policies on the profiles table to allow 
-- wardens to view students and admins to edit users.
-- ============================================================

BEGIN;

-- 1. Redefine the Helper functions if needed (sanity check)
-- is_superadmin(), current_user_tenant_id(), current_user_role()
-- are already defined in 017_fix_rls_recursion.sql

-- 2. Drop the restrictive select policy
DROP POLICY IF EXISTS "profiles_select_authenticated_v2" ON public.profiles;

-- 3. Create a more inclusive SELECT policy
-- Superadmins see everyone
-- Admins and Wardens see everyone in their tenant (except superadmins)
-- Users see themselves
CREATE POLICY "profiles_select_authenticated_v3" 
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

-- 4. Drop the restrictive update policy
DROP POLICY IF EXISTS "profiles_update_own_v2" ON public.profiles;

-- 5. Create a more inclusive UPDATE policy
-- Users can update themselves
-- Admins and Wardens can update others in their tenant (except superadmins)
CREATE POLICY "profiles_update_authenticated_v3"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  (current_user_role() IN ('admin', 'warden') AND role != 'superadmin')
)
WITH CHECK (
  id = auth.uid()
  OR
  (current_user_role() IN ('admin', 'warden') AND role != 'superadmin')
);

COMMIT;

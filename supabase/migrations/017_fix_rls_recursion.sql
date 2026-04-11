-- ============================================================
-- PassOS Migration 017: Fix RLS Recursion & Auth Hang
-- ============================================================
-- Problem: 
--   Functions like `is_superadmin()` and `current_user_tenant_id()`
--   query the `profiles` table. When these functions are used 
--   inside RLS policies for the `profiles` table itself, it 
--   creates an infinite recursion loop, causing hangs.
--
-- Solution:
--   1. Redefine helper functions to use JWT claims (no table lookup).
--   2. Explicitly drop all possible legacy policies on `profiles`.
--   3. Apply clean, non-recursive policies for the "Disabled Tenancy" state.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Redefine Helper Functions (Non-Recursive)
-- ============================================================

-- Fix: Get role from JWT metadata instead of a table query
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'
         OR (auth.jwt() ->> 'email') = 'admin@passos.com'; -- Failsafe for system admin
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix: Get tenant_id from JWT metadata if available
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. Cleanup Profiles Table Policies
-- ============================================================

-- Drop EVERY potential policy name used in previous migrations
DROP POLICY IF EXISTS "profiles_select_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;

-- ============================================================
-- 3. Apply New Non-Recursive Policies
-- ============================================================

-- Ensure RLS is on
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Superadmins see everyone, Admins see everyone except superadmins
CREATE POLICY "profiles_select_authenticated_v2" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  is_superadmin() = true
  OR 
  (current_user_role() = 'admin' AND role != 'superadmin')
  OR 
  id = auth.uid()
  OR 
  current_user_role() IS NULL
);

-- PROTECT: Only the user themselves can update their own profile
CREATE POLICY "profiles_update_own_v2" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PROTECT: Only the user can insert their own profile (trigger bypasses this anyway)
CREATE POLICY "profiles_insert_own_v2" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- SYSTEM: Service role (Admin SDK) bypass
CREATE POLICY "profiles_service_role_v2" 
ON public.profiles FOR ALL 
TO service_role 
USING (true);

-- ============================================================
-- 4. Fix student_states (Common hang point for dashboards)
-- ============================================================
DROP POLICY IF EXISTS "student_states_select_own_tenant" ON public.student_states;
DROP POLICY IF EXISTS "student_states_select_authenticated" ON public.student_states;
DROP POLICY IF EXISTS "student_states_update_authenticated" ON public.student_states;

ALTER TABLE public.student_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_states_select_authenticated_v2"
ON public.student_states FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "student_states_update_authenticated_v2"
ON public.student_states FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

COMMIT;

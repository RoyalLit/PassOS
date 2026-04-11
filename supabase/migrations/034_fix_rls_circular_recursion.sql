-- Fix RLS circular recursion by using auth.jwt() instead of querying profiles

BEGIN;

-- Drop all dependent policies first
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_authenticated_v3" ON public.profiles;
DROP POLICY IF EXISTS "pass_requests_select_admin" ON public.pass_requests;
DROP POLICY IF EXISTS "passes_select_admin" ON public.passes;
DROP POLICY IF EXISTS "student_states_select_admin" ON public.student_states;
DROP POLICY IF EXISTS "approvals_update_own_tenant" ON public.approvals;
DROP POLICY IF EXISTS "passes_update_own_tenant" ON public.passes;
DROP POLICY IF EXISTS "student_states_update_own_tenant" ON public.student_states;
DROP POLICY IF EXISTS "fraud_flags_update_own_tenant" ON public.fraud_flags;
DROP POLICY IF EXISTS "notifications_update_own_tenant" ON public.notifications;

-- Drop the problematic functions that cause circular recursion
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.current_user_role();

-- Create non-recursive is_superadmin using auth.jwt()
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'role') = 'superadmin'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create non-recursive current_user_role using auth.jwt()
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create a simple current_user_id function for consistency
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate profiles_select_admin policy
CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden') AND role != 'superadmin')
  OR id = auth.uid()
);

-- Recreate profiles_update policy
CREATE POLICY "profiles_update_authenticated_v3" ON public.profiles
FOR UPDATE USING (
  id = auth.uid()
  OR (current_user_role() IN ('admin', 'warden') AND role != 'superadmin')
);

-- Recreate pass_requests_select_admin policy
CREATE POLICY "pass_requests_select_admin" ON public.pass_requests
FOR SELECT USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden'))
  OR student_id = auth.uid()
);

-- Recreate passes_select_admin policy
CREATE POLICY "passes_select_admin" ON public.passes
FOR SELECT USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden'))
  OR student_id = auth.uid()
);

-- Recreate student_states_select_admin policy
CREATE POLICY "student_states_select_admin" ON public.student_states
FOR SELECT USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden'))
  OR student_id = auth.uid()
);

-- Recreate update policies
CREATE POLICY "approvals_update_own_tenant" ON public.approvals
FOR UPDATE USING (
  is_superadmin() = true
  OR approver_id = auth.uid()
);

CREATE POLICY "passes_update_own_tenant" ON public.passes
FOR UPDATE USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden'))
);

CREATE POLICY "student_states_update_own_tenant" ON public.student_states
FOR UPDATE USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden'))
);

CREATE POLICY "fraud_flags_update_own_tenant" ON public.fraud_flags
FOR UPDATE USING (
  is_superadmin() = true
  OR (current_user_role() IN ('admin', 'warden'))
);

CREATE POLICY "notifications_update_own_tenant" ON public.notifications
FOR UPDATE USING (
  user_id = auth.uid()
);

COMMIT;

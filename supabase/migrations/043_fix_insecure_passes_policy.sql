-- Migration 043: Fix insecure passes SELECT policy
-- Migration 039 created "passes_select_allow_all" with USING (true) which allows ANY user to read ALL passes
-- This is a critical security vulnerability. Replace with secure tenant-scoped policies.

BEGIN;

-- Drop the insecure policy that allows all reads
DROP POLICY IF EXISTS "passes_select_allow_all" ON public.passes;

-- Ensure secure passes policy exists (from migration 040 or create if missing)
-- Policy: service_role bypasses RLS, superadmins see all, students see own, staff see tenant's
DROP POLICY IF EXISTS "passes_select_secure" ON public.passes;
CREATE POLICY "passes_select_secure" ON public.passes FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR student_id = auth.uid()
  OR tenant_id = public.current_user_tenant_id()
);

-- Apply tenant isolation to pass_scans table as well
DROP POLICY IF EXISTS "scans_select_secure" ON public.pass_scans;
CREATE POLICY "scans_select_secure" ON public.pass_scans FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

-- Apply tenant isolation to pass_requests table
DROP POLICY IF EXISTS "pass_requests_select_secure" ON public.pass_requests;
CREATE POLICY "pass_requests_select_secure" ON public.pass_requests FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR student_id = auth.uid()
  OR tenant_id = public.current_user_tenant_id()
);

-- Apply tenant isolation to student_states table
DROP POLICY IF EXISTS "student_states_select_secure" ON public.student_states;
CREATE POLICY "student_states_select_secure" ON public.student_states FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR student_id = auth.uid()
  OR tenant_id = public.current_user_tenant_id()
);

-- Apply tenant isolation to profiles table
DROP POLICY IF EXISTS "profiles_select_secure" ON public.profiles;
CREATE POLICY "profiles_select_secure" ON public.profiles FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR id = auth.uid()
  OR tenant_id = public.current_user_tenant_id()
);

COMMIT;

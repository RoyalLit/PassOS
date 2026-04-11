-- ============================================================
-- PassOS Migration 033: Fix RLS Circularity & Student Privacy
-- ============================================================
-- Resolves the circular reference loop in profiles/tenant_id lookups
-- and restores student-specific privacy for passes and requests.
-- ============================================================

BEGIN;

-- 1. PROFILES: Break the circular loop
-- Users must ALWAYS be able to see their own profile without a tenant check loop
DROP POLICY IF EXISTS "profiles_select_own_tenant" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    public.is_superadmin()
    OR (tenant_id = public.current_user_tenant_id() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('admin', 'warden', 'guard'))
  );

-- 2. PASS_REQUESTS: Restore Privacy
-- Students should ONLY see their own requests, even within the same tenant
DROP POLICY IF EXISTS "pass_requests_select_own_tenant" ON public.pass_requests;

CREATE POLICY "pass_requests_select_student" ON public.pass_requests
  FOR SELECT USING (
    student_id = auth.uid() 
    AND tenant_id = public.current_user_tenant_id()
  );

CREATE POLICY "pass_requests_select_admin" ON public.pass_requests
  FOR SELECT USING (
    public.is_superadmin()
    OR (tenant_id = public.current_user_tenant_id() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('admin', 'warden'))
  );

-- 3. PASSES: Restore Privacy
-- Students should ONLY see their own passes
DROP POLICY IF EXISTS "passes_select_own_tenant" ON public.passes;

CREATE POLICY "passes_select_student" ON public.passes
  FOR SELECT USING (
    student_id = auth.uid() 
    AND tenant_id = public.current_user_tenant_id()
  );

CREATE POLICY "passes_select_admin" ON public.passes
  FOR SELECT USING (
    public.is_superadmin()
    OR (tenant_id = public.current_user_tenant_id() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('admin', 'warden', 'guard'))
  );

-- 4. STUDENT_STATES: Restore Privacy
DROP POLICY IF EXISTS "student_states_select_own_tenant" ON public.student_states;

CREATE POLICY "student_states_select_student" ON public.student_states
  FOR SELECT USING (
    student_id = auth.uid() 
    AND tenant_id = public.current_user_tenant_id()
  );

CREATE POLICY "student_states_select_admin" ON public.student_states
  FOR SELECT USING (
    public.is_superadmin()
    OR (tenant_id = public.current_user_tenant_id() AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('admin', 'warden', 'guard'))
  );

COMMIT;

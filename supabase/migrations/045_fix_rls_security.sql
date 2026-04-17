-- ============================================================
-- PassOS Migration: Fix RLS Security Vulnerabilities
-- Addresses Supabase database-linter findings:
-- 1. RLS disabled on used_qr_nonces and rate_limits
-- 2. Insecure user_metadata references in RLS policies
--
-- SECURITY: This migration creates a helper function with SECURITY DEFINER
-- to safely check roles without triggering RLS recursion.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Create helper function to get current user's role from database
-- SECURITY DEFINER runs with owner's privileges, bypassing RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role_db()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if current user is superadmin from database
CREATE OR REPLACE FUNCTION public.is_superadmin_db()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role_db() = 'superadmin'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to get current user's tenant_id from database
CREATE OR REPLACE FUNCTION public.current_user_tenant_id_db()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. Enable RLS on used_qr_nonces table
-- ============================================================
ALTER TABLE public.used_qr_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "used_qr_nonces_service_role_select" ON public.used_qr_nonces;
CREATE POLICY "used_qr_nonces_service_role_select" ON public.used_qr_nonces
FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "used_qr_nonces_service_role_insert" ON public.used_qr_nonces;
CREATE POLICY "used_qr_nonces_service_role_insert" ON public.used_qr_nonces
FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- 3. Enable RLS on rate_limits table
-- ============================================================
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_service_role_select" ON public.rate_limits;
CREATE POLICY "rate_limits_service_role_select" ON public.rate_limits
FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "rate_limits_service_role_insert" ON public.rate_limits;
CREATE POLICY "rate_limits_service_role_insert" ON public.rate_limits
FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "rate_limits_service_role_update" ON public.rate_limits;
CREATE POLICY "rate_limits_service_role_update" ON public.rate_limits
FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Fix profiles RLS - Use database role, NOT user_metadata
-- Drop old insecure policies first
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_robust_v1" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_secure" ON public.profiles;

CREATE POLICY "profiles_select_secure" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  -- Service role bypass
  auth.role() = 'service_role'
  -- Superadmins can see all profiles (checked from DB)
  OR public.is_superadmin_db() = true
  -- Tenant staff see profiles within their tenant
  OR (public.current_user_role_db() IN ('admin', 'warden') AND 
      public.current_user_tenant_id_db() = public.profiles.tenant_id)
  -- Users can see their own profile
  OR id = auth.uid()
);

-- ============================================================
-- 5. Fix passes RLS - Use database role
-- ============================================================
DROP POLICY IF EXISTS "passes_select_v2" ON public.passes;
DROP POLICY IF EXISTS "passes_select_admin" ON public.passes;
DROP POLICY IF EXISTS "passes_select" ON public.passes;
DROP POLICY IF EXISTS "passes_select_secure" ON public.passes;

CREATE POLICY "passes_select_secure" ON public.passes FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin_db() = true
  OR student_id = auth.uid()
  OR tenant_id = public.current_user_tenant_id_db()
);

-- ============================================================
-- 6. Fix pass_requests RLS - Use database role
-- ============================================================
DROP POLICY IF EXISTS "pass_requests_select_v2" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_select_admin" ON public.pass_requests;
DROP POLICY IF EXISTS "requests_own" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_select_secure" ON public.pass_requests;

CREATE POLICY "pass_requests_select_secure" ON public.pass_requests FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin_db() = true
  OR student_id = auth.uid()
  OR tenant_id = public.current_user_tenant_id_db()
);

-- ============================================================
-- 7. Update other dependent policies to use database role
-- ============================================================
DROP POLICY IF EXISTS "student_states_select_admin" ON public.student_states;
CREATE POLICY "student_states_select_admin" ON public.student_states
FOR SELECT USING (
  public.is_superadmin_db() = true
  OR public.current_user_role_db() IN ('admin', 'warden')
  OR student_id = auth.uid()
);

DROP POLICY IF EXISTS "approvals_update_own_tenant" ON public.approvals;
CREATE POLICY "approvals_update_own_tenant" ON public.approvals
FOR UPDATE USING (
  public.is_superadmin_db() = true
  OR approver_id = auth.uid()
);

DROP POLICY IF EXISTS "passes_update_own_tenant" ON public.passes;
CREATE POLICY "passes_update_own_tenant" ON public.passes
FOR UPDATE USING (
  public.is_superadmin_db() = true
  OR public.current_user_role_db() IN ('admin', 'warden')
);

DROP POLICY IF EXISTS "student_states_update_own_tenant" ON public.student_states;
CREATE POLICY "student_states_update_own_tenant" ON public.student_states
FOR UPDATE USING (
  public.is_superadmin_db() = true
  OR public.current_user_role_db() IN ('admin', 'warden')
);

COMMIT;
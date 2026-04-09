-- ============================================================
-- PassOS Migration 011: Multi-Tenancy — Tenants & tenant_id
-- ============================================================
-- What this migration does:
--   1. Creates the `tenants` table (one row per university/organization)
--   2. Creates a special `__system__` tenant for superadmins
--   3. Creates a `default` tenant for all existing users (backfill)
--   4. Adds `tenant_id` FK to: profiles, pass_requests, passes,
--      pass_scans, student_states, fraud_flags, audit_logs, notifications
--   5. Migrates app_settings into each tenant's settings JSONB
--   6. Updates auth trigger to auto-assign tenant_id from email domain
--   7. Updates RLS policies to scope all reads/writes by tenant_id
--   8. Superadmins (role='superadmin') belong to __system__ and
--      bypass tenant scoping via a special RLS rule
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TENANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,  -- URL-safe, e.g. 'stanford'
  domains     TEXT[] DEFAULT '{}',   -- Email domains that map here, e.g. ['stanford.edu']
  logo_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'trial'
              CHECK (status IN ('active', 'inactive', 'trial', 'suspended')),
  plan        TEXT NOT NULL DEFAULT 'starter'
              CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings    JSONB DEFAULT '{}',
  -- migrated from app_settings:
  -- geofencing_enabled, campus_lat, campus_lng, campus_radius_meters,
  -- parent_approval_mode, gatepass_reasons
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

-- ============================================================
-- 2. BACKFILL: System tenant for superadmins + default tenant
-- ============================================================
INSERT INTO public.tenants (id, name, slug, domains, status, plan, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'System',
  '__system__',
  ARRAY['system.internal'],
  'active',
  'enterprise',
  '{}'
);

INSERT INTO public.tenants (id, name, slug, domains, status, plan, settings)
VALUES (
  gen_random_uuid(),
  'Default University',
  'default',
  ARRAY['default.local'],
  'active',
  'starter',
  jsonb_build_object(
    'geofencing_enabled', false,
    'campus_lat', 28.6139,
    'campus_lng', 77.2090,
    'campus_radius_meters', 500,
    'parent_approval_mode', 'smart',
    'gatepass_reasons', jsonb_build_object(
      'day_outing', ARRAY[
        'Personal work',
        'Medical appointment',
        'Family visit',
        'Shopping / errands',
        'Academic (exam, college work outside campus)'
      ]::text[],
      'overnight', ARRAY[
        'Home visit',
        'Family function/event',
        'Medical (extended)',
        'Tournament / competition'
      ]::text[]
    )
  )
);

-- ============================================================
-- 3. ADD tenant_id TO ALL EXISTING TABLES
-- ============================================================

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- pass_requests
ALTER TABLE public.pass_requests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- passes
ALTER TABLE public.passes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- pass_scans
ALTER TABLE public.pass_scans
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- student_states
ALTER TABLE public.student_states
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- fraud_flags
ALTER TABLE public.fraud_flags
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- ai_analysis (indirect via pass_requests)
ALTER TABLE public.ai_analysis
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- approvals (indirect via pass_requests)
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- ============================================================
-- 4. BACKFILL tenant_id FOR ALL EXISTING DATA
-- ============================================================

-- Get the default tenant ID
DO $$
DECLARE
  v_default_tenant_id UUID;
  v_system_tenant_id  UUID;
BEGIN
  SELECT id INTO v_default_tenant_id
  FROM public.tenants
  WHERE slug = 'default';

  SELECT id INTO v_system_tenant_id
  FROM public.tenants
  WHERE slug = '__system__';

  -- Backfill profiles: superadmins → __system__, everyone else → default
  UPDATE public.profiles
  SET tenant_id = CASE
    WHEN role = 'superadmin' THEN v_system_tenant_id
    ELSE v_default_tenant_id
  END
  WHERE tenant_id IS NULL;

  -- Backfill pass_requests → passes → student_states → fraud_flags → notifications
  -- All flow from profiles, so they all get default tenant
  UPDATE public.pass_requests SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.passes        SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.pass_scans    SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.student_states SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.fraud_flags   SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.audit_logs    SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.notifications  SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;

  -- ai_analysis and approvals via pass_requests
  UPDATE public.ai_analysis SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.approvals    SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;

  -- Make tenant_id NOT NULL now that everything is backfilled
  ALTER TABLE public.profiles        ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.pass_requests   ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.passes          ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.pass_scans     ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.student_states ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.fraud_flags    ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.audit_logs     ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.notifications   ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.ai_analysis    ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.approvals     ALTER COLUMN tenant_id SET NOT NULL;
END;
$$;

-- ============================================================
-- 5. UPDATE handle_new_user() TRIGGER
-- ============================================================
-- Now assigns tenant_id based on email domain matching a tenant's domains[],
-- or assigns __system__ for superadmins.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_domain     TEXT;
  v_superadmin BOOLEAN;
BEGIN
  v_superadmin := (COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'superadmin');

  -- Superadmins always go to __system__
  IF v_superadmin THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = '__system__'
    LIMIT 1;
    v_tenant_id := COALESCE(v_tenant_id, '00000000-0000-0000-0000-000000000001'::UUID);
  ELSE
    -- Find tenant by email domain
    v_domain := LOWER(SPLIT_PART(NEW.email, '@', 2));

    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE status IN ('active', 'trial')
      AND v_domain = ANY(lowerunnest(domains))
    LIMIT 1;

    -- Fallback: if no domain match, assign to the default tenant
    IF v_tenant_id IS NULL THEN
      SELECT id INTO v_tenant_id
      FROM public.tenants
      WHERE slug = 'default'
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, role, full_name, email, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    v_tenant_id
  )
  ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;

  -- Create student state if student
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO public.student_states (student_id, tenant_id)
    VALUES (NEW.id, v_tenant_id)
    ON CONFLICT (student_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. UPDATE set_profiles_updated_at TRIGGER to update tenants.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. REPLACE ALL RLS POLICIES WITH TENANT-SCOPED VERSIONS
-- ============================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS profiles_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Students see own requests" ON public.pass_requests;
DROP POLICY IF EXISTS "Admins see all requests" ON public.pass_requests;
DROP POLICY IF EXISTS "Students create own requests" ON public.pass_requests;
DROP POLICY IF EXISTS "Service role manages requests" ON public.pass_requests;
DROP POLICY IF EXISTS "Admins see all analysis" ON public.ai_analysis;
DROP POLICY IF EXISTS "Service role manages analysis" ON public.ai_analysis;
DROP POLICY IF EXISTS "Admins see all approvals" ON public.approvals;
DROP POLICY IF EXISTS "Service role manages approvals" ON public.approvals;
DROP POLICY IF EXISTS "Students see own passes" ON public.passes;
DROP POLICY IF EXISTS "Guards and admins see all passes" ON public.passes;
DROP POLICY IF EXISTS "Service role manages passes" ON public.passes;
DROP POLICY IF EXISTS "Guards can insert scans" ON public.pass_scans;
DROP POLICY IF EXISTS "Admins and guards see scans" ON public.pass_scans;
DROP POLICY IF EXISTS "Service role manages scans" ON public.pass_scans;
DROP POLICY IF EXISTS "Students see own state" ON public.student_states;
DROP POLICY IF EXISTS "Admins and guards see all states" ON public.student_states;
DROP POLICY IF EXISTS "Service role manages states" ON public.student_states;
DROP POLICY IF EXISTS "Admins see fraud flags" ON public.fraud_flags;
DROP POLICY IF EXISTS "Service role manages fraud flags" ON public.fraud_flags;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role manages audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role manages notifications" ON public.notifications;

-- Helper: current user's tenant_id from their profile
-- We use auth.uid() to look up the tenant via a function for cleaner policy SQL
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SUPERADMIN BYPASS: any user with role='superadmin' in their profile
-- can see all data (the __system__ tenant has full access via service_role,
-- so we just scope by tenant_id normally and superadmin is in __system__
-- but they still have tenant_id = __system__. Instead, we add an explicit
-- superadmin bypass condition using a function that checks the role.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own_tenant" ON public.profiles FOR SELECT USING (
  -- Service role bypass
  auth.role() = 'service_role'
  OR
  -- Superadmin sees all
  public.is_superadmin()
  OR
  -- Everyone else sees their own tenant only
  tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "profiles_insert_own_tenant" ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id
  AND (
    auth.role() = 'service_role'
    OR tenant_id = public.current_user_tenant_id()
  )
);

CREATE POLICY "profiles_update_own_tenant" ON public.profiles FOR UPDATE USING (
  auth.uid() = id
  OR (
    auth.role() = 'service_role'
    OR public.is_superadmin()
    OR (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('admin', 'superadmin'))
  )
);

-- ============================================================
-- PASS_REQUESTS
-- ============================================================
CREATE POLICY "pass_requests_select_own_tenant" ON public.pass_requests FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "pass_requests_insert_own_tenant" ON public.pass_requests FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "pass_requests_update_own_tenant" ON public.pass_requests FOR UPDATE USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "pass_requests_delete_own_tenant" ON public.pass_requests FOR DELETE USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- AI_ANALYSIS
-- ============================================================
CREATE POLICY "ai_analysis_select_own_tenant" ON public.ai_analysis FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "ai_analysis_insert_own_tenant" ON public.ai_analysis FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- APPROVALS
-- ============================================================
CREATE POLICY "approvals_select_own_tenant" ON public.approvals FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "approvals_insert_own_tenant" ON public.approvals FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "approvals_update_own_tenant" ON public.approvals FOR UPDATE USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- PASSES
-- ============================================================
CREATE POLICY "passes_select_own_tenant" ON public.passes FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "passes_insert_own_tenant" ON public.passes FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "passes_update_own_tenant" ON public.passes FOR UPDATE USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- PASS_SCANS
-- ============================================================
CREATE POLICY "pass_scans_select_own_tenant" ON public.pass_scans FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "pass_scans_insert_own_tenant" ON public.pass_scans FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- STUDENT_STATES
-- ============================================================
CREATE POLICY "student_states_select_own_tenant" ON public.student_states FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "student_states_update_own_tenant" ON public.student_states FOR UPDATE USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "student_states_insert_own_tenant" ON public.student_states FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- FRAUD_FLAGS
-- ============================================================
CREATE POLICY "fraud_flags_select_own_tenant" ON public.fraud_flags FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "fraud_flags_insert_own_tenant" ON public.fraud_flags FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "fraud_flags_update_own_tenant" ON public.fraud_flags FOR UPDATE USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- AUDIT_LOGS (read: superadmin + service_role only)
-- ============================================================
CREATE POLICY "audit_logs_select_own_tenant" ON public.audit_logs FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "audit_logs_insert_own_tenant" ON public.audit_logs FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_select_own_tenant" ON public.notifications FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR tenant_id = public.current_user_tenant_id()
);

CREATE POLICY "notifications_update_own_tenant" ON public.notifications FOR UPDATE USING (
  auth.uid() = user_id
  OR auth.role() = 'service_role'
  OR public.is_superadmin()
);

CREATE POLICY "notifications_insert_own_tenant" ON public.notifications FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR tenant_id = public.current_user_tenant_id()
);

-- ============================================================
-- TENANTS: only superadmin via service_role (no RLS for table itself,
-- service_role has full access; we enforce via requireSuperAdmin in code)
-- ============================================================

-- ============================================================
-- 8. INDEXES for tenant_id on all tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant    ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_requests_tenant     ON public.pass_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_passes_tenant      ON public.passes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_tenant  ON public.pass_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_states_tenant     ON public.student_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fraud_tenant      ON public.fraud_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant       ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_tenant       ON public.notifications(tenant_id);

COMMIT;

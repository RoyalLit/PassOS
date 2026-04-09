-- ============================================================
-- PassOS Migration 016: Disable Multi-Tenancy (tenant_id now optional)
-- ============================================================
-- Multi-tenancy is temporarily disabled. tenant_id columns are kept
-- but made nullable so existing data isn't lost.
-- When re-enabled, migration 011's NOT NULL constraints can be re-applied.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Remove NOT NULL from tenant_id on all tables
-- ============================================================
ALTER TABLE public.profiles        ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.pass_requests   ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.passes         ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.pass_scans     ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.student_states  ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.fraud_flags    ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.audit_logs     ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.notifications   ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.ai_analysis    ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.approvals      ALTER COLUMN tenant_id DROP NOT NULL;

-- ============================================================
-- 2. Simplify audit_log_trigger — no tenant_id required
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, new_data)
    VALUES ('create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data)
    VALUES ('update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data)
    VALUES ('delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Simplify handle_new_user trigger — no tenant_id required
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      full_name = EXCLUDED.full_name;

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO public.student_states (student_id, current_state)
    VALUES (NEW.id, 'inside')
    ON CONFLICT (student_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Simplify RLS policies — remove tenant_id checks
-- ============================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_insert_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_authenticated" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- pass_requests
ALTER TABLE public.pass_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pass_requests_insert_own_tenant" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_select_own_tenant" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_update_own_tenant" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_delete_own_tenant" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_select_authenticated" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_insert_authenticated" ON public.pass_requests;
DROP POLICY IF EXISTS "pass_requests_update_authenticated" ON public.pass_requests;
CREATE POLICY "pass_requests_select_authenticated" ON public.pass_requests FOR SELECT USING (true);
CREATE POLICY "pass_requests_insert_authenticated" ON public.pass_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "pass_requests_update_authenticated" ON public.pass_requests FOR UPDATE USING (true);

-- passes
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "passes_select_own_tenant" ON public.passes;
DROP POLICY IF EXISTS "passes_insert_own_tenant" ON public.passes;
DROP POLICY IF EXISTS "passes_select_authenticated" ON public.passes;
DROP POLICY IF EXISTS "passes_insert_authenticated" ON public.passes;
CREATE POLICY "passes_select_authenticated" ON public.passes FOR SELECT USING (true);
CREATE POLICY "passes_insert_authenticated" ON public.passes FOR INSERT WITH CHECK (true);

-- pass_scans
ALTER TABLE public.pass_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pass_scans_select_own_tenant" ON public.pass_scans;
DROP POLICY IF EXISTS "pass_scans_insert_own_tenant" ON public.pass_scans;
DROP POLICY IF EXISTS "pass_scans_select_authenticated" ON public.pass_scans;
DROP POLICY IF EXISTS "pass_scans_insert_authenticated" ON public.pass_scans;
CREATE POLICY "pass_scans_select_authenticated" ON public.pass_scans FOR SELECT USING (true);
CREATE POLICY "pass_scans_insert_authenticated" ON public.pass_scans FOR INSERT WITH CHECK (true);

-- approvals
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approvals_select_own_tenant" ON public.approvals;
DROP POLICY IF EXISTS "approvals_insert_own_tenant" ON public.approvals;
DROP POLICY IF EXISTS "approvals_select_authenticated" ON public.approvals;
DROP POLICY IF EXISTS "approvals_insert_authenticated" ON public.approvals;
CREATE POLICY "approvals_select_authenticated" ON public.approvals FOR SELECT USING (true);
CREATE POLICY "approvals_insert_authenticated" ON public.approvals FOR INSERT WITH CHECK (true);

-- student_states
ALTER TABLE public.student_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_states_select_own_tenant" ON public.student_states;
DROP POLICY IF EXISTS "student_states_select_authenticated" ON public.student_states;
DROP POLICY IF EXISTS "student_states_update_authenticated" ON public.student_states;
CREATE POLICY "student_states_select_authenticated" ON public.student_states FOR SELECT USING (true);
CREATE POLICY "student_states_update_authenticated" ON public.student_states FOR UPDATE USING (true);

-- fraud_flags
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fraud_flags_select_own_tenant" ON public.fraud_flags;
DROP POLICY IF EXISTS "fraud_flags_select_authenticated" ON public.fraud_flags;
CREATE POLICY "fraud_flags_select_authenticated" ON public.fraud_flags FOR SELECT USING (true);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own_tenant" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select_own_tenant" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_own_tenant" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_select_authenticated" ON public.audit_logs FOR SELECT USING (true);

-- ai_analysis
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_analysis_select_own_tenant" ON public.ai_analysis;
DROP POLICY IF EXISTS "ai_analysis_select_authenticated" ON public.ai_analysis;
DROP POLICY IF EXISTS "ai_analysis_insert_authenticated" ON public.ai_analysis;
CREATE POLICY "ai_analysis_select_authenticated" ON public.ai_analysis FOR SELECT USING (true);
CREATE POLICY "ai_analysis_insert_authenticated" ON public.ai_analysis FOR INSERT WITH CHECK (true);

COMMIT;

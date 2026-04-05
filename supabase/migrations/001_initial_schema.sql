-- ============================================================
-- PassOS Database Schema
-- Version: 1.0.0
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USER PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('student','parent','admin','guard')),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  avatar_url    TEXT,
  hostel        TEXT,
  room_number   TEXT,
  parent_id     UUID REFERENCES public.profiles(id),
  is_flagged    BOOLEAN DEFAULT FALSE,
  flag_reason   TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_parent ON public.profiles(parent_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ============================================================
-- 2. PASS REQUESTS
-- ============================================================
CREATE TABLE public.pass_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.profiles(id),
  request_type    TEXT NOT NULL CHECK (request_type IN (
                    'day_outing','overnight','emergency','medical','academic'
                  )),
  reason          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  departure_at    TIMESTAMPTZ NOT NULL,
  return_by       TIMESTAMPTZ NOT NULL,
  proof_urls      TEXT[] DEFAULT '{}',
  geo_lat         DOUBLE PRECISION,
  geo_lng         DOUBLE PRECISION,
  geo_valid       BOOLEAN DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                    'pending','ai_review','parent_pending','parent_approved',
                    'parent_rejected','admin_pending','approved','rejected','cancelled'
                  )),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_requests_student ON public.pass_requests(student_id);
CREATE INDEX idx_requests_status ON public.pass_requests(status);
CREATE INDEX idx_requests_created ON public.pass_requests(created_at DESC);
CREATE INDEX idx_requests_departure ON public.pass_requests(departure_at);

-- ============================================================
-- 3. AI ANALYSIS
-- ============================================================
CREATE TABLE public.ai_analysis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.pass_requests(id) ON DELETE CASCADE,
  risk_level      TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  anomaly_score   DOUBLE PRECISION NOT NULL CHECK (anomaly_score BETWEEN 0 AND 1),
  flags           JSONB DEFAULT '[]',
  reasoning       TEXT,
  raw_response    JSONB,
  model_version   TEXT,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_request ON public.ai_analysis(request_id);
CREATE INDEX idx_ai_risk ON public.ai_analysis(risk_level);

-- ============================================================
-- 4. APPROVALS
-- ============================================================
CREATE TABLE public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.pass_requests(id) ON DELETE CASCADE,
  approver_id     UUID REFERENCES public.profiles(id),
  approver_type   TEXT NOT NULL CHECK (approver_type IN ('parent','admin','system')),
  decision        TEXT NOT NULL CHECK (decision IN ('approved','rejected','escalated')),
  reason          TEXT,
  token           TEXT UNIQUE,
  token_expires   TIMESTAMPTZ,
  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_approvals_request ON public.approvals(request_id);
CREATE INDEX idx_approvals_token ON public.approvals(token) WHERE token IS NOT NULL;

-- ============================================================
-- 5. ISSUED PASSES
-- ============================================================
CREATE TABLE public.passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.pass_requests(id),
  student_id      UUID NOT NULL REFERENCES public.profiles(id),
  qr_payload      TEXT NOT NULL UNIQUE,
  qr_nonce        TEXT NOT NULL UNIQUE,
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                    'active','used_exit','used_entry','expired','revoked'
                  )),
  exit_at         TIMESTAMPTZ,
  entry_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_passes_student ON public.passes(student_id);
CREATE INDEX idx_passes_status ON public.passes(status);
CREATE INDEX idx_passes_qr ON public.passes(qr_nonce);
CREATE INDEX idx_passes_valid ON public.passes(valid_until) WHERE status = 'active';

-- ============================================================
-- 6. GATE SCAN EVENTS
-- ============================================================
CREATE TABLE public.pass_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id         UUID NOT NULL REFERENCES public.passes(id),
  guard_id        UUID NOT NULL REFERENCES public.profiles(id),
  scan_type       TEXT NOT NULL CHECK (scan_type IN ('exit','entry')),
  geo_lat         DOUBLE PRECISION,
  geo_lng         DOUBLE PRECISION,
  device_info     JSONB DEFAULT '{}',
  scan_result     TEXT NOT NULL CHECK (scan_result IN (
                    'valid','expired','already_used','revoked','invalid_signature','error'
                  )),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scans_pass ON public.pass_scans(pass_id);
CREATE INDEX idx_scans_guard ON public.pass_scans(guard_id);
CREATE INDEX idx_scans_created ON public.pass_scans(created_at DESC);

-- ============================================================
-- 7. STUDENT LOCATION STATE
-- ============================================================
CREATE TABLE public.student_states (
  student_id      UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_state   TEXT NOT NULL DEFAULT 'inside' CHECK (current_state IN (
                    'inside','outside','overdue'
                  )),
  active_pass_id  UUID REFERENCES public.passes(id),
  last_exit       TIMESTAMPTZ,
  last_entry      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. FRAUD FLAGS
-- ============================================================
CREATE TABLE public.fraud_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.profiles(id),
  flag_type       TEXT NOT NULL CHECK (flag_type IN (
                    'rapid_requests','repeated_excuse','late_returns',
                    'suspicious_pattern','manual_flag'
                  )),
  severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  details         JSONB DEFAULT '{}',
  resolved        BOOLEAN DEFAULT FALSE,
  resolved_by     UUID REFERENCES public.profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fraud_student ON public.fraud_flags(student_id);
CREATE INDEX idx_fraud_unresolved ON public.fraud_flags(resolved) WHERE resolved = FALSE;

-- ============================================================
-- 9. AUDIT LOG (IMMUTABLE)
-- ============================================================
CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES public.profiles(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('in_app','email','whatsapp','sms')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB DEFAULT '{}',
  read            BOOLEAN DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, read);
CREATE INDEX idx_notif_created ON public.notifications(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_own ON public.profiles FOR SELECT USING (
  id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','guard')
);

-- Profiles: allow users to insert and update their own profile
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id
);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (
  auth.uid() = id
);
CREATE POLICY "Service role can do anything" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Pass requests
CREATE POLICY "Students see own requests" ON public.pass_requests
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins see all requests" ON public.pass_requests
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Students create own requests" ON public.pass_requests
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Service role manages requests" ON public.pass_requests
  FOR ALL USING (auth.role() = 'service_role');

-- AI Analysis
CREATE POLICY "Admins see all analysis" ON public.ai_analysis
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Service role manages analysis" ON public.ai_analysis
  FOR ALL USING (auth.role() = 'service_role');

-- Approvals
CREATE POLICY "Admins see all approvals" ON public.approvals
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Service role manages approvals" ON public.approvals
  FOR ALL USING (auth.role() = 'service_role');

-- Passes
CREATE POLICY "Students see own passes" ON public.passes
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Guards and admins see all passes" ON public.passes
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','guard')
  );
CREATE POLICY "Service role manages passes" ON public.passes
  FOR ALL USING (auth.role() = 'service_role');

-- Scans
CREATE POLICY "Guards can insert scans" ON public.pass_scans
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'guard'
  );
CREATE POLICY "Admins and guards see scans" ON public.pass_scans
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','guard')
  );
CREATE POLICY "Service role manages scans" ON public.pass_scans
  FOR ALL USING (auth.role() = 'service_role');

-- Student states
CREATE POLICY "Students see own state" ON public.student_states
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins and guards see all states" ON public.student_states
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','guard')
  );
CREATE POLICY "Service role manages states" ON public.student_states
  FOR ALL USING (auth.role() = 'service_role');

-- Fraud flags
CREATE POLICY "Admins see fraud flags" ON public.fraud_flags
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Service role manages fraud flags" ON public.fraud_flags
  FOR ALL USING (auth.role() = 'service_role');

-- Audit logs (read-only for admins)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Service role manages audit logs" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Notifications
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service role manages notifications" ON public.notifications
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON public.pass_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_student_states_updated_at
  BEFORE UPDATE ON public.student_states
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  -- Create student state if student
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO public.student_states (student_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit log trigger function
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

-- Attach audit triggers to key tables
CREATE TRIGGER audit_pass_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.pass_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_approvals
  AFTER INSERT ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_passes
  AFTER INSERT OR UPDATE ON public.passes
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_pass_scans
  AFTER INSERT ON public.pass_scans
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Fraud detection: rapid requests
CREATE OR REPLACE FUNCTION public.check_rapid_requests()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.pass_requests
  WHERE student_id = NEW.student_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND id != NEW.id;

  IF request_count >= 3 THEN
    INSERT INTO public.fraud_flags (student_id, flag_type, severity, details)
    VALUES (
      NEW.student_id,
      'rapid_requests',
      CASE WHEN request_count >= 5 THEN 'high' ELSE 'medium' END,
      jsonb_build_object('count_24h', request_count + 1, 'request_id', NEW.id)
    );
    UPDATE public.profiles SET is_flagged = TRUE, flag_reason = 'Rapid request pattern detected'
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_rapid_requests_trigger
  AFTER INSERT ON public.pass_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_rapid_requests();

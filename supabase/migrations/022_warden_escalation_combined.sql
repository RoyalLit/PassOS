-- ============================================================
-- PassOS Migration: Warden Role System & Escalation
-- Combined migration for warden tables + escalation system
-- This migration requires the warden tables to be created first
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: WARDEN TABLES
-- ============================================================

-- Create wardens table (many-to-many: warden can manage multiple hostels)
CREATE TABLE IF NOT EXISTS public.wardens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, hostel)
);

CREATE INDEX IF NOT EXISTS idx_wardens_profile ON public.wardens(profile_id);
CREATE INDEX IF NOT EXISTS idx_wardens_hostel ON public.wardens(hostel);

-- Create hostel_student_assignments for explicit student-hostel mapping
CREATE TABLE IF NOT EXISTS public.hostel_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel        TEXT NOT NULL,
  assigned_by   UUID REFERENCES public.profiles(id),
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, hostel)
);

CREATE INDEX IF NOT EXISTS idx_hostel_assignments_student ON public.hostel_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_assignments_hostel ON public.hostel_assignments(hostel);

-- RLS Policies for wardens table
ALTER TABLE public.wardens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wardens can manage own records" ON public.wardens
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "Service role manages wardens" ON public.wardens
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admins see all wardens" ON public.wardens
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policies for hostel_assignments table
ALTER TABLE public.hostel_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages hostel assignments" ON public.hostel_assignments
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admins manage hostel assignments" ON public.hostel_assignments
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Wardens view hostel assignments" ON public.hostel_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wardens w 
      WHERE w.profile_id = auth.uid() 
      AND w.hostel = hostel_assignments.hostel
    )
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'guard')
  );

-- Helper function to get warden's assigned hostels
CREATE OR REPLACE FUNCTION public.get_warden_hostels(p_profile_id UUID)
RETURNS TABLE(hostel TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT w.hostel FROM public.wardens w WHERE w.profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if warden has access to a student
CREATE OR REPLACE FUNCTION public.warden_can_access_student(
  p_warden_id UUID,
  p_student_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_assignment BOOLEAN;
  v_student_hostel TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.hostel_assignments ha
    JOIN public.wardens w ON w.hostel = ha.hostel AND w.profile_id = p_warden_id
    WHERE ha.student_id = p_student_id
  ) INTO v_has_assignment;
  
  IF v_has_assignment THEN
    RETURN TRUE;
  END IF;
  
  SELECT p.hostel INTO v_student_hostel
  FROM public.profiles p WHERE p.id = p_student_id;
  
  IF v_student_hostel IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.wardens w 
    WHERE w.profile_id = p_warden_id 
    AND w.hostel = v_student_hostel
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get students for a warden
CREATE OR REPLACE FUNCTION public.get_warden_students(p_warden_id UUID)
RETURNS TABLE(
  student_id UUID,
  full_name TEXT,
  email TEXT,
  hostel TEXT,
  room_number TEXT,
  current_state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as student_id,
    p.full_name,
    p.email,
    COALESCE(ha.hostel, p.hostel) as hostel,
    p.room_number,
    COALESCE(ss.current_state, 'inside'::TEXT) as current_state
  FROM public.profiles p
  LEFT JOIN public.hostel_assignments ha ON ha.student_id = p.id
  LEFT JOIN public.wardens w ON w.hostel = COALESCE(ha.hostel, p.hostel) AND w.profile_id = p_warden_id
  LEFT JOIN public.student_states ss ON ss.student_id = p.id
  WHERE p.role = 'student'
    AND w.profile_id IS NOT NULL
  GROUP BY p.id, p.full_name, p.email, ha.hostel, p.hostel, p.room_number, ss.current_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get hostel wardens for notification
CREATE OR REPLACE FUNCTION public.get_hostel_wardens(p_hostel TEXT)
RETURNS TABLE(profile_id UUID, full_name TEXT, email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pr.id, pr.full_name, pr.email
  FROM public.profiles pr
  JOIN public.wardens w ON w.profile_id = pr.id
  WHERE w.hostel = p_hostel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add hostel_assignments trigger to create student_states
CREATE OR REPLACE FUNCTION public.handle_hostel_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.student_states (student_id)
  VALUES (NEW.student_id)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_hostel_assignment_created ON public.hostel_assignments;
CREATE TRIGGER on_hostel_assignment_created
  AFTER INSERT ON public.hostel_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_hostel_assignment();

-- ============================================================
-- PART 2: PUSH NOTIFICATIONS TABLES
-- ============================================================

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    notify_pass_approved BOOLEAN DEFAULT true,
    notify_pass_rejected BOOLEAN DEFAULT true,
    notify_pass_overdue BOOLEAN DEFAULT true,
    notify_parent_approval_needed BOOLEAN DEFAULT true,
    notify_escalation BOOLEAN DEFAULT true,
    notify_new_announcement BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Notification logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    notification_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at DESC);

-- Helper Functions for Push Notifications
CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (id UUID, endpoint TEXT, keys JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.id, ps.endpoint, ps.keys
  FROM public.push_subscriptions ps
  WHERE ps.user_id = p_user_id AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.save_push_subscription(
    p_user_id UUID,
    p_endpoint TEXT,
    p_keys JSONB
)
RETURNS public.push_subscriptions AS $$
DECLARE
    v_subscription public.push_subscriptions%ROWTYPE;
BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, keys)
    VALUES (p_user_id, p_endpoint, p_keys)
    ON CONFLICT (user_id, endpoint) DO UPDATE
        SET keys = p_keys, is_active = true, updated_at = NOW()
    RETURNING * INTO v_subscription;
    RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(
    p_user_id UUID,
    p_endpoint TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.push_subscriptions
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_notification_preferences(p_user_id UUID)
RETURNS public.notification_preferences AS $$
DECLARE
    v_prefs public.notification_preferences%ROWTYPE;
BEGIN
    SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
    IF v_prefs IS NULL THEN
        INSERT INTO public.notification_preferences (user_id) VALUES (p_user_id)
        RETURNING * INTO v_prefs;
    END IF;
    RETURN v_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_notification_preferences(
    p_user_id UUID,
    p_push_enabled BOOLEAN DEFAULT NULL,
    p_email_enabled BOOLEAN DEFAULT NULL,
    p_notify_pass_approved BOOLEAN DEFAULT NULL,
    p_notify_pass_rejected BOOLEAN DEFAULT NULL,
    p_notify_pass_overdue BOOLEAN DEFAULT NULL,
    p_notify_parent_approval_needed BOOLEAN DEFAULT NULL,
    p_notify_escalation BOOLEAN DEFAULT NULL,
    p_notify_new_announcement BOOLEAN DEFAULT NULL,
    p_quiet_hours_start TIME DEFAULT NULL,
    p_quiet_hours_end TIME DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL
)
RETURNS public.notification_preferences AS $$
DECLARE
    v_prefs public.notification_preferences%ROWTYPE;
BEGIN
    UPDATE public.notification_preferences
    SET
        push_enabled = COALESCE(p_push_enabled, push_enabled),
        email_enabled = COALESCE(p_email_enabled, email_enabled),
        notify_pass_approved = COALESCE(p_notify_pass_approved, notify_pass_approved),
        notify_pass_rejected = COALESCE(p_notify_pass_rejected, notify_pass_rejected),
        notify_pass_overdue = COALESCE(p_notify_pass_overdue, notify_pass_overdue),
        notify_parent_approval_needed = COALESCE(p_notify_parent_approval_needed, notify_parent_approval_needed),
        notify_escalation = COALESCE(p_notify_escalation, notify_escalation),
        notify_new_announcement = COALESCE(p_notify_new_announcement, notify_new_announcement),
        quiet_hours_start = COALESCE(p_quiet_hours_start, quiet_hours_start),
        quiet_hours_end = COALESCE(p_quiet_hours_end, quiet_hours_end),
        timezone = COALESCE(p_timezone, timezone),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_prefs;
    RETURN v_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_notification_type TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.notification_logs (user_id, title, body, notification_type, data)
    VALUES (p_user_id, p_title, p_body, p_notification_type, p_data)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_notification_status(
    p_log_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notification_logs
    SET status = p_status,
        sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
        error_message = p_error_message
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_notification_recipients(
    p_student_id UUID,
    p_notification_type TEXT
)
RETURNS TABLE (user_id UUID, notification_type TEXT, user_role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.user_id, p_notification_type, 'student'::TEXT
    FROM public.profiles p WHERE p.user_id = p_student_id
    UNION
    SELECT psr.parent_id, p_notification_type, 'parent'::TEXT
    FROM public.parent_student_relations psr WHERE psr.student_id = p_student_id
    UNION
    SELECT DISTINCT w.profile_id, p_notification_type, 'warden'::TEXT
    FROM public.hostel_assignments ha
    JOIN public.wardens w ON w.hostel = ha.hostel
    WHERE ha.student_id = p_student_id
    UNION
    SELECT p.user_id, p_notification_type, 'admin'::TEXT
    FROM public.profiles p WHERE p.role = 'admin'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for push notifications
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own notification preferences" ON public.notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notification preferences" ON public.notification_preferences
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own notification logs" ON public.notification_logs
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- PART 3: ESCALATION SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    threshold_minutes INTEGER NOT NULL DEFAULT 30,
    priority INTEGER NOT NULL DEFAULT 1,
    notify_student BOOLEAN DEFAULT true,
    notify_parents BOOLEAN DEFAULT true,
    notify_wardens BOOLEAN DEFAULT true,
    notify_admins BOOLEAN DEFAULT true,
    auto_action TEXT,
    action_params JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_tenant ON public.escalation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_event_type ON public.escalation_rules(event_type);

CREATE TABLE IF NOT EXISTS public.escalation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pass_id UUID REFERENCES public.passes(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES public.escalation_rules(id) ON DELETE SET NULL,
    trigger_event TEXT NOT NULL,
    trigger_details JSONB DEFAULT '{}',
    actions_taken JSONB DEFAULT '[]',
    recipients_notified JSONB DEFAULT '[]',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'escalated')),
    acknowledged_by UUID REFERENCES public.profiles(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_logs_tenant ON public.escalation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_student ON public.escalation_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_status ON public.escalation_logs(status);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_active ON public.escalation_logs(status, created_at) WHERE status IN ('active', 'acknowledged');

CREATE TABLE IF NOT EXISTS public.escalation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    default_threshold_minutes INTEGER NOT NULL DEFAULT 30,
    default_priority TEXT DEFAULT 'medium',
    notify_student BOOLEAN DEFAULT true,
    notify_parents BOOLEAN DEFAULT true,
    notify_wardens BOOLEAN DEFAULT true,
    notify_admins BOOLEAN DEFAULT true,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.escalation_templates (name, event_type, default_threshold_minutes, default_priority, notify_student, notify_parents, notify_wardens, notify_admins, description, is_system) VALUES
('Pass Overdue - Warning', 'pass_overdue', 15, 'low', true, true, true, false, 'First alert when student is 15 minutes late', true),
('Pass Overdue - Alert', 'pass_overdue', 30, 'medium', true, true, true, true, 'Escalated alert at 30 minutes', true),
('Pass Overdue - Critical', 'pass_overdue', 60, 'high', true, true, true, true, 'Critical escalation at 1 hour', true),
('Rapid Request Pattern', 'rapid_requests', 60, 'medium', false, false, false, true, 'Multiple requests within short time', true),
('Suspicious Pattern Detected', 'suspicious_pattern', 0, 'high', false, false, true, true, 'System detected suspicious activity', true),
('Repeated Late Returns', 'late_returns', 1440, 'medium', true, true, true, false, 'Pattern of late returns over 24 hours', true)
ON CONFLICT DO NOTHING;

-- Escalation helper functions
CREATE OR REPLACE FUNCTION public.get_escalation_rules(
    p_tenant_id UUID, p_event_type TEXT
)
RETURNS TABLE (
    id UUID, name TEXT, threshold_minutes INTEGER, priority TEXT,
    notify_student BOOLEAN, notify_parents BOOLEAN, notify_wardens BOOLEAN, notify_admins BOOLEAN,
    auto_action TEXT, action_params JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT er.id, er.name, er.threshold_minutes, er.priority,
        er.notify_student, er.notify_parents, er.notify_wardens, er.notify_admins,
        er.auto_action, er.action_params
    FROM public.escalation_rules er
    WHERE er.tenant_id = p_tenant_id AND er.event_type = p_event_type AND er.is_active = true
    ORDER BY er.priority DESC, er.threshold_minutes ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_escalation_log(
    p_tenant_id UUID, p_student_id UUID, p_pass_id UUID,
    p_rule_id UUID, p_trigger_event TEXT,
    p_trigger_details JSONB DEFAULT '{}', p_priority TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE v_log_id UUID;
BEGIN
    INSERT INTO public.escalation_logs (
        tenant_id, student_id, pass_id, rule_id, trigger_event, trigger_details, priority, status
    ) VALUES (
        p_tenant_id, p_student_id, p_pass_id, p_rule_id, p_trigger_event, p_trigger_details, p_priority, 'active'
    ) RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_escalation_actions(
    p_log_id UUID, p_action TEXT, p_recipients TEXT[] DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.escalation_logs
    SET actions_taken = actions_taken || jsonb_build_object(
        'action', p_action, 'timestamp', NOW()::TEXT, 'recipients', p_recipients
    ), updated_at = NOW()
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.acknowledge_escalation(p_log_id UUID, p_acknowledged_by UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.escalation_logs
    SET status = 'acknowledged', acknowledged_by = p_acknowledged_by, acknowledged_at = NOW(), updated_at = NOW()
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.resolve_escalation(
    p_log_id UUID, p_resolved_by UUID, p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.escalation_logs
    SET status = 'resolved', resolved_by = p_resolved_by, resolved_at = NOW(), resolution_notes = p_notes, updated_at = NOW()
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_student_active_escalations(p_student_id UUID)
RETURNS TABLE (id UUID, trigger_event TEXT, trigger_details JSONB, priority TEXT, status TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT el.id, el.trigger_event, el.trigger_details, el.priority, el.status, el.created_at
    FROM public.escalation_logs el
    WHERE el.student_id = p_student_id AND el.status IN ('active', 'acknowledged')
    ORDER BY 
        CASE el.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
        el.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for escalation
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage escalation rules" ON public.escalation_rules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

CREATE POLICY "Students view own escalation logs" ON public.escalation_logs
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Wardens view escalation logs" ON public.escalation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wardens w
            JOIN public.hostel_assignments ha ON ha.hostel = w.hostel
            WHERE w.profile_id = auth.uid() AND ha.student_id = escalation_logs.student_id
        )
    );

CREATE POLICY "Admins manage escalation logs" ON public.escalation_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

CREATE POLICY "Everyone view escalation templates" ON public.escalation_templates
    FOR SELECT TO authenticated USING (true);

-- ============================================================
-- PART 4: DASHBOARD FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.count_overdue()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT ss.student_id) INTO v_count
    FROM public.student_states ss
    WHERE ss.current_state = 'overdue'
      AND EXISTS (SELECT 1 FROM public.passes p WHERE p.id = ss.active_pass_id AND p.valid_until < NOW());
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_today_stats()
RETURNS JSONB AS $$
DECLARE v_result JSONB;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT jsonb_build_object(
        'today_total', (SELECT COUNT(*) FROM public.pass_requests WHERE DATE(created_at) = v_today),
        'today_approved', (SELECT COUNT(*) FROM public.pass_requests WHERE DATE(created_at) = v_today AND status = 'approved'),
        'today_rejected', (SELECT COUNT(*) FROM public.pass_requests WHERE DATE(created_at) = v_today AND status = 'rejected'),
        'active_passes', (SELECT COUNT(*) FROM public.passes WHERE status IN ('active', 'used_exit')),
        'students_outside', (SELECT COUNT(*) FROM public.student_states WHERE current_state = 'outside'),
        'students_overdue', (SELECT COUNT(*) FROM public.student_states WHERE current_state = 'overdue')
    ) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.count_overdue_by_hostels(p_hostels TEXT[])
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT p.id) INTO v_count
    FROM public.profiles p
    JOIN public.hostel_assignments ha ON ha.student_id = p.id
    JOIN public.student_states ss ON ss.student_id = p.id
    WHERE p.role = 'student' AND ha.hostel = ANY(p_hostels) AND ss.current_state = 'overdue';
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

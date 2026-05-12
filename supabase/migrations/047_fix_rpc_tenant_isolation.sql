-- ============================================================
-- PassOS Migration: Fix Tenant Isolation in RPCs
-- Ensures dashboard stats and overdue counts are restricted to 
-- the current user's tenant, even when using SECURITY DEFINER.
-- ============================================================

BEGIN;

-- 1. Fix get_today_stats to be tenant-aware
CREATE OR REPLACE FUNCTION public.get_today_stats()
RETURNS JSONB AS $$
DECLARE 
    v_result JSONB;
    v_today DATE := CURRENT_DATE;
    v_tenant_id UUID;
BEGIN
    -- Get current user's tenant_id (security definer helper)
    v_tenant_id := public.current_user_tenant_id_db();

    SELECT jsonb_build_object(
        'today_total', (SELECT COUNT(*) FROM public.pass_requests WHERE tenant_id = v_tenant_id AND DATE(created_at) = v_today),
        'today_approved', (SELECT COUNT(*) FROM public.pass_requests WHERE tenant_id = v_tenant_id AND DATE(created_at) = v_today AND status = 'approved'),
        'today_rejected', (SELECT COUNT(*) FROM public.pass_requests WHERE tenant_id = v_tenant_id AND DATE(created_at) = v_today AND status = 'rejected'),
        'active_passes', (SELECT COUNT(*) FROM public.passes WHERE tenant_id = v_tenant_id AND status IN ('active', 'used_exit')),
        'students_outside', (SELECT COUNT(*) FROM public.student_states WHERE tenant_id = v_tenant_id AND current_state = 'outside'),
        'students_overdue', (SELECT COUNT(*) FROM public.student_states WHERE tenant_id = v_tenant_id AND current_state = 'overdue')
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Fix count_overdue to be tenant-aware
CREATE OR REPLACE FUNCTION public.count_overdue()
RETURNS INTEGER AS $$
DECLARE 
    v_count INTEGER;
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.current_user_tenant_id_db();

    SELECT COUNT(DISTINCT ss.student_id) INTO v_count
    FROM public.student_states ss
    WHERE ss.tenant_id = v_tenant_id
      AND ss.current_state = 'overdue';
      
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;

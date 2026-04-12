-- Add composite indexes for multi-tenant query optimization

BEGIN;

-- pass_requests composite indexes
CREATE INDEX IF NOT EXISTS idx_requests_tenant_status ON public.pass_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_tenant_student ON public.pass_requests(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_requests_tenant_created ON public.pass_requests(tenant_id, created_at DESC);

-- passes composite indexes
CREATE INDEX IF NOT EXISTS idx_passes_tenant_status ON public.passes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_passes_tenant_student ON public.passes(tenant_id, student_id);

-- student_states composite indexes
CREATE INDEX IF NOT EXISTS idx_states_tenant_status ON public.student_states(tenant_id, current_state);
CREATE INDEX IF NOT EXISTS idx_states_tenant_student ON public.student_states(tenant_id, student_id);

-- profiles composite index for tenant + role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON public.profiles(tenant_id, role);

COMMIT;

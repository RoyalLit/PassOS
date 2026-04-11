-- Migration 034: Fix passes RLS so students can see their own data
-- The previous policy relied entirely on tenant_id matching via JWT metadata.
-- If a student's JWT wasn't refreshed after tenant assignment, the query returns null
-- and they see nothing. This patch adds student_id matching as a fallback.

BEGIN;

-- Fix passes table
DROP POLICY IF EXISTS "passes_select_own_tenant" ON public.passes;
CREATE POLICY "passes_select_v2" ON public.passes FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR student_id = auth.uid()                          -- Students always see their own passes
  OR tenant_id = public.current_user_tenant_id()      -- Admins/wardens/guards see tenant's passes
);

-- Fix pass_requests table similarly
DROP POLICY IF EXISTS "pass_requests_select_own_tenant" ON public.pass_requests;
CREATE POLICY "pass_requests_select_v2" ON public.pass_requests FOR SELECT USING (
  auth.role() = 'service_role'
  OR public.is_superadmin()
  OR student_id = auth.uid()                          -- Students always see their own requests
  OR tenant_id = public.current_user_tenant_id()      -- Admins/wardens see tenant's requests
);

COMMIT;

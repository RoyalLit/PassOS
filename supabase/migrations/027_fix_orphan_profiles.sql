-- ============================================================
-- PassOS Migration: Fix Orphan Profiles (Tenant Repair)
-- Assigns a tenant_id to any user missing one.
-- ============================================================

BEGIN;

-- 1. Identify the primary (oldest) tenant in the system as a fallback
-- In a multi-tenant system, we assume orphans belong to the first university created.
-- In a single-tenant system, this perfectly fixes everyone.
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Update all profiles missing a tenant_id
    UPDATE public.profiles
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;
    
    -- Update all student_states missing a tenant_id
    UPDATE public.student_states
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- Refresh the auth metadata for these users too using our new sync trigger
    -- (This triggers the sync_profile_to_auth function we just created)
    UPDATE public.profiles
    SET updated_at = now()
    WHERE tenant_id = v_tenant_id;
  END IF;
END $$;

COMMIT;

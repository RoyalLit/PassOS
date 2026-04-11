-- ============================================================
-- PassOS Migration: Bootstrap Test Tenant
-- Ensures at least one tenant exists and all users are linked to it.
-- This makes local testing/development "just work".
-- ============================================================

BEGIN;

-- 1. Ensure we have at least one active tenant
INSERT INTO public.tenants (id, name, slug, domains, status, plan, settings)
SELECT 
  '77777777-7777-7777-7777-777777777777', -- Fixed 'Test' ID
  'Test University', 
  'test-uni', 
  ARRAY['test.com'], 
  'active', 
  'starter', 
  '{}'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'test-uni' OR slug = 'default');

-- 2. Link all users who are missing a tenant_id to the first available non-system tenant
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get the first available "real" tenant (not the system management one)
  SELECT id INTO v_tenant_id 
  FROM public.tenants 
  WHERE slug != '__system__' 
  ORDER BY created_at ASC LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Backfill all orphan users
    UPDATE public.profiles
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;
    
    -- Ensure any other shared data is also linked
    UPDATE public.student_states
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    UPDATE public.pass_requests
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    UPDATE public.profiles
    SET updated_at = now()
    WHERE tenant_id = v_tenant_id;
  END IF;
END $$;

COMMIT;

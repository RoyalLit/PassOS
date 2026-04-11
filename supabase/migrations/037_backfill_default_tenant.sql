-- Ensure all users have tenant_id assigned to a default tenant

BEGIN;

-- 1. Create default tenant if it doesn't exist
INSERT INTO public.tenants (id, name, slug, domains, status, plan, settings)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Default University',
  'default',
  ARRAY[]::TEXT[],
  'active',
  'starter',
  '{}'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'default');

-- 2. Get the default tenant ID
DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id FROM public.tenants WHERE slug = 'default';
  
  IF v_default_tenant_id IS NULL THEN
    RAISE NOTICE 'Default tenant not found, creating...';
    INSERT INTO public.tenants (id, name, slug, domains, status, plan, settings)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Default University',
      'default',
      ARRAY[]::TEXT[],
      'active',
      'starter',
      '{}'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_default_tenant_id;
  END IF;
  
  RAISE NOTICE 'Using default tenant ID: %', v_default_tenant_id;
  
  -- 3. Backfill all orphan profiles
  UPDATE public.profiles SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  
  -- 4. Backfill all orphan student_states
  UPDATE public.student_states SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  
  -- 5. Backfill all orphan pass_requests
  UPDATE public.pass_requests SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  
  -- 6. Backfill all orphan passes
  UPDATE public.passes SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  
  -- 7. Backfill all orphan approvals
  UPDATE public.approvals SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  
  RAISE NOTICE 'Backfill complete. Updated % profiles, % student_states, % pass_requests, % passes',
    (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = v_default_tenant_id),
    (SELECT COUNT(*) FROM public.student_states WHERE tenant_id = v_default_tenant_id),
    (SELECT COUNT(*) FROM public.pass_requests WHERE tenant_id = v_default_tenant_id),
    (SELECT COUNT(*) FROM public.passes WHERE tenant_id = v_default_tenant_id);
END $$;

COMMIT;

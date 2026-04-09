-- ============================================================
-- PassOS Migration 014: Fix handle_new_user Trigger
-- ============================================================
-- 1. Replaces non-existent `lowerunnest` with standard array check.
-- 2. Ensures domains matches correctly against the lowercase input.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_domain     TEXT;
  v_superadmin BOOLEAN;
BEGIN
  -- Determine if superadmin (passed in raw_user_meta_data)
  v_superadmin := (COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'superadmin');

  -- Case 1: Superadmins always go to the System tenant
  IF v_superadmin THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = '__system__'
    LIMIT 1;
    v_tenant_id := COALESCE(v_tenant_id, '00000000-0000-0000-0000-000000000001'::UUID);
  ELSE
    -- Case 2: Normal users (Students, Guards, Admins)
    -- Find tenant by email domain. 
    -- We assume domains in the table are stored in lowercase for efficiency.
    v_domain := LOWER(SPLIT_PART(NEW.email, '@', 2));

    -- Check if ANY element in the domains array matches v_domain
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE status IN ('active', 'trial')
      AND v_domain = ANY(domains)
    LIMIT 1;

    -- Case 3: Fallback — if no match, use the 'default' tenant
    IF v_tenant_id IS NULL THEN
      SELECT id INTO v_tenant_id
      FROM public.tenants
      WHERE slug = 'default'
      LIMIT 1;
    END IF;
  END IF;

  -- Ensure we have a tenant_id (absolute fallback)
  IF v_tenant_id IS NULL THEN
     -- This shouldn't happen if 'default' exists, but let's be safe
     v_tenant_id := '00000000-0000-0000-0000-000000000000'::UUID; -- Null tenant if all else fails
  END IF;

  -- Upsert into profiles
  INSERT INTO public.profiles (id, role, full_name, email, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    v_tenant_id
  )
  ON CONFLICT (id) DO UPDATE 
  SET tenant_id = EXCLUDED.tenant_id,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name;

  -- Create student state row if the user is a student
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO public.student_states (student_id, tenant_id, current_state)
    VALUES (NEW.id, v_tenant_id, 'inside')
    ON CONFLICT (student_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

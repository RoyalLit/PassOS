-- ============================================================
-- PassOS Migration: Robust Identity Metadata Synchronization
-- Ensures public.profiles and auth.users metadata are always in sync.
-- Also repairs all existing users retroactively.
-- ============================================================

BEGIN;

-- 1. Create a function to sync profile changes to auth.users metadata
-- SECURITY DEFINER allows this function to bypass RLS and update auth schema
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    raw_user_meta_data || 
    jsonb_build_object(
      'role', NEW.role,
      'full_name', NEW.full_name,
      'tenant_id', NEW.tenant_id
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on public.profiles
DROP TRIGGER IF EXISTS on_profile_update_sync_auth ON public.profiles;
CREATE TRIGGER on_profile_update_sync_auth
  AFTER UPDATE OF role, full_name, tenant_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth();

-- 3. REPAIR: One-time sync for all existing users
-- This ensures the Warden and any other miss-synced users are fixed immediately.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role, full_name, tenant_id FROM public.profiles LOOP
    UPDATE auth.users
    SET raw_user_meta_data = 
      raw_user_meta_data || 
      jsonb_build_object(
        'role', r.role,
        'full_name', r.full_name,
        'tenant_id', r.tenant_id
      )
    WHERE id = r.id;
  END LOOP;
END $$;

COMMIT;

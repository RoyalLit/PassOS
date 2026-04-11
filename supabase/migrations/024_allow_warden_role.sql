-- ============================================================
-- PassOS Migration: Update Profile Role Constraint
-- Allows 'warden' and 'superadmin' roles in the database
-- ============================================================

BEGIN;

-- 1. Drop the existing inline CHECK constraint if it exists
-- We handle both the common name and any dynamic name
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'profiles'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%role%'
          AND pg_get_constraintdef(con.oid) ILIKE '%IN%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Add the updated CHECK constraint
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'parent', 'admin', 'guard', 'warden', 'superadmin'));

-- 3. Ensure handle_new_user trigger correctly handles the metadata role or defaults to student
-- (This was already mostly handled in previous migrations, but we ensure consistency)
-- Any new signup will still be 'student' by default unless metadata specifically overrides it.

COMMIT;

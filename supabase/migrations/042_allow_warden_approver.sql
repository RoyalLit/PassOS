-- ============================================================
-- PassOS Migration: Update Approver Type Constraint
-- Allows 'warden' role to submit decisions in the approvals table
-- ============================================================

BEGIN;

-- 1. Identify and drop the existing check constraint on approver_type
-- We use a dynamic lookup because constraint names can vary
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
          AND rel.relname = 'approvals'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%approver_type%'
          AND pg_get_constraintdef(con.oid) ILIKE '%IN%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.approvals DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Add the updated CHECK constraint including 'warden'
ALTER TABLE public.approvals 
  ADD CONSTRAINT approvals_approver_type_check 
  CHECK (approver_type IN ('parent', 'admin', 'warden', 'system'));

COMMIT;

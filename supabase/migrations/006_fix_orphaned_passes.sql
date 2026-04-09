-- ============================================================
-- PassOS Migration 006: Fix Orphaned Passes + CASCADE Deletes
-- ============================================================
-- Fix #1: Guard scan "Unknown User"
--   - When a student profile is deleted (via admin), passes with dangling
--     student_id become orphaned. The scan query's `pass.student` join
--     returns null → UI shows "Unknown User".
--   - Fix: (a) Add ON DELETE CASCADE so future profile deletions cascade
--     to passes automatically. (b) Clean up any existing orphaned passes.
--
-- Fix #13: User deletion orphans passes
--   - Admin deleting a user via `deleteUser()` cascades to auth.users →
--     profile deleted → passes.student_id points to nothing.
--   - Fix: Same ON DELETE CASCADE ensures cascading deletes going forward.
--     Also adds a pre-delete cleanup trigger on profiles to remove passes
--     before the profile is deleted (preserves passes for forensics; if you
--     want hard-delete, swap to CASCADE in the FK instead).
-- ============================================================

BEGIN;

-- 1. Remove the old (non-cascading) FK on passes.student_id
--    We must drop FK constraints first. The FK is unnamed in 001_initial_schema
--    so Postgres auto-named it. Let's find and drop it.
ALTER TABLE public.passes
  DROP CONSTRAINT IF EXISTS passes_student_id_fkey;

-- 2. Re-add with ON DELETE CASCADE
ALTER TABLE public.passes
  ADD CONSTRAINT passes_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 3. Also cascade on passes.request_id (if request is deleted, pass goes too)
ALTER TABLE public.passes
  DROP CONSTRAINT IF EXISTS passes_request_id_fkey;
ALTER TABLE public.passes
  ADD CONSTRAINT passes_request_id_fkey
  FOREIGN KEY (request_id)
  REFERENCES public.pass_requests(id)
  ON DELETE CASCADE;

-- 4. Clean up any orphaned passes already in the DB
--    (passes whose student_id no longer exists in profiles)
DELETE FROM public.passes
WHERE student_id NOT IN (SELECT id FROM public.profiles);

-- 5. Audit log for each orphaned pass cleaned up (as "delete" on passes)
DO $$
DECLARE
  orphaned RECORD;
BEGIN
  -- Re-fetch what we're deleting for audit trail
  FOR orphaned IN
    SELECT id, student_id FROM public.passes
    WHERE student_id NOT IN (SELECT id FROM public.profiles)
  LOOP
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data)
    VALUES (
      'delete',
      'passes',
      orphaned.id,
      jsonb_build_object(
        'reason', 'orphaned_cleanup',
        'student_id', orphaned.student_id,
        'cleaned_at', NOW()
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Also clean orphaned pass_scans (scans referencing deleted passes)
--    We drop the pass_id NOT NULL constraint (already done in 004) but
--    we need to remove scans for orphaned passes
DELETE FROM public.pass_scans
WHERE pass_id NOT IN (SELECT id FROM public.passes);

-- 7. Clean student_states referencing deleted profiles
DELETE FROM public.student_states
WHERE student_id NOT IN (SELECT id FROM public.profiles);

COMMIT;

-- 8. Add a safety trigger: when a profile is deleted, archive their passes
--    before the CASCADE FK removes them (avoids silent data loss)
CREATE OR REPLACE FUNCTION public.archive_passes_on_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all passes being deleted so they're auditable
  INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data)
  SELECT
    'delete',
    'passes',
    p.id,
    to_jsonb(p) || jsonb_build_object('deleted_by_profile_cascade', true, 'deleted_at', NOW())
  FROM public.passes p
  WHERE p.student_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS archive_passes_on_profile_delete ON public.profiles;
CREATE TRIGGER archive_passes_on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.archive_passes_on_profile_delete();

-- ============================================================
-- PassOS Migration 010: Backfill student_states + Fix Unknown
-- ============================================================
-- Many students have no student_states row because:
--   (a) handle_new_user() trigger was added later in development
--   (b) Students created via admin API may not have triggered it
-- As a result, the admin students page shows "unknown" for everyone.
--
-- This migration:
--   1. Creates student_states rows for all students who lack one
--   2. Infers initial state from the most recent pass if available:
--      - Has active/used_exit pass + last scan was entry  → inside
--      - Has active/used_exit pass + last scan was exit   → outside
--      - Has used_entry pass (no active)                   → inside
--      - No pass record at all                            → inside (default)
-- ============================================================

BEGIN;

-- Insert missing student_states rows for students who don't have one.
-- Use the most recent pass to infer starting state.
INSERT INTO public.student_states (student_id, current_state, updated_at)
SELECT
  p.id,
  COALESCE(
    -- Infer from most recent pass
    (
      SELECT CASE
        WHEN s.scan_result IN ('valid', 'late_entry') AND s.scan_type = 'entry' THEN 'inside'
        WHEN s.scan_result IN ('valid', 'late_entry') AND s.scan_type = 'exit'  THEN 'outside'
        WHEN pa.status IN ('active', 'used_exit') AND
             EXISTS (
               SELECT 1 FROM public.pass_scans ps2
               WHERE ps2.pass_id = pa.id
               ORDER BY ps2.created_at DESC LIMIT 1
             ) THEN 'outside'
        WHEN pa.status IN ('used_entry') THEN 'inside'
        WHEN pa.status IN ('active', 'used_exit') THEN 'inside'
        ELSE 'inside'
      END
      FROM public.passes pa
      JOIN public.pass_scans s ON s.pass_id = pa.id
      WHERE pa.student_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    'inside'  -- Default: assume new students are on campus
  ) AS current_state,
  NOW()
FROM public.profiles p
WHERE p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.student_states ss WHERE ss.student_id = p.id
  );

COMMIT;

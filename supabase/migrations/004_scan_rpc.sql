-- ============================================================
-- PassOS Migration 004: Atomic Scan Processing RPC
-- ============================================================
-- Purpose:
--   Replace 3 sequential writes in /api/scan/route.ts with a
--   single atomic Postgres transaction. This:
--   1. Eliminates race conditions (double-scan exploit)  
--   2. Reduces round-trips from 3 → 1 on every scan event
--   3. Guarantees all-or-nothing consistency (no partial writes)
-- ============================================================

-- Fix 1: Make pass_scans.pass_id nullable to allow logging
--        invalid signatures where no pass record exists
ALTER TABLE public.pass_scans
  ALTER COLUMN pass_id DROP NOT NULL;

-- Fix 2: Add 'late_entry' to the scan_result check constraint
--        (the app was already producing this value but the DB rejected it)
ALTER TABLE public.pass_scans
  DROP CONSTRAINT IF EXISTS pass_scans_scan_result_check;

ALTER TABLE public.pass_scans
  ADD CONSTRAINT pass_scans_scan_result_check
  CHECK (scan_result IN (
    'valid', 'late_entry', 'expired', 'already_used',
    'revoked', 'invalid_signature', 'error'
  ));

-- ============================================================
-- FUNCTION: process_scan
-- Called from /api/scan/route.ts on a successful scan.
-- Atomically:
--   1. Locks the pass row (prevents concurrent double-scans)
--   2. Updates pass status + timestamps
--   3. Upserts student_states location
--   4. Inserts the scan audit log
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_scan(
  p_pass_id     UUID,
  p_guard_id    UUID,
  p_scan_type   TEXT,   -- 'exit' | 'entry'
  p_scan_result TEXT,   -- 'valid' | 'late_entry'
  p_geo_lat     DOUBLE PRECISION DEFAULT NULL,
  p_geo_lng     DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- 1. Lock the pass row to prevent concurrent double-scans.
  --    If two guards scan simultaneously, the second will wait
  --    for the first transaction to commit before proceeding.
  SELECT student_id
    INTO v_student_id
    FROM public.passes
   WHERE id = p_pass_id
     FOR UPDATE;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Pass not found: %', p_pass_id;
  END IF;

  -- 2a. EXIT: mark pass as used_exit, record exit timestamp
  IF p_scan_type = 'exit' THEN
    UPDATE public.passes
       SET status  = 'used_exit',
           exit_at = NOW()
     WHERE id = p_pass_id;

    INSERT INTO public.student_states
      (student_id, current_state, last_exit, updated_at)
    VALUES
      (v_student_id, 'outside', NOW(), NOW())
    ON CONFLICT (student_id) DO UPDATE
      SET current_state = 'outside',
          last_exit     = NOW(),
          updated_at    = NOW();

  -- 2b. ENTRY: mark pass as used_entry, clear active_pass_id
  ELSIF p_scan_type = 'entry' THEN
    UPDATE public.passes
       SET status   = 'used_entry',
           entry_at = NOW()
     WHERE id = p_pass_id;

    INSERT INTO public.student_states
      (student_id, current_state, active_pass_id, last_entry, updated_at)
    VALUES
      (v_student_id, 'inside', NULL, NOW(), NOW())
    ON CONFLICT (student_id) DO UPDATE
      SET current_state  = 'inside',
          active_pass_id = NULL,
          last_entry     = NOW(),
          updated_at     = NOW();
  ELSE
    RAISE EXCEPTION 'Invalid scan_type: %', p_scan_type;
  END IF;

  -- 3. Insert the immutable scan audit log
  INSERT INTO public.pass_scans
    (pass_id, guard_id, scan_type, scan_result, geo_lat, geo_lng, device_info)
  VALUES
    (p_pass_id, p_guard_id, p_scan_type, p_scan_result,
     p_geo_lat, p_geo_lng,
     jsonb_build_object('timestamp', (extract(epoch from now()) * 1000)::bigint));

  RETURN jsonb_build_object('success', true, 'student_id', v_student_id);
END;
$$;

-- Grant execute to service role only (used by admin client in the API)
REVOKE ALL ON FUNCTION public.process_scan FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_scan TO service_role;

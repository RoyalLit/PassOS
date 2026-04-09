-- ============================================================
-- PassOS Migration 008: QR Nonce Replay Prevention (v2)
-- ============================================================
-- Fix #8: The qr_nonce stored in passes was never validated on scan.
--
-- v1 (REVERTED): Blocked ANY second scan, breaking the normal exit→entry flow.
-- v2: Distinguish exit-nonce vs entry-nonce. A valid QR allows exactly ONE
-- exit AND ONE entry — but blocks the same direction twice (screenshot exploit).
-- E.g., student exits, gives phone to friend → second exit blocked.
--     Student exits, returns, scans entry → entry allowed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.used_qr_nonces (
  nonce       TEXT NOT NULL,
  scan_type   TEXT NOT NULL CHECK (scan_type IN ('exit', 'entry')),
  used_at     TIMESTAMPTZ DEFAULT NOW(),
  used_by     UUID REFERENCES public.profiles(id),
  PRIMARY KEY (nonce, scan_type)
);

CREATE INDEX IF NOT EXISTS idx_used_nonces_at ON public.used_qr_nonces(used_at);

-- Update process_scan RPC to check nonce per scan type
CREATE OR REPLACE FUNCTION public.process_scan(
  p_pass_id     UUID,
  p_guard_id    UUID,
  p_scan_type   TEXT,
  p_scan_result TEXT,
  p_geo_lat     DOUBLE PRECISION DEFAULT NULL,
  p_geo_lng     DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_nonce      TEXT;
BEGIN
  -- 0. Lock the pass row to prevent concurrent double-scans.
  SELECT student_id, qr_nonce
    INTO v_student_id, v_nonce
    FROM public.passes
   WHERE id = p_pass_id
     FOR UPDATE;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Pass not found: %', p_pass_id;
  END IF;

  -- Replay check: reject if the SAME scan_type was already done with this nonce.
  -- E.g., two exit scans (screenshot sharing) are blocked.
  -- But exit then entry, or entry then exit, are both allowed (composite PK).
  IF EXISTS (
    SELECT 1 FROM public.used_qr_nonces
     WHERE nonce = v_nonce AND scan_type = p_scan_type
  ) THEN
    RAISE EXCEPTION 'QR already scanned for % — possible replay attack (nonce: %)', p_scan_type, v_nonce;
  END IF;

  -- Record nonce + scan_type pair before state changes
  INSERT INTO public.used_qr_nonces (nonce, scan_type, used_by)
  VALUES (v_nonce, p_scan_type, p_guard_id);

  -- 1a. EXIT: mark pass as used_exit, record exit timestamp
  IF p_scan_type = 'exit' THEN
    UPDATE public.passes
       SET status  = 'used_exit',
           exit_at = NOW()
     WHERE id = p_pass_id;

    -- Upsert student_states. Use explicit INSERT then UPDATE (not INSERT...ON CONFLICT
    -- DO UPDATE) because ON CONFLICT can silently no-op if the row doesn't exist AND
    -- there is no unique index on student_id (it IS the PK, so it should work — but
    -- explicit approach is more robust for edge cases like partially-applied migrations).
    -- Check if row exists first, then insert or update accordingly.
    IF NOT EXISTS (SELECT 1 FROM public.student_states WHERE student_id = v_student_id) THEN
      INSERT INTO public.student_states (student_id, current_state, last_exit, updated_at)
      VALUES (v_student_id, 'outside', NOW(), NOW());
    ELSE
      UPDATE public.student_states
         SET current_state = 'outside',
             last_exit     = NOW(),
             updated_at    = NOW()
       WHERE student_id = v_student_id;
    END IF;

  -- 1b. ENTRY: mark pass as used_entry, clear active_pass_id
  ELSIF p_scan_type = 'entry' THEN
    UPDATE public.passes
       SET status   = 'used_entry',
           entry_at = NOW()
     WHERE id = p_pass_id;

    IF NOT EXISTS (SELECT 1 FROM public.student_states WHERE student_id = v_student_id) THEN
      INSERT INTO public.student_states (student_id, current_state, active_pass_id, last_entry, updated_at)
      VALUES (v_student_id, 'inside', NULL, NOW(), NOW());
    ELSE
      UPDATE public.student_states
         SET current_state  = 'inside',
             active_pass_id = NULL,
             last_entry     = NOW(),
             updated_at     = NOW()
       WHERE student_id = v_student_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid scan_type: %', p_scan_type;
  END IF;

  -- 2. Insert the immutable scan audit log
  INSERT INTO public.pass_scans
    (pass_id, guard_id, scan_type, scan_result, geo_lat, geo_lng, device_info)
  VALUES
    (p_pass_id, p_guard_id, p_scan_type, p_scan_result,
     p_geo_lat, p_geo_lng,
     jsonb_build_object('timestamp', (extract(epoch from now()) * 1000)::bigint));

  RETURN jsonb_build_object('success', true, 'student_id', v_student_id);
END;
$$;

-- Re-grant (function was replaced)
GRANT EXECUTE ON FUNCTION public.process_scan TO service_role;

-- ============================================================
-- PassOS Migration 008: QR Nonce Replay Prevention
-- ============================================================
-- Fix #8: The qr_nonce stored in passes was never validated on scan.
-- A captured QR JWT could be replayed (e.g. screenshot shared) to
-- gain entry/exit. Since the JWT itself is valid until expiry,
-- only the nonce prevents reuse.
--
-- Solution: Track each used nonce in a dedicated table. On scan,
-- the process_scan RPC checks the nonce hasn't been consumed yet,
-- marks it consumed atomically, and rejects any replay attempt.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.used_qr_nonces (
  nonce       TEXT PRIMARY KEY,
  used_at     TIMESTAMPTZ DEFAULT NOW(),
  used_by     UUID REFERENCES public.profiles(id),
  scan_type   TEXT NOT NULL CHECK (scan_type IN ('exit', 'entry'))
);

CREATE INDEX IF NOT EXISTS idx_used_nonces_at ON public.used_qr_nonces(used_at);

-- Update process_scan RPC to check nonce hasn't been used (replay attack prevention)
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

  -- Replay check: reject if this nonce was already used for a scan.
  -- This prevents screenshot / recording attacks where a valid QR is replayed.
  IF EXISTS (SELECT 1 FROM public.used_qr_nonces WHERE nonce = v_nonce) THEN
    RAISE EXCEPTION 'QR code already scanned — possible replay attack (nonce: %)', v_nonce;
  END IF;

  -- Record nonce usage before any state changes
  INSERT INTO public.used_qr_nonces (nonce, used_by, scan_type)
  VALUES (v_nonce, p_guard_id, p_scan_type);

  -- 1a. EXIT: mark pass as used_exit, record exit timestamp
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

  -- 1b. ENTRY: mark pass as used_entry, clear active_pass_id
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

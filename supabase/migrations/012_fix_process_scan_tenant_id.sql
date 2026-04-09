-- ============================================================
-- PassOS Migration 012: Fix tenant_id in process_scan RPC
-- ============================================================
-- The process_scan RPC inserts into student_states without tenant_id,
-- which fails since tenant_id is NOT NULL.
-- This migration updates the RPC to include tenant_id.
-- ============================================================

BEGIN;

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
  v_tenant_id  UUID;
  v_nonce      TEXT;
BEGIN
  -- 0. Lock the pass row to prevent concurrent double-scans.
  SELECT student_id, tenant_id, qr_nonce
    INTO v_student_id, v_tenant_id, v_nonce
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

    -- Upsert student_states with tenant_id
    IF NOT EXISTS (SELECT 1 FROM public.student_states WHERE student_id = v_student_id) THEN
      INSERT INTO public.student_states (student_id, tenant_id, current_state, last_exit, updated_at)
      VALUES (v_student_id, v_tenant_id, 'outside', NOW(), NOW());
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
      INSERT INTO public.student_states (student_id, tenant_id, current_state, active_pass_id, last_entry, updated_at)
      VALUES (v_student_id, v_tenant_id, 'inside', NULL, NOW(), NOW());
    ELSE
      UPDATE public.student_states
         SET current_state  = 'inside',
             active_pass_id = NULL,
             last_entry    = NOW(),
             updated_at    = NOW()
       WHERE student_id = v_student_id;
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid scan_type: %. Must be exit or entry.', p_scan_type;
  END IF;

  -- 2. Record the scan in pass_scans with tenant_id
  INSERT INTO public.pass_scans (
    pass_id, tenant_id, guard_id, scan_type,
    geo_lat, geo_lng, scan_result
  ) VALUES (
    p_pass_id, v_tenant_id, p_guard_id, p_scan_type,
    p_geo_lat, p_geo_lng, p_scan_result
  );

  -- 3. Return updated pass state
  RETURN jsonb_build_object(
    'pass_id',      p_pass_id,
    'scan_type',    p_scan_type,
    'scan_result',  p_scan_result,
    'student_id',   v_student_id,
    'timestamp',    NOW()
  );

END;
$$ LANGUAGE plpgsql;

-- Ensure service_role can execute the updated function
GRANT EXECUTE ON FUNCTION public.process_scan TO service_role;

COMMIT;

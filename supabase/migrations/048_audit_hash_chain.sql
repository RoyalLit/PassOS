-- ============================================================
-- PassOS Migration 048: Audit Log Hash Chain Integrity
-- ============================================================
-- Adds SHA-256 hash chain to audit_logs for tamper-evident,
-- forensic-grade integrity verification.
--
-- Each record stores:
--   record_hash: SHA-256 of its own content + prev_hash
--   prev_hash:   record_hash of the preceding audit entry
--
-- The chain is scoped per-tenant so each institution's audit
-- trail is independently verifiable.
--
-- Tampering with ANY record invalidates all subsequent hashes,
-- making unauthorised modification detectable.
-- ============================================================

BEGIN;

-- 1. Add hash columns to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS record_hash TEXT,
  ADD COLUMN IF NOT EXISTS prev_hash   TEXT;

-- 2. Function to compute the hash of an audit record
-- Deterministic: concatenates all immutable fields + prev_hash, then SHA-256s.
CREATE OR REPLACE FUNCTION public.compute_audit_hash(
  p_id          UUID,
  p_actor_id    UUID,
  p_tenant_id   UUID,
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_old_data    JSONB,
  p_new_data    JSONB,
  p_ip_address  INET,
  p_user_agent  TEXT,
  p_created_at  TIMESTAMPTZ,
  p_prev_hash   TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
BEGIN
  -- Build a deterministic content string from all record fields.
  -- COALESCE ensures NULLs don't break concatenation.
  v_content := CONCAT_WS('|',
    COALESCE(p_id::TEXT, ''),
    COALESCE(p_actor_id::TEXT, ''),
    COALESCE(p_tenant_id::TEXT, ''),
    COALESCE(p_action, ''),
    COALESCE(p_entity_type, ''),
    COALESCE(p_entity_id::TEXT, ''),
    COALESCE(p_old_data::TEXT, ''),
    COALESCE(p_new_data::TEXT, ''),
    COALESCE(p_ip_address::TEXT, ''),
    COALESCE(p_user_agent, ''),
    COALESCE(p_created_at::TEXT, ''),
    COALESCE(p_prev_hash, 'GENESIS')
  );

  RETURN encode(digest(v_content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger function: auto-compute hash chain on INSERT
CREATE OR REPLACE FUNCTION public.audit_hash_chain_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_hash TEXT;
BEGIN
  -- Find the most recent record in the same tenant's chain.
  -- Per-tenant chains allow independent verification per institution.
  SELECT record_hash INTO v_prev_hash
  FROM public.audit_logs
  WHERE tenant_id = NEW.tenant_id
    AND record_hash IS NOT NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  -- Genesis record has no predecessor
  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');

  -- Compute this record's hash
  NEW.record_hash := public.compute_audit_hash(
    NEW.id,
    NEW.actor_id,
    NEW.tenant_id,
    NEW.action,
    NEW.entity_type,
    NEW.entity_id,
    NEW.old_data,
    NEW.new_data,
    NEW.ip_address,
    NEW.user_agent,
    NEW.created_at,
    NEW.prev_hash
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach BEFORE INSERT so the hash is computed before the row is written
DROP TRIGGER IF EXISTS audit_hash_chain ON public.audit_logs;
CREATE TRIGGER audit_hash_chain
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_hash_chain_trigger();

-- 4. Verification function: validate the entire chain for a tenant
-- Returns the number of broken links (0 = fully intact).
CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_tenant_id UUID)
RETURNS TABLE(
  total_records  BIGINT,
  verified       BIGINT,
  broken_links   BIGINT,
  first_broken   UUID
) AS $$
DECLARE
  v_total        BIGINT := 0;
  v_verified     BIGINT := 0;
  v_broken       BIGINT := 0;
  v_first_broken UUID   := NULL;
  v_row          RECORD;
  v_expected     TEXT;
BEGIN
  FOR v_row IN
    SELECT *
    FROM public.audit_logs
    WHERE tenant_id = p_tenant_id
      AND record_hash IS NOT NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    v_total := v_total + 1;

    v_expected := public.compute_audit_hash(
      v_row.id,
      v_row.actor_id,
      v_row.tenant_id,
      v_row.action,
      v_row.entity_type,
      v_row.entity_id,
      v_row.old_data,
      v_row.new_data,
      v_row.ip_address,
      v_row.user_agent,
      v_row.created_at,
      v_row.prev_hash
    );

    IF v_expected = v_row.record_hash THEN
      v_verified := v_verified + 1;
    ELSE
      v_broken := v_broken + 1;
      IF v_first_broken IS NULL THEN
        v_first_broken := v_row.id;
      END IF;
    END IF;
  END LOOP;

  total_records := v_total;
  verified      := v_verified;
  broken_links  := v_broken;
  first_broken  := v_first_broken;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service_role and superadmins should verify chains
REVOKE ALL ON FUNCTION public.verify_audit_chain FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain TO service_role;

-- 5. Backfill existing audit records with hashes
-- Process in chronological order per tenant to build valid chains.
DO $$
DECLARE
  v_tenant   UUID;
  v_row      RECORD;
  v_prev     TEXT := 'GENESIS';
  v_hash     TEXT;
BEGIN
  -- Process each tenant separately
  FOR v_tenant IN
    SELECT DISTINCT tenant_id FROM public.audit_logs WHERE record_hash IS NULL
  LOOP
    v_prev := 'GENESIS';

    FOR v_row IN
      SELECT * FROM public.audit_logs
      WHERE tenant_id = v_tenant AND record_hash IS NULL
      ORDER BY created_at ASC, id ASC
    LOOP
      v_hash := public.compute_audit_hash(
        v_row.id,
        v_row.actor_id,
        v_row.tenant_id,
        v_row.action,
        v_row.entity_type,
        v_row.entity_id,
        v_row.old_data,
        v_row.new_data,
        v_row.ip_address,
        v_row.user_agent,
        v_row.created_at,
        v_prev
      );

      UPDATE public.audit_logs
      SET record_hash = v_hash,
          prev_hash   = v_prev
      WHERE id = v_row.id;

      v_prev := v_hash;
    END LOOP;
  END LOOP;
END;
$$;

-- 6. Index for efficient chain traversal
CREATE INDEX IF NOT EXISTS idx_audit_hash_chain
  ON public.audit_logs(tenant_id, created_at ASC, id ASC)
  WHERE record_hash IS NOT NULL;

COMMIT;

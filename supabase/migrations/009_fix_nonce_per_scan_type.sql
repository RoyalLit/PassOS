-- ============================================================
-- PassOS Migration 009: Fix Nonce Replay — Per-Scan-Type
-- ============================================================
-- Migration 008 v1 used nonce as a simple primary key, blocking
-- ANY second scan (exit→entry or entry→exit both blocked).
-- This fixes it: composite PK (nonce, scan_type) so exit AND entry
-- are each allowed once, but same-direction replay is blocked.
-- ============================================================

BEGIN;

-- Drop the old PK constraint (nonce-only)
ALTER TABLE public.used_qr_nonces
  DROP CONSTRAINT IF EXISTS used_qr_nonces_pkey;

-- Add composite PK: nonce + scan_type
ALTER TABLE public.used_qr_nonces
  ADD CONSTRAINT used_qr_nonces_pkey
  PRIMARY KEY (nonce, scan_type);

COMMIT;

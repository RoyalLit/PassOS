-- ============================================================
-- PassOS Migration 013: Brand Assets for Multi-Tenancy
-- ============================================================
-- Adds brand color columns to the tenants table.
-- ============================================================

BEGIN;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS brand_primary   TEXT,
  ADD COLUMN IF NOT EXISTS brand_secondary TEXT;

-- Update the default tenant with some colors (optional)
UPDATE public.tenants
   SET brand_primary = '#2563eb', -- PassOS Blue
       brand_secondary = '#3b82f6'
 WHERE slug = 'default';

COMMIT;

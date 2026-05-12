-- ============================================================
-- PassOS Migration: Add geofence_strict setting
-- Controls whether to block requests from outside campus vs just warn admins
-- ============================================================

BEGIN;

-- Add geofence_strict column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS geofence_strict BOOLEAN DEFAULT false;

-- Update existing rows
UPDATE public.app_settings 
SET geofence_strict = false 
WHERE geofence_strict IS NULL;

-- Set to non-null after update
ALTER TABLE public.app_settings 
ALTER COLUMN geofence_strict SET NOT NULL;

COMMIT;
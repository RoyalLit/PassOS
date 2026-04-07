-- ============================================================
-- DYNAMIC GATEPASS REASONS
-- ============================================================

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS gatepass_reasons JSONB DEFAULT '{
  "day_outing": [
    "Personal work",
    "Medical appointment",
    "Family visit",
    "Shopping / errands",
    "Academic (exam, college work outside campus)"
  ],
  "overnight": [
    "Home visit",
    "Family function/event",
    "Medical (extended)",
    "Tournament / competition"
  ]
}'::jsonb;

-- Update the existing row with these defaults if it exists
UPDATE public.app_settings 
SET gatepass_reasons = '{
  "day_outing": [
    "Personal work",
    "Medical appointment",
    "Family visit",
    "Shopping / errands",
    "Academic (exam, college work outside campus)"
  ],
  "overnight": [
    "Home visit",
    "Family function/event",
    "Medical (extended)",
    "Tournament / competition"
  ]
}'::jsonb
WHERE id IS NOT NULL;

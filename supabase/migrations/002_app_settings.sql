-- ============================================================
-- GLOBAL APP SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofencing_enabled    BOOLEAN DEFAULT FALSE,
  campus_lat            DOUBLE PRECISION DEFAULT 28.6139,
  campus_lng            DOUBLE PRECISION DEFAULT 77.2090,
  campus_radius_meters  DOUBLE PRECISION DEFAULT 500,
  parent_approval_mode  TEXT DEFAULT 'smart' CHECK (parent_approval_mode IN ('none', 'smart', 'all')),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_by            UUID REFERENCES public.profiles(id)
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS one_row_only ON public.app_settings ((id IS NOT NULL));

-- Seed default settings
INSERT INTO public.app_settings (geofencing_enabled, campus_lat, campus_lng, campus_radius_meters, parent_approval_mode)
VALUES (FALSE, 28.6139, 77.2090, 500, 'smart')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings
DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON public.app_settings;
CREATE POLICY "Allow read access for all authenticated users"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Allow update access for admins only" ON public.app_settings;
CREATE POLICY "Allow update access for admins only"
ON public.app_settings FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

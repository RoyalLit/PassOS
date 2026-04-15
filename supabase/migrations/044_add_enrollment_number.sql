-- Migration: Add enrollment_number to profiles
-- Description: Supports tracking institutional roll numbers or enrollment IDs uniquely per tenant.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'enrollment_number') THEN
    ALTER TABLE profiles ADD COLUMN enrollment_number VARCHAR(100) DEFAULT NULL;
  END IF;
END $$;

-- Create an index to quickly lookup students by their enrollment number during Guard manual entry
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_enrollment 
ON profiles(tenant_id, enrollment_number) 
WHERE enrollment_number IS NOT NULL;

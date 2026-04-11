-- Add missing get_uuid RPC function

CREATE OR REPLACE FUNCTION public.get_uuid()
RETURNS UUID AS $$
  SELECT gen_random_uuid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

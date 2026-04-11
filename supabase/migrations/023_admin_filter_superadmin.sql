-- ============================================================
-- Fix: Admin cannot see superadmin users
-- ============================================================

-- Update the SELECT policy to filter superadmins from regular admins
DROP POLICY IF EXISTS "profiles_select_authenticated_v2" ON public.profiles;

CREATE POLICY "profiles_select_authenticated_v2" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  is_superadmin() = true
  OR 
  (current_user_role() = 'admin' AND role != 'superadmin')
  OR 
  id = auth.uid()
  OR 
  current_user_role() IS NULL
);

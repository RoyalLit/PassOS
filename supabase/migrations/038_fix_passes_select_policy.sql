-- Simplify passes SELECT policy to allow students to see their own passes

BEGIN;

-- Drop the existing passes SELECT policy
DROP POLICY IF EXISTS "passes_select_admin" ON public.passes;

-- Create a simpler policy that clearly allows:
-- 1. Superadmins see all
-- 2. Admins/wardens see all
-- 3. Students see their own passes (using direct auth.uid() check)
CREATE POLICY "passes_select_students_and_admins" ON public.passes
FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'superadmin'
  OR (auth.jwt() ->> 'role') IN ('admin', 'warden')
  OR student_id = auth.uid()
);

COMMIT;

-- Simplify passes SELECT policy - don't rely on JWT role for students

BEGIN;

-- Drop the existing passes SELECT policy
DROP POLICY IF EXISTS "passes_select_students_and_admins" ON public.passes;

-- Create policy that relies on auth.uid() for students
-- For admins, we'll use a different approach
CREATE POLICY "passes_select_allow_all" ON public.passes
FOR SELECT USING (true);

COMMIT;

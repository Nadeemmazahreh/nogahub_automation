-- Allow anonymous access to equipment and projects
-- Since we're using environment-based auth (not Supabase Auth),
-- we need to allow anon access and rely on application-layer auth

-- ========================================
-- EQUIPMENT TABLE - Allow public read access
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view equipment" ON public.equipment;

CREATE POLICY "Allow public read access to equipment"
  ON public.equipment
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ========================================
-- PROJECTS TABLE - Allow anon access for CRUD
-- ========================================
-- Drop old authenticated-only policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete all projects" ON public.projects;

-- Allow anon/authenticated to do everything with projects
-- Authorization is handled at application layer via simpleAuth
CREATE POLICY "Allow all operations on projects"
  ON public.projects
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

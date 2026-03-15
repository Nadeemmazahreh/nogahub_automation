-- Row Level Security (RLS) Policies
-- CRITICAL: These policies enforce data access permissions at the database level

-- ========================================
-- ENABLE RLS ON ALL TABLES
-- ========================================
-- RLS MUST be enabled to prevent unauthorized data access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ========================================
-- HELPER FUNCTIONS FOR RLS
-- ========================================
-- Check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users
    WHERE id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================

-- All authenticated users can view user profiles (for displaying project owners, etc.)
CREATE POLICY "Users can view all user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can insert new users (manual user creation)
CREATE POLICY "Only admins can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins can delete users
CREATE POLICY "Only admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ========================================
-- EQUIPMENT TABLE POLICIES
-- ========================================

-- All authenticated users can view equipment catalog
CREATE POLICY "Authenticated users can view equipment"
  ON public.equipment
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert equipment
CREATE POLICY "Only admins can insert equipment"
  ON public.equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins can update equipment
CREATE POLICY "Only admins can update equipment"
  ON public.equipment
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins can delete equipment
CREATE POLICY "Only admins can delete equipment"
  ON public.equipment
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ========================================
-- PROJECTS TABLE POLICIES
-- ========================================

-- Users can view their own projects, admins can view all projects
CREATE POLICY "Users can view own projects, admins view all"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- Users can insert their own projects
CREATE POLICY "Users can create own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own projects, admins can update all
CREATE POLICY "Users can update own projects, admins update all"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Users can delete their own projects, admins can delete all
CREATE POLICY "Users can delete own projects, admins delete all"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ========================================
-- ADDITIONAL SECURITY MEASURES
-- ========================================

-- Prevent non-admin users from changing their own role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is not admin and trying to change role
  IF NOT public.is_admin() AND NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.equipment TO authenticated;
GRANT ALL ON public.projects TO authenticated;

-- Grant sequence permissions (for auto-incrementing if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON POLICY "Users can view all user profiles" ON public.users IS
  'Allows authenticated users to view all profiles for displaying project owners';

COMMENT ON POLICY "Authenticated users can view equipment" ON public.equipment IS
  'Equipment catalog is read-only for all authenticated users';

COMMENT ON POLICY "Users can view own projects, admins view all" ON public.projects IS
  'Data isolation: users see only their projects, admins have full visibility';

COMMENT ON FUNCTION public.is_admin() IS
  'Helper function to check if current user has admin role';

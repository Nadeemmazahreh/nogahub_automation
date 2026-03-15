-- Initial Schema Migration for NogaHub Automation
-- Creates users, equipment, and projects tables

-- ========================================
-- USERS TABLE
-- ========================================
-- This table extends auth.users with application-specific data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ========================================
-- EQUIPMENT TABLE
-- ========================================
-- Stores sound equipment catalog with pricing
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  msrp_usd DECIMAL(10,2),
  dealer_usd DECIMAL(10,2) NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('void', 'accessory')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for equipment queries
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON public.equipment(code);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON public.equipment(is_active);

-- ========================================
-- PROJECTS TABLE
-- ========================================
-- Stores quotation/project data
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,

  -- Equipment and services (stored as JSON)
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  services JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_services JSONB DEFAULT '[]'::jsonb,
  custom_equipment JSONB DEFAULT '[]'::jsonb,

  -- Roles and pricing
  roles JSONB NOT NULL DEFAULT '{}'::jsonb,
  global_discount DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  include_tax BOOLEAN DEFAULT true,
  terms TEXT DEFAULT '',

  -- Calculation status
  is_calculated BOOLEAN DEFAULT false,
  calculation_results JSONB,

  -- Project type
  project_type TEXT CHECK (project_type IN ('soundDesign', 'noiseControl')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for projects queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON public.projects(project_type);

-- Full-text search index on project and client names
CREATE INDEX IF NOT EXISTS idx_projects_search ON public.projects
  USING GIN (to_tsvector('english', project_name || ' ' || client_name));

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================
COMMENT ON TABLE public.users IS 'Application users with roles and profiles';
COMMENT ON TABLE public.equipment IS 'Sound equipment catalog with pricing';
COMMENT ON TABLE public.projects IS 'Quotation projects with equipment and services';
COMMENT ON COLUMN public.projects.equipment IS 'Array of equipment items with quantities';
COMMENT ON COLUMN public.projects.services IS 'Service configurations and pricing';
COMMENT ON COLUMN public.projects.calculation_results IS 'Cached calculation results';
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
-- Seed Equipment Catalog
-- 31 items of sound equipment with pricing and specifications

INSERT INTO public.equipment (code, name, dealer_usd, msrp_usd, weight, category) VALUES
  -- Void Category Equipment
  ('IT1000', 'Cyclone 4', 181.91, 330.75, 1.3, 'void'),
  ('IT1001', 'Cirrus 6.1', 129.94, 236.25, 3.5, 'void'),
  ('IT1002', 'Indigo 6s', 511.85, 930.15, 5.2, 'void'),
  ('IT1003', 'Indigo Sub', 1013.51, 1842.75, 21, 'void'),
  ('IT1004', 'Air Vantage', 3441.49, 6257.25, 23.5, 'void'),
  ('IT1005', 'Airten V3', 2189.63, 3981.15, 20, 'void'),
  ('IT1006', 'Air 8', 816.01, 1483.65, 6.2, 'void'),
  ('IT1007', 'Venu 112', 593.26, 1078.65, 27, 'void'),
  ('IT1008', 'Venu 12', 575.44, 1046.25, 22, 'void'),
  ('IT1009', 'Venu 208', 504, 916.65, 20, 'void'),
  ('IT1010', 'Venu 212', 927.38, 1686.15, 47.5, 'void'),
  ('IT1011', 'Cyclone 8', 667.51, 1213.65, 14, 'void'),
  ('IT1012', 'Cyclone 55', 412.09, 749.25, 3.2, 'void'),
  ('IT1013', 'Cyclone 10', 835.31, 1518.75, 14.5, 'void'),
  ('IT1014', 'Cyclone Bass', 1216.96, 2212.65, 33.5, 'void'),
  ('IT1015', 'Bias Q1.5+', 1951.78, 3049.65, 7, 'void'),
  ('IT1016', 'Inca 500', 910.72, 1423, 2.8, 'void'),
  ('IT1017', 'Bias Q1+', 1614.82, 2523.15, 7, 'void'),
  ('IT1018', 'Bias Q2+', 2573.86, 4021.65, 7, 'void'),
  ('IT1019', 'Bias Q3+', 3481.06, 5439.15, 11.5, 'void'),
  ('IT1020', 'Bias D1', 1467.94, 2293.65, 7, 'void'),
  ('IT1021', 'Van Damm Cables 2 x 4mm', 7.05, 12.83, 0.25, 'void'),
  ('IT1022', 'Van Damm Cables 2 x 2.5mm', 4.08, 7.43, 0.25, 'void'),
  ('IT1023', 'Van Damm Cables 4 x 4mm', 9.28, 16.88, 0.25, 'void'),
  ('IT1024', 'Van Damm Cables 4 x 2.5mm', 5.57, 10.13, 0.25, 'void'),
  ('IT1025', 'WM Touch Screen', 316.22, 494.1, 1, 'void'),

  -- Accessory Category Equipment
  ('AC1006', 'CAT 6 Cables', 0.7, 1, 0.1, 'accessory'),
  ('AC1007', 'NetGear Switch', 550, 650, 0.1, 'accessory'),
  ('AC1008', 'Italy Power Cables 2x 4mm', 2.8, 4.5, 0.25, 'accessory'),
  ('AC1009', 'Italy Power Cables 2x 2.5mm', 1.6, 2.8, 0.25, 'accessory'),
  ('AC1010', 'AHM 16', 1500, 1500, 3.8, 'accessory'),
  ('AC1011', 'Scarlet 2i2', 300, 375, 0.5, 'accessory')
ON CONFLICT (code) DO NOTHING;

-- Verify equipment was seeded
DO $$
DECLARE
  equipment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO equipment_count FROM public.equipment;
  RAISE NOTICE 'Equipment seeding completed. Total equipment items: %', equipment_count;
END $$;

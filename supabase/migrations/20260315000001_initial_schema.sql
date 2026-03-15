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

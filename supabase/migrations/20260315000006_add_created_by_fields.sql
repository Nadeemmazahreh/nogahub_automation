-- Add created_by fields to projects table
-- Store creator info directly from simpleAuth without foreign key dependency

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS created_by_username TEXT,
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_created_by_email ON public.projects(created_by_email);

-- Add comment
COMMENT ON COLUMN public.projects.created_by_username IS 'Username from simpleAuth session';
COMMENT ON COLUMN public.projects.created_by_email IS 'Email from simpleAuth session';
COMMENT ON COLUMN public.projects.created_by_role IS 'Role from simpleAuth session (admin/user)';

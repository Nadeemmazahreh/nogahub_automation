-- Make user_id nullable for environment-based authentication
-- Since we're using simpleAuth (not database users), user_id cannot be populated
-- The created_by_* fields store the actual user information

-- Drop the foreign key constraint first
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Make user_id nullable
ALTER TABLE public.projects
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining why user_id is nullable
COMMENT ON COLUMN public.projects.user_id IS 'Optional user ID from auth.users. Nullable for environment-based auth. Use created_by_* fields for user info.';

CREATE TABLE public.quotations_legacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  equipment JSONB DEFAULT '[]'::jsonb,
  services JSONB DEFAULT '{}'::jsonb,
  custom_services JSONB DEFAULT '[]'::jsonb,
  custom_equipment JSONB DEFAULT '[]'::jsonb,
  roles JSONB DEFAULT '{}'::jsonb,
  global_discount DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  include_tax BOOLEAN DEFAULT TRUE,
  terms TEXT DEFAULT '',
  is_calculated BOOLEAN DEFAULT FALSE,
  calculation_results JSONB,
  project_type TEXT CHECK (project_type IN ('soundDesign','noiseControl')),
  created_by_username TEXT,
  created_by_email TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quotations_legacy_user_id    ON public.quotations_legacy(user_id);
CREATE INDEX idx_quotations_legacy_created_at ON public.quotations_legacy(created_at DESC);
CREATE INDEX idx_quotations_legacy_type       ON public.quotations_legacy(project_type);
CREATE INDEX idx_quotations_legacy_search     ON public.quotations_legacy
  USING GIN (to_tsvector('english', project_name || ' ' || client_name));

CREATE OR REPLACE FUNCTION public.set_updated_at_quotations_legacy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_quotations_legacy
  BEFORE UPDATE ON public.quotations_legacy
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_quotations_legacy();

ALTER TABLE public.quotations_legacy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotations_legacy_select" ON public.quotations_legacy
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "quotations_legacy_insert" ON public.quotations_legacy
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "quotations_legacy_update" ON public.quotations_legacy
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "quotations_legacy_delete" ON public.quotations_legacy
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

GRANT ALL ON public.quotations_legacy TO authenticated;

-- Copy existing saved quotations from projects; preserve ids
INSERT INTO public.quotations_legacy (
  id, user_id, project_name, client_name, equipment, services,
  custom_services, custom_equipment, roles, global_discount, total,
  include_tax, terms, is_calculated, calculation_results, project_type,
  created_by_username, created_by_email, created_by_role,
  created_at, updated_at
)
SELECT
  id, user_id, project_name, client_name, equipment, services,
  custom_services, custom_equipment, roles, global_discount, total,
  include_tax, terms, is_calculated, calculation_results, project_type,
  created_by_username, created_by_email, created_by_role,
  created_at, updated_at
FROM public.projects;

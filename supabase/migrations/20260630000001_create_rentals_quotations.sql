-- Rental-specific quotation table
-- Mirrors the "custom quote" shape from v1_quotations_legacy but scoped to rentals only.
-- v1_rentals.rental_quotation_id → this table (added in migration 20260630000003).

CREATE TABLE public.v1_rentals_quotations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  project_name          TEXT          NOT NULL,
  client_name           TEXT          NOT NULL,
  currency              TEXT          NOT NULL DEFAULT 'JOD',
  custom_equipment      JSONB         NOT NULL DEFAULT '[]'::jsonb,
  custom_services       JSONB         NOT NULL DEFAULT '[]'::jsonb,
  global_discount       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  include_tax           BOOLEAN       NOT NULL DEFAULT true,
  terms                 TEXT,
  is_calculated         BOOLEAN       NOT NULL DEFAULT false,
  calculation_results   JSONB,
  created_by_username   TEXT,
  created_by_email      TEXT,
  created_by_role       TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_v1_rentals_quotations_user_id    ON public.v1_rentals_quotations(user_id);
CREATE INDEX idx_v1_rentals_quotations_created_at ON public.v1_rentals_quotations(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_v1_rentals_quotations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_v1_rentals_quotations
  BEFORE UPDATE ON public.v1_rentals_quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v1_rentals_quotations();

-- Row Level Security (mirrors v1_rentals pattern — user_id IS NULL covers simpleAuth rows)
ALTER TABLE public.v1_rentals_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v1_rentals_quotations_select" ON public.v1_rentals_quotations
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL);

CREATE POLICY "v1_rentals_quotations_insert" ON public.v1_rentals_quotations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "v1_rentals_quotations_update" ON public.v1_rentals_quotations
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL);

CREATE POLICY "v1_rentals_quotations_delete" ON public.v1_rentals_quotations
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL);

GRANT ALL ON public.v1_rentals_quotations TO authenticated;
GRANT ALL ON public.v1_rentals_quotations TO anon;

-- Rental bookings table
-- Financial values are NOT stored here — only operational data + quotation pointer.
-- Financials are derived server-side from the joined quotation (prevents RLS data leaks).

CREATE TABLE public.v1_rentals (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link to the saved quotation (financial data lives there)
  quotation_id          UUID        NOT NULL REFERENCES public.v1_quotations_legacy(id) ON DELETE RESTRICT,
  -- Denormalized for calendar display without joining every time
  title                 TEXT,
  client_name           TEXT,
  -- Date range, timed, Asia/Amman timezone
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ NOT NULL,
  timezone              TEXT        NOT NULL DEFAULT 'Asia/Amman',
  -- Venue
  venue                 TEXT,
  venue_address         TEXT,
  -- Operational info (goes to ops Google Calendar event only)
  logistics_info        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- {load_in_time, load_out_time, transport, crew, equipment_summary, delivery_notes}
  sound_info            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- {soundcheck_time, stage_plot, pa_config, monitor_config, engineer_notes}
  -- Extra per-rental attendees beyond the fixed group lists
  additional_attendees  TEXT[]      NOT NULL DEFAULT '{}'::text[],
  -- Booking lifecycle
  status                TEXT        NOT NULL DEFAULT 'booked'
                          CHECK (status IN ('booked', 'cancelled')),
  -- Google Calendar sync state (idempotency: patch if IDs exist, insert if not)
  gcal_ops_event_id     TEXT,
  gcal_finance_event_id TEXT,
  sync_status           TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (sync_status IN ('pending', 'synced', 'failed')),
  last_synced_at        TIMESTAMPTZ,
  sync_error            TEXT,
  -- Ownership
  user_id               UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_email      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_v1_rentals_quotation_id ON public.v1_rentals(quotation_id);
CREATE INDEX idx_v1_rentals_start_at     ON public.v1_rentals(start_at DESC);
CREATE INDEX idx_v1_rentals_status       ON public.v1_rentals(status);

-- updated_at trigger (mirrors pattern from v1_quotations_legacy)
CREATE OR REPLACE FUNCTION public.set_updated_at_v1_rentals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_v1_rentals
  BEFORE UPDATE ON public.v1_rentals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v1_rentals();

-- Row Level Security
ALTER TABLE public.v1_rentals ENABLE ROW LEVEL SECURITY;

-- user_id IS NULL covers simpleAuth rows (no Supabase auth session)
CREATE POLICY "v1_rentals_select" ON public.v1_rentals
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL);

CREATE POLICY "v1_rentals_insert" ON public.v1_rentals
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "v1_rentals_update" ON public.v1_rentals
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL);

CREATE POLICY "v1_rentals_delete" ON public.v1_rentals
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin() OR user_id IS NULL);

GRANT ALL ON public.v1_rentals TO authenticated;

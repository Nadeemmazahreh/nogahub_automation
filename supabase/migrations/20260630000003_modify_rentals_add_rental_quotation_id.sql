-- Non-destructive modification to v1_rentals:
--   1. Drop the NOT NULL constraint and FK on quotation_id
--      (2 existing rows keep their data, they now reference v1_quotations_legacy without a FK constraint)
--   2. Add rental_quotation_id → v1_rentals_quotations (used for all new bookings)
--
-- This preserves the 2 existing real rental rows while enabling the new flow.

-- Drop FK constraint on quotation_id (keep the column and its data)
ALTER TABLE public.v1_rentals
  DROP CONSTRAINT IF EXISTS v1_rentals_quotation_id_fkey;

-- Make quotation_id nullable (old rows still have values, new rows leave it null)
ALTER TABLE public.v1_rentals
  ALTER COLUMN quotation_id DROP NOT NULL;

-- Add the new FK column for rental-specific quotations
ALTER TABLE public.v1_rentals
  ADD COLUMN IF NOT EXISTS rental_quotation_id UUID
    REFERENCES public.v1_rentals_quotations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_v1_rentals_rental_quotation_id
  ON public.v1_rentals(rental_quotation_id);

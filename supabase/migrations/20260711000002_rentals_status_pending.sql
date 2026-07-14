-- Add 'pending' booking status: rentals now save as pending (no sync/notify)
-- until explicitly confirmed via the Confirm action.
ALTER TABLE public.v1_rentals
  DROP CONSTRAINT v1_rentals_status_check;

ALTER TABLE public.v1_rentals
  ADD CONSTRAINT v1_rentals_status_check
    CHECK (status IN ('pending', 'booked', 'cancelled'));

ALTER TABLE public.v1_rentals
  ALTER COLUMN status SET DEFAULT 'pending';

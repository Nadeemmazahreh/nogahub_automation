-- Technical rider items on rental quotations; venue contact on rentals.
ALTER TABLE v1_rentals_quotations ADD COLUMN IF NOT EXISTS technical_rider jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE v1_rentals ADD COLUMN IF NOT EXISTS venue_contact_name text;
ALTER TABLE v1_rentals ADD COLUMN IF NOT EXISTS venue_contact_phone text;

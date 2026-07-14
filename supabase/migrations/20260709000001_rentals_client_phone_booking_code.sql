ALTER TABLE v1_rentals
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS booking_code TEXT;

ALTER TABLE v1_rentals
  DROP COLUMN IF EXISTS whatsapp_arabic_recipients,
  DROP COLUMN IF EXISTS whatsapp_english_recipients;

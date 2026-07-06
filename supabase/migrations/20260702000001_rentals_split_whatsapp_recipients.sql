-- Replace whatsapp_recipients with two language-specific columns.
-- English and Arabic messages now sent separately to different recipient lists.

ALTER TABLE public.v1_rentals
  ADD COLUMN IF NOT EXISTS whatsapp_arabic_recipients  TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS whatsapp_english_recipients TEXT[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.v1_rentals
  DROP COLUMN IF EXISTS whatsapp_recipients;

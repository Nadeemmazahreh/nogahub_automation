-- Single country code for all rental contact numbers (numbers stored local-format, e.g. 079xxxxxxx).
ALTER TABLE v1_rentals ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT '962';

-- Add equipment_type column to equipment table
-- This stores the original Excel category (Air Series, Arc Series, Brackets, etc.)

-- Add the new column
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS equipment_type TEXT;

-- Create index for equipment_type queries
CREATE INDEX IF NOT EXISTS idx_equipment_type ON public.equipment(equipment_type);

-- Add comment for documentation
COMMENT ON COLUMN public.equipment.equipment_type IS 'Original equipment category from Excel (Air Series, Arc Series, Brackets, Cyclone, Accessories, Cirrus, Drivers, Electronics, Incubus And Nexus, Indigo, Spares, Stasys, Venu)';

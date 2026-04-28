-- Add pricelist audit columns to equipment table
-- pricelist_version: tracks which price list version populated this row
-- needs_dealer_review: flags rows where dealer_usd is a placeholder (= msrp_usd)
--   because the 2026 sheet has no dealer column and no % change for new SKUs

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS pricelist_version TEXT,
  ADD COLUMN IF NOT EXISTS needs_dealer_review BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.equipment.pricelist_version IS
  'Price list version that last updated this row, e.g. ''2026-03-01''';

COMMENT ON COLUMN public.equipment.needs_dealer_review IS
  'True when dealer_usd is a placeholder (set = msrp_usd) because no real dealer price was available during import';

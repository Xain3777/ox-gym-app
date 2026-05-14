-- OX GYM - Migration 040: add image_url to catalog_items
--
-- Storefront (portal/shop) needs a stable path to a product image.
-- Code-side lookup in src/data/product-images.ts is the source of
-- truth today; this column is here so a future admin UI can override
-- per-item without redeploying.

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

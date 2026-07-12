-- Migration: Align ssr_items schema with real SSR 2022-23 data
-- The original schema had placeholder columns (item_code, rate, category).
-- This migration replaces them with the actual fields from the extracted SSR data.

-- Drop old columns
ALTER TABLE ssr_items DROP COLUMN IF EXISTS item_code;
ALTER TABLE ssr_items DROP COLUMN IF EXISTS rate;
ALTER TABLE ssr_items DROP COLUMN IF EXISTS category;

-- Add real SSR columns
ALTER TABLE ssr_items ADD COLUMN sr_no INTEGER;
ALTER TABLE ssr_items ADD COLUMN chapter VARCHAR NOT NULL DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN item_no VARCHAR NOT NULL DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN reference_no TEXT DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN additional_specification TEXT DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN completed_rate_inr NUMERIC(12, 2);
ALTER TABLE ssr_items ADD COLUMN labour_rate_inr NUMERIC(12, 2);
ALTER TABLE ssr_items ADD COLUMN source_page INTEGER;

-- Update description column to allow longer text (already TEXT, just ensure NOT NULL)
-- description is already TEXT NOT NULL, no change needed.

-- Recreate the code-based index on item_no instead of item_code
DROP INDEX IF EXISTS idx_ssr_items_code;
CREATE INDEX IF NOT EXISTS idx_ssr_items_item_no ON ssr_items(item_no);

-- Index on chapter for filtering
CREATE INDEX IF NOT EXISTS idx_ssr_items_chapter ON ssr_items(chapter);

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add a text search index for description searches
CREATE INDEX IF NOT EXISTS idx_ssr_items_description_trgm
  ON ssr_items USING gin (description gin_trgm_ops);

-- Add metadata columns to ssr_versions
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS document_title TEXT;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS source_pdf_pages TEXT;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS field_reference JSONB;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS known_data_quirks JSONB;

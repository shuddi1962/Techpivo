-- 053_site_pages_hero_image.sql
-- Adds hero_image column to site_pages for editable page hero images.
-- Idempotent: safe to re-run.

ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS hero_image text;
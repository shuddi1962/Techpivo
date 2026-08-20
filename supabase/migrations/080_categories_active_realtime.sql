-- 080_categories_active_realtime.sql
-- Admin categories live management:
--   * categories + subcategories gain is_active (enable/disable toggle shown live
--     on public pages) and updated_at (last change timestamp).
--   * both tables added to the supabase_realtime publication so the admin
--     categories page updates live when rows are created / toggled.
-- Filtering is enforced in code (public consumers select is_active = true); the
-- public SELECT policies stay plain USING (true) so postgres_changes broadcasts
-- toggle events to open pages (see 055 for the RLS/realtime lesson).
-- Idempotent: safe to re-run.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS, so guard manually.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subcategories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subcategories;
  END IF;
END
$$;
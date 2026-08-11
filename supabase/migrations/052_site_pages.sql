-- 052_site_pages.sql
-- Editable static pages for the admin Pages module.
-- Public reads only published rows; admins/editors get full CRUD; realtime enabled.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS site_pages (
  slug text PRIMARY KEY,
  title text,
  subtitle text,
  content_md text,
  meta_title text,
  meta_description text,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;

-- Public: read only published pages
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_pages' AND policyname='site_pages public read published') THEN
  CREATE POLICY "site_pages public read published" ON site_pages FOR SELECT USING (is_published = true);
END IF; END $$;

-- Admins/editors: full access
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_pages' AND policyname='site_pages admin all') THEN
  CREATE POLICY "site_pages admin all" ON site_pages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_pages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_pages;
  END IF;
END $$;

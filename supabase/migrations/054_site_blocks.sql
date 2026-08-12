-- 054_site_blocks.sql
-- Editable site-wide content blocks: homepage intro, header banner, footer sections.
-- Public reads only active rows; admins/editors get full CRUD; realtime enabled.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS site_blocks (
  block_key text PRIMARY KEY,
  title text,
  content_md text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE site_blocks ENABLE ROW LEVEL SECURITY;

-- Public: read only active blocks
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_blocks' AND policyname='site_blocks public read active') THEN
  CREATE POLICY "site_blocks public read active" ON site_blocks FOR SELECT USING (is_active = true);
END IF; END $$;

-- Admins/editors: full access
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_blocks' AND policyname='site_blocks admin all') THEN
  CREATE POLICY "site_blocks admin all" ON site_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_blocks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_blocks;
  END IF;
END $$;
-- 055_site_blocks_pages_public_read_all.sql
-- Realtime reflection fix: public SELECT policies must NOT filter rows by
-- is_active / is_published. Supabase Realtime (postgres_changes) is RLS-filtered,
-- so when an admin toggles a block/page OFF, the UPDATE event is never delivered
-- to open public pages (the new row state is invisible to the subscriber) — the
-- site only updated on reload. Rendering components already gate on
-- is_active / is_published themselves (SiteBlock, PageShell, PageIntro),
-- so plain public reads are safe and make toggles broadcast instantly.
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "site_blocks public read active" ON site_blocks;
DROP POLICY IF EXISTS "site_pages public read published" ON site_pages;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_blocks' AND policyname='site_blocks public read') THEN
  CREATE POLICY "site_blocks public read" ON site_blocks FOR SELECT TO anon, authenticated USING (true);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_pages' AND policyname='site_pages public read') THEN
  CREATE POLICY "site_pages public read" ON site_pages FOR SELECT TO anon, authenticated USING (true);
END IF; END $$;
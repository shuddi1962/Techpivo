-- TechPivo Intelligence: missing editorial tables + spend/audit plumbing.
-- Fills the gap where src/lib/editorial-intelligence.ts queries tables that
-- were never created (content_gaps, competitor_watch, product_launches,
-- editorial_queue silently returned []). All tables admin-only via RLS.

-- 1. Content gaps (SERP-derived, observation vs inference separated)
CREATE TABLE IF NOT EXISTS content_gaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT,
  location_code INTEGER DEFAULT 2840,
  language_code TEXT DEFAULT 'en',
  observation TEXT NOT NULL,
  inference TEXT,
  gap_type TEXT DEFAULT 'missing_coverage',
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'briefed', 'published', 'dismissed')),
  source TEXT DEFAULT 'dataforseo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_gaps_priority ON content_gaps(priority DESC);
CREATE INDEX IF NOT EXISTS idx_content_gaps_status ON content_gaps(status);
CREATE INDEX IF NOT EXISTS idx_content_gaps_category ON content_gaps(category);

-- 2. Competitor watch (admin-configured domains + observed themes)
CREATE TABLE IF NOT EXISTS competitor_watch (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  name TEXT,
  category TEXT,
  country TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMPTZ,
  observation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_competitor_watch_active ON competitor_watch(is_active);

-- 3. Product launches (tracker; distinct from launch_events marketplace table)
CREATE TABLE IF NOT EXISTS product_launches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT,
  category TEXT,
  launch_date DATE,
  source_url TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'released', 'delayed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_launches_date ON product_launches(launch_date);
CREATE INDEX IF NOT EXISTS idx_product_launches_status ON product_launches(status);

-- 4. Editorial queue (opportunity pipeline stages)
CREATE TABLE IF NOT EXISTS editorial_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  keyword TEXT,
  category TEXT,
  location_code INTEGER DEFAULT 2840,
  language_code TEXT DEFAULT 'en',
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  stage TEXT DEFAULT 'discovered' CHECK (stage IN ('discovered','analyzing','ready_for_research','researching','brief_ready','drafting','editor_review','ready_to_publish','published','update_required','rejected','archived')),
  brief_id UUID REFERENCES content_briefs(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_editorial_queue_stage ON editorial_queue(stage);
CREATE INDEX IF NOT EXISTS idx_editorial_queue_priority ON editorial_queue(priority DESC);

-- 5. Provider spend log (powers the API Usage dashboard + cost control)
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'dataforseo',
  endpoint TEXT NOT NULL,
  feature TEXT NOT NULL DEFAULT 'manual',
  cost_usd NUMERIC(10,4) DEFAULT 0,
  status_code INTEGER,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider_created ON api_usage_logs(provider, created_at DESC);

-- 6. Integration health (Data Sources page: connected / last sync / last error)
CREATE TABLE IF NOT EXISTS integration_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  capabilities JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: admin/editor read-write, everyone else denied (no public policies).
ALTER TABLE content_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_content_gaps') THEN
    CREATE POLICY intelligence_admin_all_content_gaps ON content_gaps FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_competitor_watch') THEN
    CREATE POLICY intelligence_admin_all_competitor_watch ON competitor_watch FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_product_launches') THEN
    CREATE POLICY intelligence_admin_all_product_launches ON product_launches FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_editorial_queue') THEN
    CREATE POLICY intelligence_admin_all_editorial_queue ON editorial_queue FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_api_usage_logs') THEN
    CREATE POLICY intelligence_admin_all_api_usage_logs ON api_usage_logs FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_integration_status') THEN
    CREATE POLICY intelligence_admin_all_integration_status ON integration_status FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
END $$;

-- Realtime (admin UI live sync; visibility gated in components per repo rule 055).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'editorial_queue') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE editorial_queue;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'content_gaps') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_gaps;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'api_usage_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE api_usage_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'integration_status') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE integration_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'competitor_watch') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE competitor_watch;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'product_launches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE product_launches;
  END IF;
END $$;

-- Seed integration_status rows (capabilities honest about what is live today).
INSERT INTO integration_status (provider, connected, capabilities)
VALUES
  ('dataforseo', FALSE, '["keyword_overview","keyword_suggestions","search_volume","live_serp","locations_lookup"]'),
  ('google_search_console', FALSE, '["queries","clicks","impressions","ctr","position"]'),
  ('analytics', TRUE, '["analytics_events","reports"]')
ON CONFLICT (provider) DO NOTHING;

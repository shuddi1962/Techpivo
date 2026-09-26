-- TechPivo Intelligence Phase 3: opportunities + metric snapshots (cache).
-- Every opportunity stores raw score components separately (explainable,
-- never a "ranking probability"). Snapshots make trends measurable.

CREATE TABLE IF NOT EXISTS keyword_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2840,
  language_code TEXT NOT NULL DEFAULT 'en',
  metrics JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'dataforseo',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_keyword_snapshots_lookup
  ON keyword_snapshots(keyword, location_code, language_code, fetched_at DESC);

CREATE TABLE IF NOT EXISTS content_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT,
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  topic TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2840,
  language_code TEXT NOT NULL DEFAULT 'en',
  intent TEXT,
  search_volume INTEGER,
  trend JSONB DEFAULT '{}',
  difficulty INTEGER,
  competition NUMERIC(4,3),
  cpc NUMERIC(10,2),
  serp_features TEXT[] DEFAULT '{}',
  se_results_count BIGINT,
  existing_coverage TEXT NOT NULL DEFAULT 'none'
    CHECK (existing_coverage IN ('exact','partial','related','none')),
  coverage_matches JSONB DEFAULT '[]',
  content_gap TEXT,
  originality_potential INTEGER CHECK (originality_potential BETWEEN 0 AND 100),
  score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  score_components JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered','analyzing','ready_for_research','researching','brief_ready','drafting','editor_review','ready_to_publish','published','update_required','rejected','archived')),
  source_data JSONB DEFAULT '{}',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_status ON content_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_score ON content_opportunities(score DESC);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_category ON content_opportunities(category);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_keyword ON content_opportunities(primary_keyword);

ALTER TABLE keyword_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_opportunities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_keyword_snapshots') THEN
    CREATE POLICY intelligence_admin_all_keyword_snapshots ON keyword_snapshots FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_content_opportunities') THEN
    CREATE POLICY intelligence_admin_all_content_opportunities ON content_opportunities FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'content_opportunities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_opportunities;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'keyword_snapshots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE keyword_snapshots;
  END IF;
END $$;

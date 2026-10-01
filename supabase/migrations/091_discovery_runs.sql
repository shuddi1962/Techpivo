-- TechPivo Intelligence: discovery run history (category discovery engine).
-- Every discovery run stores its config + measured stats + cost so runs are
-- auditable and re-openable. Opportunities themselves live in
-- content_opportunities; snapshots in keyword_snapshots.

CREATE TABLE IF NOT EXISTS discovery_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  markets INTEGER[] NOT NULL DEFAULT '{2840}',
  language_code TEXT NOT NULL DEFAULT 'en',
  depth TEXT NOT NULL DEFAULT 'standard' CHECK (depth IN ('broad','standard','deep')),
  sources TEXT[] NOT NULL DEFAULT '{keyword}',
  seeds JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running','completed','partial','failed')),
  error TEXT,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_category ON discovery_runs(category);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_created ON discovery_runs(created_at DESC);

-- Opportunity type tags (rule-based, stored — see opp-types.ts).
ALTER TABLE content_opportunities ADD COLUMN IF NOT EXISTS opp_types TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_content_opportunities_types ON content_opportunities USING GIN (opp_types);

ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_discovery_runs') THEN
    CREATE POLICY intelligence_admin_all_discovery_runs ON discovery_runs FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'discovery_runs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE discovery_runs;
  END IF;
END $$;

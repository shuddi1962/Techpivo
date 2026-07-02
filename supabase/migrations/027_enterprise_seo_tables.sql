-- Enterprise SEO Center Tables

-- SEO Audits
CREATE TABLE IF NOT EXISTS seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  overall_score INT DEFAULT 0,
  seo_score INT DEFAULT 0,
  readability_score INT DEFAULT 0,
  eeat_score INT DEFAULT 0,
  media_score INT DEFAULT 0,
  internal_linking_score INT DEFAULT 0,
  external_links_score INT DEFAULT 0,
  schema_score INT DEFAULT 0,
  keyword_coverage_score INT DEFAULT 0,
  technical_health_score INT DEFAULT 0,
  freshness_score INT DEFAULT 0,
  issues JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword Rankings Tracking
CREATE TABLE IF NOT EXISTS keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  position INT,
  previous_position INT,
  search_volume INT,
  difficulty INT,
  url TEXT,
  serp_features JSONB DEFAULT '[]',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword Ranking History
CREATE TABLE IF NOT EXISTS keyword_ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_ranking_id UUID NOT NULL REFERENCES keyword_rankings(id) ON DELETE CASCADE,
  position INT,
  search_volume INT,
  url TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEO Issues
CREATE TABLE IF NOT EXISTS seo_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  description TEXT,
  suggestion TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internal Link Suggestions
CREATE TABLE IF NOT EXISTS internal_link_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  target_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  suggested_anchor TEXT,
  context TEXT,
  accepted BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External Authority Links
CREATE TABLE IF NOT EXISTS authority_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  trust_score INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Templates
CREATE TABLE IF NOT EXISTS schema_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schema_type TEXT NOT NULL,
  template JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redirects
CREATE TABLE IF NOT EXISTS redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  status_code INT DEFAULT 301,
  is_active BOOLEAN DEFAULT true,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Decay Tracking
CREATE TABLE IF NOT EXISTS content_decay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  traffic_change_pct DECIMAL,
  ranking_change INT,
  last_significant_update TIMESTAMPTZ,
  decay_score INT DEFAULT 0,
  refresh_priority INT DEFAULT 0,
  status TEXT DEFAULT 'monitoring',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic Authority
CREATE TABLE IF NOT EXISTS topic_authority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  authority_score INT DEFAULT 0,
  article_count INT DEFAULT 0,
  avg_quality_score INT DEFAULT 0,
  avg_seo_score INT DEFAULT 0,
  total_internal_links INT DEFAULT 0,
  total_external_links INT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_audits_post_id ON seo_audits(post_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword ON keyword_rankings(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_post_id ON keyword_rankings(post_id);
CREATE INDEX IF NOT EXISTS idx_keyword_ranking_history_ranking_id ON keyword_ranking_history(keyword_ranking_id);
CREATE INDEX IF NOT EXISTS idx_seo_issues_post_id ON seo_issues(post_id);
CREATE INDEX IF NOT EXISTS idx_seo_issues_type ON seo_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_post_id ON internal_link_suggestions(post_id);
CREATE INDEX IF NOT EXISTS idx_redirects_from_path ON redirects(from_path);
CREATE INDEX IF NOT EXISTS idx_content_decay_post_id ON content_decay(post_id);
CREATE INDEX IF NOT EXISTS idx_topic_authority_category_id ON topic_authority(category_id);

-- RLS Policies
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_link_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_decay ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_authority ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage seo_audits" ON seo_audits
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage keyword_rankings" ON keyword_rankings
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage keyword_ranking_history" ON keyword_ranking_history
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage seo_issues" ON seo_issues
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage internal_link_suggestions" ON internal_link_suggestions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage authority_links" ON authority_links
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage schema_templates" ON schema_templates
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage redirects" ON redirects
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage content_decay" ON content_decay
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage topic_authority" ON topic_authority
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

-- Insert default schema templates
INSERT INTO schema_templates (name, schema_type, template, is_default) VALUES
  ('NewsArticle', 'NewsArticle', '{"@context":"https://schema.org","@type":"NewsArticle","headline":"","image":"","datePublished":"","dateModified":"","author":{"@type":"Organization","name":"TechPivo"},"publisher":{"@type":"Organization","name":"TechPivo","logo":{"@type":"ImageObject","url":""}},"description":""}', true),
  ('Article', 'Article', '{"@context":"https://schema.org","@type":"Article","headline":"","image":"","datePublished":"","dateModified":"","author":{"@type":"Person","name":""},"publisher":{"@type":"Organization","name":"TechPivo"},"description":""}', false),
  ('FAQPage', 'FAQPage', '{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}', false),
  ('HowTo', 'HowTo', '{"@context":"https://schema.org","@type":"HowTo","name":"","step":[]}', false),
  ('Review', 'Review', '{"@context":"https://schema.org","@type":"Review","itemReviewed":{"@type":"Product","name":""},"reviewRating":{"@type":"Rating","ratingValue":""},"author":{"@type":"Person","name":""},"reviewBody":""}', false)
ON CONFLICT DO NOTHING;

-- Insert default authority links
INSERT INTO authority_links (domain, name, category, trust_score) VALUES
  ('google.com', 'Google', 'Technology', 100),
  ('microsoft.com', 'Microsoft', 'Technology', 100),
  ('apple.com', 'Apple', 'Technology', 100),
  ('openai.com', 'OpenAI', 'Technology', 100),
  ('anthropic.com', 'Anthropic', 'Technology', 100),
  ('nvidia.com', 'NVIDIA', 'Technology', 100),
  ('github.com', 'GitHub', 'Developer', 100),
  ('developer.mozilla.org', 'MDN', 'Developer', 100),
  ('docs.python.org', 'Python Documentation', 'Developer', 100),
  ('nodejs.org', 'Node.js', 'Developer', 100),
  ('react.dev', 'React', 'Developer', 100),
  ('nextjs.org', 'Next.js', 'Developer', 100),
  ('w3.org', 'W3C', 'Standards', 100),
  ('nist.gov', 'NIST', 'Government', 100),
  ('cisa.gov', 'CISA', 'Government', 100)
ON CONFLICT DO NOTHING;

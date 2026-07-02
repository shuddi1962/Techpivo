-- Tools & Utilities Platform Tables

-- Tools
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  is_ai_tool BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  api_endpoint TEXT,
  config JSONB DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool Usage Analytics
CREATE TABLE IF NOT EXISTS tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_ip TEXT,
  country TEXT,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  execution_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool Favorites
CREATE TABLE IF NOT EXISTS tool_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tool_id, user_id),
  UNIQUE(tool_id, ip_hash)
);

-- Launch Center Events
CREATE TABLE IF NOT EXISTS launch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  product_name TEXT,
  event_date TIMESTAMPTZ,
  source_url TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Launch Event Tracking
CREATE TABLE IF NOT EXISTS launch_event_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_event_id UUID NOT NULL REFERENCES launch_events(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Graph Entities
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Graph Relations
CREATE TABLE IF NOT EXISTS knowledge_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Graph Article Links
CREATE TABLE IF NOT EXISTS knowledge_article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  relevance_score INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Experiments (A/B Testing)
CREATE TABLE IF NOT EXISTS content_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  experiment_type TEXT NOT NULL,
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  winner TEXT,
  impressions_a INT DEFAULT 0,
  clicks_a INT DEFAULT 0,
  impressions_b INT DEFAULT 0,
  clicks_b INT DEFAULT 0,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id ON tool_usage(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_launch_events_event_type ON launch_events(event_type);
CREATE INDEX IF NOT EXISTS idx_launch_events_event_date ON launch_events(event_date);
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_name ON knowledge_entities(name);
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON knowledge_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_source ON knowledge_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_target ON knowledge_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_article_links_entity ON knowledge_article_links(entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_article_links_post ON knowledge_article_links(post_id);
CREATE INDEX IF NOT EXISTS idx_content_experiments_post_id ON content_experiments(post_id);

-- RLS Policies
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_event_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_article_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_experiments ENABLE ROW LEVEL SECURITY;

-- Public read for active tools
CREATE POLICY "Public can view active tools" ON tools
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active launch events" ON launch_events
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public can view knowledge entities" ON knowledge_entities
  FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admins can manage tools" ON tools
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can view tool_usage" ON tool_usage
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can manage launch_events" ON launch_events
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage knowledge_entities" ON knowledge_entities
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage knowledge_relations" ON knowledge_relations
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage knowledge_article_links" ON knowledge_article_links
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Admins can manage content_experiments" ON content_experiments
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

-- Insert default tools
INSERT INTO tools (name, slug, description, category, icon, is_ai_tool) VALUES
  ('JSON Formatter', 'json-formatter', 'Format and validate JSON data', 'developer', 'code', false),
  ('JSON Validator', 'json-validator', 'Validate JSON syntax', 'developer', 'check-circle', false),
  ('XML Formatter', 'xml-formatter', 'Format and validate XML data', 'developer', 'code', false),
  ('YAML Formatter', 'yaml-formatter', 'Format YAML data', 'developer', 'code', false),
  ('Base64 Encoder', 'base64-encoder', 'Encode text to Base64', 'developer', 'lock', false),
  ('Base64 Decoder', 'base64-decoder', 'Decode Base64 to text', 'developer', 'unlock', false),
  ('URL Encoder', 'url-encoder', 'Encode URLs', 'developer', 'link', false),
  ('URL Decoder', 'url-decoder', 'Decode URLs', 'developer', 'link', false),
  ('Hash Generator', 'hash-generator', 'Generate MD5, SHA256 hashes', 'security', 'hash', false),
  ('Password Generator', 'password-generator', 'Generate secure passwords', 'security', 'key', false),
  ('Password Strength Checker', 'password-strength', 'Check password strength', 'security', 'shield', false),
  ('Email Validator', 'email-validator', 'Validate email addresses', 'security', 'mail', false),
  ('IP Lookup', 'ip-lookup', 'Look up IP address information', 'networking', 'globe', false),
  ('DNS Checker', 'dns-checker', 'Check DNS records', 'networking', 'server', false),
  ('Whois Lookup', 'whois-lookup', 'Look up domain information', 'networking', 'search', false),
  ('SSL Checker', 'ssl-checker', 'Check SSL certificate status', 'networking', 'lock', false),
  ('Meta Tag Generator', 'meta-tag-generator', 'Generate meta tags for SEO', 'seo', 'tags', false),
  ('Schema Generator', 'schema-generator', 'Generate structured data schema', 'seo', 'layout', false),
  ('Robots.txt Generator', 'robots-txt-generator', 'Generate robots.txt file', 'seo', 'bot', false),
  ('Sitemap Generator', 'sitemap-generator', 'Generate XML sitemap', 'seo', 'map', false),
  ('Keyword Density Checker', 'keyword-density', 'Check keyword density in text', 'seo', 'search', false),
  ('Readability Checker', 'readability-checker', 'Check text readability score', 'seo', 'book-open', false),
  ('Word Counter', 'word-counter', 'Count words and characters', 'seo', 'type', false),
  ('SERP Preview', 'serp-preview', 'Preview Google search results', 'seo', 'eye', false),
  ('Image Compressor', 'image-compressor', 'Compress images for web', 'image', 'image', false),
  ('WebP Converter', 'webp-converter', 'Convert images to WebP format', 'image', 'refresh-cw', false),
  ('Image Resizer', 'image-resizer', 'Resize images to specific dimensions', 'image', 'maximize', false),
  ('Background Remover', 'background-remover', 'Remove image backgrounds', 'image', 'scissors', false),
  ('Color Picker', 'color-picker', 'Pick and convert colors', 'image', 'palette', false),
  ('Merge PDF', 'merge-pdf', 'Merge multiple PDF files', 'pdf', 'file-text', false),
  ('Split PDF', 'split-pdf', 'Split PDF into pages', 'pdf', 'scissors', false),
  ('Compress PDF', 'compress-pdf', 'Compress PDF file size', 'pdf', 'minimize', false),
  ('PDF to Word', 'pdf-to-word', 'Convert PDF to Word document', 'pdf', 'file', false),
  ('Loan Calculator', 'loan-calculator', 'Calculate loan payments', 'calculator', 'dollar-sign', false),
  ('Percentage Calculator', 'percentage-calculator', 'Calculate percentages', 'calculator', 'percent', false),
  ('Unit Converter', 'unit-converter', 'Convert between units of measurement', 'calculator', 'repeat', false),
  ('Currency Converter', 'currency-converter', 'Convert between currencies', 'calculator', 'dollar-sign', false),
  ('AI Prompt Generator', 'ai-prompt-generator', 'Generate AI prompts for various tasks', 'ai', 'sparkles', true),
  ('AI Text Humanizer', 'ai-text-humanizer', 'Make AI text sound more natural', 'ai', 'user', true),
  ('AI Headline Generator', 'ai-headline-generator', 'Generate compelling headlines', 'ai', 'type', true),
  ('AI Meta Description Generator', 'ai-meta-description', 'Generate SEO meta descriptions', 'ai', 'file-text', true),
  ('AI FAQ Generator', 'ai-faq-generator', 'Generate FAQ sections', 'ai', 'help-circle', true)
ON CONFLICT DO NOTHING;

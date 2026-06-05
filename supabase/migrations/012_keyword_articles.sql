-- Create keyword_articles table for SEO/GEO/AEO keyword-driven content pipeline
CREATE TABLE IF NOT EXISTS keyword_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  title TEXT,
  slug TEXT UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  category_id UUID REFERENCES categories(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  status post_status DEFAULT 'draft',
  source TEXT NOT NULL DEFAULT 'google_trends',
  search_volume INT DEFAULT 0,
  trend_direction TEXT,
  pexels_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  quick_brief JSONB DEFAULT '[]',
  key_points JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  answer_capsule TEXT,
  published_at TIMESTAMPTZ,
  views INT DEFAULT 0,
  reading_time INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_keyword_articles_keyword ON keyword_articles(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_status ON keyword_articles(status);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_source ON keyword_articles(source);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_created ON keyword_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_published ON keyword_articles(published_at DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_keyword_articles_updated_at
  BEFORE UPDATE ON keyword_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE keyword_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published keyword articles" ON keyword_articles
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can CRUD keyword articles" ON keyword_articles
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author'))
  );

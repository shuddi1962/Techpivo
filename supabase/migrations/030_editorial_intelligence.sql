-- AI Editorial Intelligence tables

CREATE TABLE IF NOT EXISTS content_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  category TEXT,
  brief_data JSONB NOT NULL DEFAULT '{}',
  opportunity_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'reviewing', 'approved', 'generating', 'published', 'discarded')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_briefs_status ON content_briefs(status);
CREATE INDEX IF NOT EXISTS idx_content_briefs_category ON content_briefs(category);
CREATE INDEX IF NOT EXISTS idx_content_briefs_score ON content_briefs(opportunity_score DESC);

CREATE TABLE IF NOT EXISTS editorial_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'drafting', 'reviewing', 'scheduled', 'published', 'cancelled')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  brief_id UUID REFERENCES content_briefs(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editorial_calendar_date ON editorial_calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_editorial_calendar_status ON editorial_calendar(status);

CREATE TABLE IF NOT EXISTS company_watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMPTZ,
  stories_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trend_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  category TEXT,
  probability INTEGER CHECK (probability BETWEEN 0 AND 100),
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  time_window TEXT,
  sources JSONB DEFAULT '[]',
  recommendation TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'acted_upon')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trend_predictions_probability ON trend_predictions(probability DESC);

CREATE TABLE IF NOT EXISTS image_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT CHECK (source IN ('pexels', 'unsplash', 'ai_generated', 'official')),
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  resolution_score INTEGER DEFAULT 0 CHECK (resolution_score BETWEEN 0 AND 100),
  orientation_score INTEGER DEFAULT 0 CHECK (orientation_score BETWEEN 0 AND 100),
  visual_quality_score INTEGER DEFAULT 0 CHECK (visual_quality_score BETWEEN 0 AND 100),
  brand_safety_score INTEGER DEFAULT 0 CHECK (brand_safety_score BETWEEN 0 AND 100),
  file_size_score INTEGER DEFAULT 0 CHECK (file_size_score BETWEEN 0 AND 100),
  total_score INTEGER DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_rankings_post ON image_rankings(post_id);
CREATE INDEX IF NOT EXISTS idx_image_rankings_score ON image_rankings(total_score DESC);

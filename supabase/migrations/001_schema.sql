-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== ENUMS =====================
CREATE TYPE post_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author', 'contributor');
CREATE TYPE ad_type AS ENUM ('banner', 'sidebar', 'in-feed', 'sticky', 'popup');
CREATE TYPE ad_position AS ENUM (
  'home_top', 'home_mid', 'home_bottom', 'sidebar', 'post_top', 'post_mid', 'post_bottom', 'category_top',
  'home_top_banner', 'home_sticky_top', 'home_hero_mid', 'home_infeed_1', 'home_infeed_2',
  'home_sidebar_top', 'home_sidebar_mid', 'home_bottom_banner', 'home_sticky_bottom',
  'post_in_content_1', 'post_in_content_2', 'post_in_content_3',
  'post_sidebar_top', 'post_sidebar_mid', 'post_sidebar_bottom',
  'post_bottom_related', 'post_sticky_bottom',
  'category_infeed', 'category_sidebar',
  'search_top', 'search_infeed',
  'error_mid',
  'global_interstitial', 'global_exit_intent'
);
CREATE TYPE index_status AS ENUM ('pending', 'submitted', 'indexed', 'failed');
CREATE TYPE social_platform AS ENUM (
  'twitter', 'facebook', 'instagram', 'linkedin', 'pinterest', 'telegram',
  'whatsapp', 'reddit', 'medium', 'devto', 'hashnode', 'youtube_community', 'gmb', 'buffer', 'hootsuite'
);
CREATE TYPE social_post_status AS ENUM ('pending', 'scheduled', 'sent', 'failed', 'skipped');
CREATE TYPE api_type AS ENUM ('direct_api', 'cj', 'shareasale', 'impact', 'rakuten', 'awin', 'flexoffers');
CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'spam');
CREATE TYPE subscriber_status AS ENUM ('active', 'unsubscribed', 'bounced');

-- ===================== TABLES =====================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role user_role DEFAULT 'author',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Series
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),
  subcategory_id UUID REFERENCES subcategories(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  status post_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  is_breaking BOOLEAN DEFAULT false,
  is_sponsored BOOLEAN DEFAULT false,
  rss_source_url TEXT,
  original_source_url TEXT,
  ai_rewritten BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  views INT DEFAULT 0,
  reading_time INT DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] DEFAULT '{}',
  og_image TEXT,
  canonical_url TEXT,
  google_indexed BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  series_id UUID REFERENCES series(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS Feeds
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  subcategory_id UUID REFERENCES subcategories(id),
  feed_url TEXT NOT NULL,
  feed_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_rewrite BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT false,
  last_fetched_at TIMESTAMPTZ,
  fetch_interval_minutes INT DEFAULT 60,
  posts_fetched INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ads
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type ad_type NOT NULL,
  position ad_position NOT NULL,
  ad_code TEXT,
  adsense_slot TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Direct Ad Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT NOT NULL,
  ad_image_url TEXT,
  destination_url TEXT,
  ad_code TEXT,
  positions ad_position[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  daily_impression_cap INT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- House Ads (internal promos, fallback)
CREATE TABLE IF NOT EXISTS house_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Programs
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  api_key TEXT,
  api_secret TEXT,
  tracking_base_url TEXT,
  commission_rate DECIMAL,
  cookie_duration_days INT,
  category_id UUID REFERENCES categories(id),
  is_active BOOLEAN DEFAULT true,
  auto_inject BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Products
CREATE TABLE IF NOT EXISTS affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  program_key TEXT,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image_url TEXT,
  affiliate_link TEXT NOT NULL,
  original_price DECIMAL,
  sale_price DECIMAL,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_auto_imported BOOLEAN DEFAULT false,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Program Configs
CREATE TABLE IF NOT EXISTS affiliate_program_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key TEXT UNIQUE NOT NULL,
  program_name TEXT NOT NULL,
  logo_url TEXT,
  api_type api_type NOT NULL,
  credentials JSONB DEFAULT '{}',
  is_connected BOOLEAN DEFAULT false,
  auto_mode BOOLEAN DEFAULT false,
  auto_mode_interval_hours INT DEFAULT 24,
  auto_mode_categories UUID[] DEFAULT '{}',
  auto_mode_keywords TEXT[] DEFAULT '{}',
  auto_mode_max_products INT DEFAULT 50,
  last_auto_run_at TIMESTAMPTZ,
  search_enabled BOOLEAN DEFAULT true,
  total_products_imported INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  total_estimated_earnings DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform social_platform NOT NULL,
  account_name TEXT NOT NULL,
  credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT false,
  post_delay_minutes INT DEFAULT 0,
  category_filter UUID[] DEFAULT NULL,
  custom_template TEXT,
  last_posted_at TIMESTAMPTZ,
  total_posts_sent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Posts
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id),
  status social_post_status DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  platform_post_id TEXT,
  content_preview TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id),
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status comment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, type, ip_hash)
);

-- Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  categories UUID[] DEFAULT '{}',
  status subscriber_status DEFAULT 'active',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter sends
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  subject TEXT NOT NULL,
  sent_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Indexing Queue
CREATE TABLE IF NOT EXISTS google_indexing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  status index_status DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  post_id UUID REFERENCES posts(id),
  category_id UUID REFERENCES categories(id),
  ad_id UUID REFERENCES ads(id),
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading list (bookmarks)
CREATE TABLE IF NOT EXISTS reading_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, ip_hash)
);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON subcategories(slug);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_category ON affiliate_products(category_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_featured ON affiliate_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_indexing_status ON google_indexing_queue(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);

-- Full-text search index on posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_post_search_vector
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_search_vector();

-- ===================== AUTO-UPDATE TIMESTAMPS =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================== ROW LEVEL SECURITY =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_indexing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can view published posts" ON posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Public can view subcategories" ON subcategories
  FOR SELECT USING (true);

CREATE POLICY "Public can view active ads" ON ads
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view approved comments" ON comments
  FOR SELECT USING (status = 'approved');

-- Authenticated admin policies
CREATE POLICY "Admins can CRUD posts" ON posts
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author'))
  );

CREATE POLICY "Admins can CRUD categories" ON categories
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor'))
  );

CREATE POLICY "Admins can CRUD all" ON rss_feeds
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can CRUD ads" ON ads
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can manage site settings" ON site_settings
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Create default admin profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'contributor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ===================== DEFAULT SITE SETTINGS =====================
INSERT INTO site_settings (key, value) VALUES
  ('site_name', '"Techpivo"'),
  ('site_tagline', '"Tech, decoded. Fast."'),
  ('site_url', '"https://www.techpivo.com"'),
  ('default_meta_description', '"Techpivo - Tech, decoded. Fast. Your source for the latest in tech news, web development, programming, cybersecurity, AI, gadgets, and tutorials."'),
  ('default_og_image', '""'),
  ('adsense_publisher_id', '""'),
  ('affiliate_disclosure', '"Some links on this page are affiliate links. We may earn a commission at no extra cost to you."'),
  ('openrouter_api_key', '""'),
  ('openrouter_model', '"mistralai/mixtral-8x7b-instruct"'),
  ('ga4_measurement_id', '""'),
  ('gtm_container_id', '""'),
  ('google_search_console_verification', '""'),
  ('bing_webmaster_verification', '""'),
  ('schema_breadcrumb', 'true'),
  ('schema_article', 'true'),
  ('auto_indexing', 'false'),
  ('auto_sitemap_submit', 'false'),
  ('enable_auto_ads', 'false'),
  ('enable_interstitial', 'false'),
  ('enable_exit_intent', 'false'),
  ('enable_push_notifications', 'false'),
  ('infinite_scroll', 'true'),
  ('resend_api_key', '""'),
  ('vapid_public_key', '""'),
  ('vapid_private_key', '""'),
  ('newsletter_from_email', '"newsletter@techpivo.com"'),
  ('newsletter_from_name', '"Techpivo"')
ON CONFLICT (key) DO NOTHING;

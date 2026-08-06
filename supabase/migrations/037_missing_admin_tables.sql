-- =====================================================
-- MIGRATION 037: MISSING ADMIN TABLES
-- Creates all missing tables needed for admin pages:
-- Newsletter Center, Affiliate Center, Ad Manager,
-- Campaign Manager, AI Settings
-- =====================================================

-- ===================== RLS HELPER FUNCTION =====================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Check if the current authenticated user has admin role';

-- ===================== NEWSLETTER LISTS =====================

CREATE TABLE IF NOT EXISTS newsletter_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  subscriber_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE newsletter_lists IS 'Newsletter subscriber list segments';

-- ===================== NEWSLETTER SUBSCRIBERS =====================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','unsubscribed','bounced','pending')),
  lists UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE newsletter_subscribers IS 'Newsletter subscribers with metadata and engagement tracking';

-- ===================== NEWSLETTER CAMPAIGNS =====================

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  content TEXT DEFAULT '',
  html_content TEXT DEFAULT '',
  plain_content TEXT DEFAULT '',
  from_name TEXT DEFAULT 'TechPivo',
  from_email TEXT DEFAULT 'newsletter@techpivo.com',
  reply_to TEXT DEFAULT 'hello@techpivo.com',
  list_id UUID REFERENCES newsletter_lists(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','paused','failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  subscribers_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE newsletter_campaigns IS 'Newsletter campaigns with content, scheduling, and performance stats';

-- ===================== NEWSLETTER TEMPLATES =====================

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  content TEXT DEFAULT '',
  html_template TEXT DEFAULT '',
  category TEXT DEFAULT 'general' CHECK (category IN ('general','promotional','announcement','digest','transactional')),
  preview_image TEXT,
  is_system BOOLEAN DEFAULT false,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE newsletter_templates IS 'Reusable newsletter email templates';

-- ===================== NEWSLETTER AUTOMATIONS =====================

CREATE TABLE IF NOT EXISTS newsletter_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('subscribe','manual','scheduled','event','tag_added')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  delay_days INTEGER DEFAULT 0,
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  workflow JSONB DEFAULT '[]'::jsonb,
  total_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE newsletter_automations IS 'Automated newsletter workflows triggered by subscriber events';

-- ===================== AFFILIATE RULES =====================

CREATE TABLE IF NOT EXISTS affiliate_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword','category','tag','regex','manual')),
  condition TEXT DEFAULT '',
  action TEXT DEFAULT 'insert_link' CHECK (action IN ('insert_link','replace_link','show_banner','show_widget')),
  target_url TEXT,
  affiliate_id TEXT,
  program_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  placement TEXT DEFAULT 'inline' CHECK (placement IN ('inline','sidebar','banner','popup')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE affiliate_rules IS 'Automated rules for inserting affiliate links based on triggers';

-- ===================== AFFILIATE CAMPAIGNS =====================

CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  partner TEXT DEFAULT '',
  program_ids UUID[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(10,2) DEFAULT 0,
  spent NUMERIC(10,2) DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE affiliate_campaigns IS 'Affiliate marketing campaigns with budget and performance tracking';

-- ===================== AFFILIATE SALES =====================

CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES affiliate_products(id) ON DELETE SET NULL,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  program_id UUID REFERENCES affiliate_programs(id) ON DELETE SET NULL,
  order_id TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  commission NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected','refunded')),
  referrer TEXT,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE affiliate_sales IS 'Affiliate sale transactions with commission tracking';

-- ===================== AFFILIATE CLICKS (extended) =====================

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
  post_id UUID,
  ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  converted BOOLEAN DEFAULT false,
  conversion_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE affiliate_clicks IS 'Affiliate link click tracking with geo and conversion data';

-- Add missing columns if table already existed with old schema
DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS ip TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS user_agent TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS country TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS conversion_amount NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ===================== AD PLACEMENTS =====================

CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT DEFAULT '',
  ad_type TEXT DEFAULT 'banner' CHECK (ad_type IN ('banner','native','popup','sticky','infeed','interstitial')),
  width INTEGER DEFAULT 300,
  height INTEGER DEFAULT 250,
  sizes JSONB DEFAULT '["300x250"]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  is_active BOOLEAN DEFAULT true,
  current_ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ad_placements IS 'Advertisement placement slots on the site';

-- ===================== AD SCHEDULES =====================

CREATE TABLE IF NOT EXISTS ad_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  placement_id UUID REFERENCES ad_placements(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  day_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  hour_start INTEGER DEFAULT 0,
  hour_end INTEGER DEFAULT 23,
  frequency TEXT DEFAULT 'always' CHECK (frequency IN ('always','daily','weekly','custom')),
  frequency_config JSONB DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','expired','archived')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ad_schedules IS 'Scheduled advertisement campaigns with time and placement targeting';

-- ===================== AD REVENUE =====================

CREATE TABLE IF NOT EXISTS ad_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  placement_id UUID REFERENCES ad_placements(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'adsense' CHECK (source IN ('adsense','adsterra','direct','sponsor','mediavine','other')),
  date DATE DEFAULT CURRENT_DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,
  cpm NUMERIC(6,2) DEFAULT 0,
  cpc NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ad_revenue IS 'Daily advertisement revenue and performance data';

-- ===================== CAMPAIGNS (Add missing columns to existing table) =====================

DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'social';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_url TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spent NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS revenue NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by UUID;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ===================== AI SETTINGS (add missing column) =====================

DO $$ BEGIN
  ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ===================== INDEXES =====================

-- Newsletter indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_list ON newsletter_campaigns(list_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_scheduled ON newsletter_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_templates_category ON newsletter_templates(category);
CREATE INDEX IF NOT EXISTS idx_newsletter_lists_active ON newsletter_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_automations_status ON newsletter_automations(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_automations_trigger ON newsletter_automations(trigger_type);

-- Affiliate indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_rules_program ON affiliate_rules(program_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_rules_status ON affiliate_rules(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_rules_trigger ON affiliate_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_status ON affiliate_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_dates ON affiliate_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_product ON affiliate_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_link ON affiliate_sales(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_date ON affiliate_sales(converted_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link ON affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_country ON affiliate_clicks(country);

-- Ad indexes
CREATE INDEX IF NOT EXISTS idx_ad_placements_status ON ad_placements(status);
CREATE INDEX IF NOT EXISTS idx_ad_placements_location ON ad_placements(location, position);
CREATE INDEX IF NOT EXISTS idx_ad_schedules_campaign ON ad_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_schedules_placement ON ad_schedules(placement_id);
CREATE INDEX IF NOT EXISTS idx_ad_schedules_dates ON ad_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_campaign ON ad_revenue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_date ON ad_revenue(date);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_source ON ad_revenue(source);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_by);

-- AI settings indexes
CREATE INDEX IF NOT EXISTS idx_ai_settings_key ON ai_settings(key);

-- ===================== RLS POLICIES =====================

ALTER TABLE newsletter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Admin full access policies using is_admin() function
DO $$ BEGIN
  CREATE POLICY "Admin full access" ON newsletter_lists FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON newsletter_subscribers FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON newsletter_campaigns FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON newsletter_templates FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON newsletter_automations FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON affiliate_rules FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON affiliate_campaigns FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON affiliate_sales FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON ad_placements FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON ad_schedules FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON ad_revenue FOR ALL USING (is_admin());
  CREATE POLICY "Admin full access" ON campaigns FOR ALL USING (is_admin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Authenticated users can read most admin data
DO $$ BEGIN
  CREATE POLICY "Authenticated read" ON newsletter_lists FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON newsletter_subscribers FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON newsletter_campaigns FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON newsletter_templates FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON newsletter_automations FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON affiliate_rules FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON affiliate_campaigns FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON affiliate_sales FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON ad_placements FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON ad_schedules FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON ad_revenue FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Authenticated read" ON campaigns FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Also apply policies to affiliate_clicks if it was newly created
DO $$ BEGIN
  ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin full access" ON affiliate_clicks FOR ALL USING (is_admin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read" ON affiliate_clicks FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ===================== SEED DATA =====================

-- Default newsletter lists
INSERT INTO newsletter_lists (name, slug, description, is_active) VALUES
  ('All Subscribers', 'all', 'All newsletter subscribers', true),
  ('Weekly Digest', 'weekly', 'Weekly technology digest', true),
  ('Breaking News', 'breaking', 'Breaking technology news alerts', true),
  ('AI & Automation', 'ai-automation', 'AI and automation updates', true),
  ('Cybersecurity', 'cybersecurity', 'Security news and advisories', true),
  ('Programming', 'programming', 'Developer tutorials and news', true)
ON CONFLICT (slug) DO NOTHING;

-- Default ad placements
INSERT INTO ad_placements (name, location, position, ad_type, width, height, sizes, is_active) VALUES
  ('Header Banner', 'header', 'top', 'banner', 728, 90, '["728x90","468x60"]', true),
  ('Sidebar Top', 'sidebar', 'top', 'banner', 300, 250, '["300x250","300x600"]', true),
  ('Sidebar Bottom', 'sidebar', 'bottom', 'banner', 300, 250, '["300x250"]', true),
  ('In-Article 1', 'content', 'after_paragraph_3', 'infeed', 728, 90, '["728x90","468x60"]', true),
  ('In-Article 2', 'content', 'after_paragraph_6', 'infeed', 728, 90, '["728x90","468x60"]', true),
  ('Footer Banner', 'footer', 'bottom', 'banner', 728, 90, '["728x90","468x60"]', true),
  ('Mobile Banner', 'mobile', 'top', 'banner', 320, 100, '["320x100","320x50"]', true),
  ('Native Ad 1', 'content', 'between_posts', 'native', 300, 250, '["300x250"]', true)
ON CONFLICT DO NOTHING;

-- Default AI settings
INSERT INTO ai_settings (key, value) VALUES
  ('default_model', '"gemini-2.0-flash"'),
  ('max_tokens', '4096'),
  ('temperature', '0.7'),
  ('research_enabled', 'true'),
  ('auto_generate_images', 'false'),
  ('auto_publish', 'false'),
  ('editorial_review_required', 'true'),
  ('max_daily_generations', '50')
ON CONFLICT (key) DO NOTHING;

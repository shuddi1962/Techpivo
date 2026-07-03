-- =====================================================
-- MIGRATION 034: NEWSLETTER CENTER, PUSH NOTIFICATIONS,
-- AFFILIATE TRACKING, AD REVENUE, WORKFLOW AUTOMATION,
-- PLUGIN MARKETPLACE, PUBLIC API
-- =====================================================

-- ===================== NEWSLETTER =====================

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
  preferences JSONB DEFAULT '{"frequency":"weekly","categories":[]}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  html_content TEXT DEFAULT '',
  plain_content TEXT DEFAULT '',
  from_name TEXT DEFAULT 'TechPivo',
  from_email TEXT DEFAULT 'newsletter@techpivo.com',
  reply_to TEXT DEFAULT 'hello@techpivo.com',
  list_id UUID REFERENCES newsletter_lists(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','paused','failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,
  ab_test_id UUID,
  template_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','opened','clicked','bounced','failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounce_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general' CHECK (category IN ('general','promotional','announcement','digest','transactional')),
  html_template TEXT NOT NULL,
  preview_image TEXT,
  is_system BOOLEAN DEFAULT false,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('subscribe','manual','scheduled','event')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  workflow JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  total_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('subscribe','unsubscribe','open','click','bounce','complaint')),
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_a_id UUID REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  campaign_b_id UUID REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  winner_criteria TEXT DEFAULT 'open_rate' CHECK (winner_criteria IN ('open_rate','click_rate')),
  split_percentage INTEGER DEFAULT 50,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','completed','cancelled')),
  winner_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== PUSH NOTIFICATIONS =====================

CREATE TABLE IF NOT EXISTS push_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_type TEXT DEFAULT 'web' CHECK (device_type IN ('web','android','ios')),
  browser TEXT DEFAULT '',
  os TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT DEFAULT '',
  image TEXT DEFAULT '',
  icon TEXT DEFAULT '/icon-192x192.png',
  badge TEXT DEFAULT '/badge-72x72.png',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  audience TEXT DEFAULT 'all' CHECK (audience IN ('all','segment','custom')),
  segment_config JSONB DEFAULT '{}'::jsonb,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES push_notifications(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES push_subscribers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','opened','clicked','failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== AFFILIATE TRACKING =====================

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES affiliate_products(id) ON DELETE CASCADE,
  program_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  custom_slug TEXT UNIQUE,
  destination_url TEXT NOT NULL,
  tracking_params JSONB DEFAULT '{}'::jsonb,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
  post_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  converted BOOLEAN DEFAULT false,
  conversion_amount NUMERIC(10,2) DEFAULT 0,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  match_type TEXT NOT NULL CHECK (match_type IN ('keyword','category','tag','regex','manual')),
  match_value TEXT NOT NULL,
  program_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  placement TEXT DEFAULT 'inline' CHECK (placement IN ('inline','sidebar','banner','popup')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  revenue_per_click NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  program_ids UUID[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(10,2) DEFAULT 0,
  spent NUMERIC(10,2) DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  program_id UUID REFERENCES affiliate_programs(id) ON DELETE SET NULL,
  order_id TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  commission NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== AD REVENUE =====================

CREATE TABLE IF NOT EXISTS ad_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'adsense' CHECK (source IN ('adsense','adsterra','direct','sponsor')),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,
  cpm NUMERIC(6,2) DEFAULT 0,
  cpc NUMERIC(6,2) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  frequency TEXT DEFAULT 'always' CHECK (frequency IN ('always','daily','weekly','custom')),
  frequency_config JSONB DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  ad_type TEXT DEFAULT 'banner' CHECK (ad_type IN ('banner','native','popup','sticky','infeed','interstitial')),
  sizes JSONB DEFAULT '["300x250"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  current_ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== WORKFLOW AUTOMATION =====================

CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('publish','update','schedule','rss','manual','webhook','keyword')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_status TEXT DEFAULT '' CHECK (last_status IN ('','success','partial','failed')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
  trigger_data JSONB DEFAULT '{}'::jsonb,
  node_results JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general' CHECK (category IN ('general','publishing','seo','social','affiliate','custom')),
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== PLUGIN MARKETPLACE =====================

CREATE TABLE IF NOT EXISTS plugins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  author TEXT DEFAULT '',
  author_url TEXT DEFAULT '',
  homepage TEXT DEFAULT '',
  repository TEXT DEFAULT '',
  category TEXT DEFAULT 'general' CHECK (category IN ('general','seo','ai','analytics','security','marketing','payments','email','media','developer','localization','integrations')),
  icon TEXT DEFAULT '',
  screenshots JSONB DEFAULT '[]'::jsonb,
  requires JSONB DEFAULT '{}'::jsonb,
  settings_schema JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  is_installed BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  installed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plugin_id)
);

CREATE TABLE IF NOT EXISTS plugin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'info' CHECK (level IN ('info','warning','error','debug')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== PUBLIC API =====================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{read}',
  rate_limit INTEGER DEFAULT 100,
  requests_today INTEGER DEFAULT 0,
  requests_total INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER DEFAULT 200,
  response_time_ms INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 0,
  UNIQUE(api_key_id, window_start)
);

-- ===================== INDEXES =====================

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign ON newsletter_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_subscriber ON newsletter_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_activity_subscriber ON newsletter_activity(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_push_subscribers_user ON push_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscribers_active ON push_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_push_sends_notification ON push_sends(notification_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_program ON affiliate_links(program_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link ON affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_link ON affiliate_sales(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_program ON affiliate_sales(program_id);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_date ON ad_revenue(date);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_ad ON ad_revenue(ad_id);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_active ON automation_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow ON automation_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_installed ON plugins(is_installed);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);

-- ===================== RLS POLICIES =====================

ALTER TABLE newsletter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Admin policies
DO $$ BEGIN
  CREATE POLICY "Admin full access" ON newsletter_lists FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_subscribers FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_campaigns FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_sends FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_templates FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_automations FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_activity FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON newsletter_ab_tests FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON push_subscribers FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON push_notifications FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON push_sends FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON affiliate_links FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON affiliate_clicks FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON affiliate_rules FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON affiliate_campaigns FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON affiliate_sales FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON ad_revenue FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON ad_schedules FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON ad_placements FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON automation_workflows FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON automation_runs FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON automation_templates FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON plugins FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON plugin_settings FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON plugin_logs FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON api_keys FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON api_usage FOR ALL USING (auth.jwt()->>'role' = 'admin');
  CREATE POLICY "Admin full access" ON api_rate_limits FOR ALL USING (auth.jwt()->>'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Public read for active items
DO $$ BEGIN
  CREATE POLICY "Public read active" ON plugins FOR SELECT USING (is_installed = true);
  CREATE POLICY "Public read" ON newsletter_lists FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ===================== SEED DATA =====================

INSERT INTO newsletter_lists (name, slug, description, is_active) VALUES
  ('All Subscribers', 'all', 'All newsletter subscribers', true),
  ('Weekly Digest', 'weekly', 'Weekly technology digest', true),
  ('Breaking News', 'breaking', 'Breaking technology news alerts', true),
  ('AI & Automation', 'ai-automation', 'AI and automation updates', true),
  ('Cybersecurity', 'cybersecurity', 'Security news and advisories', true),
  ('Programming', 'programming', 'Developer tutorials and news', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO newsletter_templates (name, description, category, html_template, is_system) VALUES
  ('Welcome', 'New subscriber welcome email', 'transactional', '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><h1 style="color:#1a1a2e;">Welcome to TechPivo!</h1><p>Thank you for subscribing. You will receive our latest technology news, tutorials, and insights.</p><p>Stay tuned for cutting-edge content about AI, cybersecurity, programming, and gadgets.</p></div>', true),
  ('Weekly Digest', 'Weekly newsletter template', 'digest', '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><h1 style="color:#1a1a2e;">TechPivo Weekly Digest</h1><p>Here are this week''s top stories:</p>{{content}}<p>Thanks for reading!</p></div>', true),
  ('Breaking News', 'Breaking news alert', 'announcement', '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:#dc2626;color:white;padding:8px 16px;"><strong>BREAKING</strong></div><h1 style="color:#1a1a2e;">{{title}}</h1><p>{{summary}}</p><a href="{{url}}" style="display:inline-block;background:#1a1a2e;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Read More</a></div>', true)
ON CONFLICT DO NOTHING;

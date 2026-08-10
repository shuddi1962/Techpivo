-- Migration 044: Ad Marketplace V2 — Google Ads / Meta Ads-style self-serve auction
-- Advertisers set their own daily budget + bid (CPM or CPC); ads compete by bid, no fixed prices
-- Applied live: 2026-08-10

-- 1. ad_placements — video capability + minimum bid floors (floors only; advertisers decide what they pay)
ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS price_per_week NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_month NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supports_video BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_bid_cpm NUMERIC(12,2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS min_bid_cpc NUMERIC(12,2) NOT NULL DEFAULT 50;

-- widen ad_type check to allow display + video (keep legacy types — live rows use native/infeed)
ALTER TABLE ad_placements DROP CONSTRAINT IF EXISTS ad_placements_ad_type_check;
ALTER TABLE ad_placements ADD CONSTRAINT ad_placements_ad_type_check CHECK (ad_type IN ('banner','display','video','native','infeed','sticky','popup','interstitial'));

-- mark larger formats as video-capable
UPDATE ad_placements SET supports_video = true
WHERE position IN ('home_top_banner','post_top_banner','home_bottom_banner','category_top_banner','post_in_content_1','post_in_content_2','post_in_content_3');

-- sensible minimum bid floors per placement tier (₦ per 1,000 impressions / per click)
UPDATE ad_placements SET
  min_bid_cpm = CASE
    WHEN position IN ('home_top_banner','home_bottom_banner','post_top_banner','category_top_banner') THEN 1000
    WHEN position IN ('post_in_content_1','post_in_content_2','post_in_content_3','home_infeed_1') THEN 800
    ELSE 500 END,
  min_bid_cpc = CASE
    WHEN position IN ('home_top_banner','home_bottom_banner','post_top_banner','category_top_banner') THEN 100
    WHEN position IN ('post_in_content_1','post_in_content_2','post_in_content_3','home_infeed_1') THEN 80
    ELSE 50 END
WHERE is_active = true;

-- 2. ad_campaigns — auction columns + goals / CTA / audience / currency / video media
ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS goal TEXT NOT NULL DEFAULT 'impressions' CHECK (goal IN ('awareness','impressions','clicks','visits','app_downloads','conversions','leads')),
  ADD COLUMN IF NOT EXISTS cta_type TEXT NOT NULL DEFAULT 'learn_more' CHECK (cta_type IN ('learn_more','buy_now','get_started','sign_up','subscribe','download','book_now','contact_us','try_free','shop_now','watch_video','read_more','apply_now','call_now')),
  ADD COLUMN IF NOT EXISTS target_audience JSONB NOT NULL DEFAULT '{"countries":[],"devices":[],"interests":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(12,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT NOT NULL DEFAULT 'day' CHECK (billing_frequency IN ('day','week','month')),
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS daily_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- widen billing_model check so auction billing (cpm/cpc) is possible (legacy per_day/impressions kept)
ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_billing_model_check;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_billing_model_check CHECK (billing_model IN ('per_day','per_week','per_month','impressions','cpm','cpc'));

-- 3. Daily delivery stats — powers per-day performance charts in the Ads Manager
CREATE TABLE IF NOT EXISTS ad_campaign_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, stat_date)
);

ALTER TABLE ad_campaign_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers view own daily stats" ON ad_campaign_daily_stats
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM ad_campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));

CREATE POLICY "Admins view daily stats" ON ad_campaign_daily_stats
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','editor')));

-- RPC: bump today's delivery counters (AdSlot calls on serve / click)
CREATE OR REPLACE FUNCTION increment_campaign_daily_stats(campaign_id UUID, kind TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO ad_campaign_daily_stats (campaign_id, stat_date, impressions, clicks)
  VALUES (campaign_id, CURRENT_DATE,
          CASE WHEN kind = 'impressions' THEN 1 ELSE 0 END,
          CASE WHEN kind = 'clicks' THEN 1 ELSE 0 END)
  ON CONFLICT (campaign_id, stat_date)
  DO UPDATE SET
    impressions = ad_campaign_daily_stats.impressions + EXCLUDED.impressions,
    clicks = ad_campaign_daily_stats.clicks + EXCLUDED.clicks;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_campaign_daily_stats TO anon, authenticated;

-- 4. Public read on active placements (powers public /advertise + account Ads Manager)
CREATE POLICY "Public read active placements" ON ad_placements
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 5. FX rates for multi-currency pricing (base NGN; stored in site_settings so admin can update live)
INSERT INTO site_settings (key, value) VALUES
  ('fx_rates', '{"base":"NGN","NGN":1,"USD":1600,"EUR":1730,"GBP":2030,"GHS":127,"KES":12.4,"ZAR":88,"CAD":1170,"AUD":1050,"INR":19.2}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

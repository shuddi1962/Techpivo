-- Migration 044: Ad Marketplace V2
-- Video ads, campaign goals, CTA types, target audiences, multi-currency + billing frequencies (day/week/month)
-- Applied live: 2026-08-10

-- 1. ad_placements — weekly/monthly pricing + video capability
ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS price_per_week NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_month NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supports_video BOOLEAN NOT NULL DEFAULT false;

-- widen ad_type check to allow display + video (keep legacy types — live rows use native/infeed)
ALTER TABLE ad_placements DROP CONSTRAINT IF EXISTS ad_placements_ad_type_check;
ALTER TABLE ad_placements ADD CONSTRAINT ad_placements_ad_type_check CHECK (ad_type IN ('banner','display','video','native','infeed','sticky','popup','interstitial'));

-- backfill weekly/monthly from daily price (cheap transparent pricing: week = day*7*0.85, month = day*30*0.75)
UPDATE ad_placements
SET price_per_week = ROUND(price_per_day * 7 * 0.85, 2),
    price_per_month = ROUND(price_per_day * 30 * 0.75, 2)
WHERE price_per_day > 0 AND price_per_week = 0;

-- mark larger formats as video-capable
UPDATE ad_placements
SET supports_video = true
WHERE position IN ('home_top_banner','post_top_banner','home_bottom_banner','category_top_banner','post_in_content_1','post_in_content_2','post_in_content_3');

-- 2. ad_campaigns — goals, CTA, audience, currency, frequency, video media
ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS goal TEXT NOT NULL DEFAULT 'impressions' CHECK (goal IN ('awareness','impressions','clicks','visits','app_downloads','conversions','leads')),
  ADD COLUMN IF NOT EXISTS cta_type TEXT NOT NULL DEFAULT 'learn_more' CHECK (cta_type IN ('learn_more','buy_now','get_started','sign_up','subscribe','download','book_now','contact_us','try_free','shop_now','watch_video','read_more','apply_now','call_now')),
  ADD COLUMN IF NOT EXISTS target_audience JSONB NOT NULL DEFAULT '{"countries":[],"devices":[],"interests":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(12,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT NOT NULL DEFAULT 'day' CHECK (billing_frequency IN ('day','week','month')),
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- widen billing_model check so weekly/monthly orders can be represented
ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_billing_model_check;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_billing_model_check CHECK (billing_model IN ('per_day','per_week','per_month','impressions'));

-- 3. Public read on active placements (powers the public /advertise marketplace)
CREATE POLICY "Public read active placements" ON ad_placements
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 4. FX rates for multi-currency pricing (base NGN; stored in site_settings so admin can update live)
INSERT INTO site_settings (key, value) VALUES
  ('fx_rates', '{"base":"NGN","NGN":1,"USD":1600,"EUR":1730,"GBP":2030,"GHS":127,"KES":12.4,"ZAR":88,"CAD":1170,"AUD":1050,"INR":19.2}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

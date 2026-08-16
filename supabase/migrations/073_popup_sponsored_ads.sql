-- Migration 073: Popup + Sponsored Article ad types
-- 1) Ad position enum: add missing positions (category_top_banner + home_infeed_7/8 were referenced by live placements but never added to the enum; popup_toast + sponsored_article are new)
ALTER TYPE ad_position ADD VALUE IF NOT EXISTS 'category_top_banner';
ALTER TYPE ad_position ADD VALUE IF NOT EXISTS 'home_infeed_7';
ALTER TYPE ad_position ADD VALUE IF NOT EXISTS 'home_infeed_8';
ALTER TYPE ad_position ADD VALUE IF NOT EXISTS 'popup_toast';
ALTER TYPE ad_position ADD VALUE IF NOT EXISTS 'sponsored_article';

-- 2) ad_placements.ad_type CHECK: widen to include popup + sponsored_article
DO $$
BEGIN
  ALTER TABLE ad_placements DROP CONSTRAINT IF EXISTS ad_placements_ad_type_check;
  ALTER TABLE ad_placements ADD CONSTRAINT ad_placements_ad_type_check
    CHECK (ad_type IN ('banner','display','video','native','infeed','sticky','popup','interstitial','sponsored_article'));
END $$;

-- 3) Sponsored articles carry a content URL on the campaign
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS content_url TEXT;

-- 4) Public read of live/approved campaigns (AdSlot / PopupAd / SponsoredWidget render path — RLS currently blocks all anonymous reads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ad_campaigns' AND policyname = 'Public can view live campaigns'
  ) THEN
    CREATE POLICY "Public can view live campaigns" ON ad_campaigns
      FOR SELECT TO anon, authenticated
      USING (status IN ('approved','live') AND is_active = true);
  END IF;
END $$;

-- 5) Seed the two new placements (idempotent — guarded by position)
INSERT INTO ad_placements (name, location, position, description, ad_type, width, height, sizes, is_active, price_per_day, cpm, min_days, min_budget, est_impressions, advertisers, min_bid_cpm, min_bid_cpc)
SELECT * FROM (VALUES
  ('Popup Toast', 'global', 'popup_toast', 'Dismissible popup notification shown to visitors after a short delay. Great for flash offers and launches.', 'popup', 320, 480, '["320x480","300x250"]'::jsonb, true, 5000, 1000, 1, 5000, 50000, 0, 1000, 100),
  ('Sponsored Article', 'articles', 'sponsored_article', 'Sponsored article card in the sidebar and homepage. Links readers to your article.', 'sponsored_article', 300, 250, '["300x250"]'::jsonb, true, 8000, 1500, 1, 8000, 60000, 0, 1500, 150)
) AS s(name, location, position, description, ad_type, width, height, sizes, is_active, price_per_day, cpm, min_days, min_budget, est_impressions, advertisers, min_bid_cpm, min_bid_cpc)
WHERE NOT EXISTS (SELECT 1 FROM ad_placements WHERE position IN ('popup_toast','sponsored_article'));
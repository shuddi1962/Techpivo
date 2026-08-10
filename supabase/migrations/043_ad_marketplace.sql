-- ===================== AD MARKETPLACE (043) =====================
-- Turns the Ads section into a marketplace where users can buy ad space.
-- Applied live 2026-08-10.

-- 1. Ad placements: marketplace pricing columns
ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS price_per_day NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpm NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_days INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS min_budget NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS est_impressions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advertisers INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN ad_placements.price_per_day IS 'Price per day in Naira';
COMMENT ON COLUMN ad_placements.cpm IS 'Cost per 1000 impressions in Naira';

-- 2. Ad campaigns: order/advertiser columns
ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advertiser_email TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Learn More',
  ADD COLUMN IF NOT EXISTS placement_id UUID REFERENCES ad_placements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_model TEXT NOT NULL DEFAULT 'per_day' CHECK (billing_model IN ('per_day','impressions')),
  ADD COLUMN IF NOT EXISTS units INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','live','completed','paused','cancelled')),
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

COMMENT ON COLUMN ad_campaigns.status IS 'draft, pending (awaiting approval), approved, rejected, live, completed, paused, cancelled';

-- Existing campaigns become live/completed
UPDATE ad_campaigns SET status = 'live' WHERE is_active = true AND status = 'draft';
UPDATE ad_campaigns SET status = 'completed' WHERE is_active = false AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user ON ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement ON ad_campaigns(placement_id);

-- 3. RLS: advertisers can create and manage their own campaigns
DROP POLICY IF EXISTS "Users can create own ad campaigns" ON ad_campaigns;
CREATE POLICY "Users can create own ad campaigns"
ON ad_campaigns FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own ad campaigns" ON ad_campaigns;
CREATE POLICY "Users can view own ad campaigns"
ON ad_campaigns FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own ad campaigns" ON ad_campaigns;
CREATE POLICY "Users can update own ad campaigns"
ON ad_campaigns FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own ad campaigns" ON ad_campaigns;
CREATE POLICY "Users can delete own ad campaigns"
ON ad_campaigns FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 4. Stats RPCs for live ad serving (security definer: only increments counters)
CREATE OR REPLACE FUNCTION increment_campaign_impressions(campaign_id UUID, amount INT DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE ad_campaigns SET impressions = COALESCE(impressions,0) + amount WHERE id = campaign_id;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_clicks(campaign_id UUID, amount INT DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE ad_campaigns SET clicks = COALESCE(clicks,0) + amount WHERE id = campaign_id;
$$;

REVOKE ALL ON FUNCTION increment_campaign_impressions(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_campaign_impressions(UUID, INT) TO anon, authenticated;
REVOKE ALL ON FUNCTION increment_campaign_clicks(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_campaign_clicks(UUID, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION increment_ad_placement_advertisers(p_placement_id UUID, amount INT DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE ad_placements SET advertisers = GREATEST(0, COALESCE(advertisers,0) + amount) WHERE id = p_placement_id;
$$;

REVOKE ALL ON FUNCTION increment_ad_placement_advertisers(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_ad_placement_advertisers(UUID, INT) TO authenticated;

-- 5. Realtime: ad tables go live
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ad_placements;
    ALTER PUBLICATION supabase_realtime ADD TABLE ad_campaigns;
    ALTER PUBLICATION supabase_realtime ADD TABLE ad_schedules;
    ALTER PUBLICATION supabase_realtime ADD TABLE ad_revenue;
  END IF;
END $$;

-- 6. Seed marketplace placements (position keys match AD_POSITIONS in src/lib/constants.ts)
INSERT INTO ad_placements (name, location, position, description, ad_type, width, height, sizes, is_active, price_per_day, cpm, min_days, min_budget, est_impressions)
SELECT * FROM (VALUES
  ('Homepage Leaderboard', 'homepage', 'home_top_banner', '728x90 leaderboard at the very top of the homepage. Maximum visibility for every visitor.', 'banner', 728, 90, '["728x90","468x60"]'::jsonb, true, 25000, 3500, 7, 175000, 250000),
  ('Homepage Sticky Top', 'homepage', 'home_sticky_top', '728x90 sticky banner pinned to the top of the homepage. Follows the reader.', 'banner', 728, 90, '["728x90","468x60"]'::jsonb, true, 20000, 3000, 7, 140000, 200000),
  ('Homepage Sidebar', 'homepage', 'home_sidebar_top', '300x250 rectangle in the homepage sidebar. High engagement, great for brand campaigns.', 'banner', 300, 250, '["300x250","300x600"]'::jsonb, true, 15000, 2500, 7, 105000, 180000),
  ('Homepage In-feed #1', 'homepage', 'home_infeed_1', 'Native-style in-feed unit between homepage article cards. Blends with content.', 'infeed', 728, 90, '["728x90","468x60"]'::jsonb, true, 10000, 1800, 7, 70000, 150000),
  ('Homepage Bottom Banner', 'homepage', 'home_bottom_banner', '728x90 banner at the bottom of the homepage. Low cost, broad reach.', 'banner', 728, 90, '["728x90","468x60"]'::jsonb, true, 8000, 1500, 7, 56000, 120000),
  ('Article Top Leaderboard', 'articles', 'post_top_banner', '728x90 leaderboard at the top of every article page. Seen by engaged readers.', 'banner', 728, 90, '["728x90","468x60"]'::jsonb, true, 20000, 2800, 7, 140000, 220000),
  ('Article In-Content #1', 'articles', 'post_in_content_1', '336x280 display unit inside article body, right after the third paragraph. Highly visible.', 'infeed', 336, 280, '["336x280","300x250"]'::jsonb, true, 18000, 2600, 7, 126000, 200000),
  ('Article Sidebar', 'articles', 'post_sidebar_top', '300x250 unit in the article sidebar. Great for retargeting and product ads.', 'banner', 300, 250, '["300x250","300x600"]'::jsonb, true, 12000, 2200, 7, 84000, 160000),
  ('Category Top Banner', 'category', 'category_top_banner', '728x90 banner on every category page. Targeted by topic.', 'banner', 728, 90, '["728x90","468x60"]'::jsonb, true, 12000, 2000, 7, 84000, 130000),
  ('Category Sidebar', 'category', 'category_sidebar', '300x250 unit in the category sidebar. Contextual targeting by section.', 'banner', 300, 250, '["300x250"]'::jsonb, true, 9000, 1700, 7, 63000, 100000)
) AS v(name, location, position, description, ad_type, width, height, sizes, is_active, price_per_day, cpm, min_days, min_budget, est_impressions)
WHERE NOT EXISTS (SELECT 1 FROM ad_placements WHERE ad_placements.position = v.position);

-- Old non-marketplace seeded placements (positions don't map to served slots) get hidden
UPDATE ad_placements SET is_active = false, status = 'inactive'
WHERE position IN ('top','bottom','after_paragraph_3','after_paragraph_6','between_posts')
  AND is_active = true;

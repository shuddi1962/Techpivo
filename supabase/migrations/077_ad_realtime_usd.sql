-- 077: realtime-friendly public SELECT policies + home_infeed_1 video + USD floors + USD demo campaigns
--
-- 1) RLS: anon/authenticated subscribers must be able to SEE every NEW row (including
--    is_active=false / status=paused etc.) or Postgres broadcast drops the event
--    (empirically proven: pause/hide updates never reached anon realtime -> stale ad).
--    Visibility stays gated in components (AdSlot/popup/sponsored already filter
--    is_active + status + end_date in their queries).
DROP POLICY IF EXISTS "Public can view active ad campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Public can view live campaigns" ON ad_campaigns;
CREATE POLICY "Public can view ad campaigns" ON ad_campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active placements" ON ad_placements;
CREATE POLICY "Public read placements" ON ad_placements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active ads" ON ads;
CREATE POLICY "Public can view ads" ON ads FOR SELECT USING (true);

-- 2) home_infeed_1 must allow video (the video campaign was silently filtered out of serving)
UPDATE ad_placements SET supports_video = true WHERE id = '5411582e-1d4c-4bd0-a9b8-2a12a1ca5422';

-- 3) Placement floors -> clean USD values
UPDATE ad_placements SET min_bid_cpm = 1.00, min_bid_cpc = 0.10 WHERE position IN ('home_top_banner','home_bottom_banner','category_top_banner','popup_toast','post_top_banner','home_sidebar_mid','post_sidebar_mid');
UPDATE ad_placements SET min_bid_cpm = 0.80, min_bid_cpc = 0.08 WHERE position IN ('home_infeed_1','post_in_content_1');
UPDATE ad_placements SET min_bid_cpm = 0.50, min_bid_cpc = 0.05 WHERE position IN ('home_sticky_top','home_sidebar_top','category_sidebar','post_sidebar_top');
UPDATE ad_placements SET min_bid_cpm = 1.50, min_bid_cpc = 0.15 WHERE position = 'sponsored_article';
UPDATE ad_placements SET min_bid_cpm = 0.50, min_bid_cpc = 0.05 WHERE min_bid_cpm = 500.00 AND position IN ('top','bottom','between_posts','after_paragraph_3','after_paragraph_6');

-- 4) Demo campaigns -> USD (clean values; fx_rate 1)
UPDATE ad_campaigns SET currency = 'USD', fx_rate = 1, bid_amount = 1.00, daily_budget = 2.00, total_price = 2.00 WHERE id = '9d297dd1-d63f-48ca-9e48-576c10b618c3';
UPDATE ad_campaigns SET currency = 'USD', fx_rate = 1, bid_amount = 0.75, daily_budget = 1.50, total_price = 1.50 WHERE id = '0068e81b-2c16-41fb-970a-6ea74d01ab13';
UPDATE ad_campaigns SET currency = 'USD', fx_rate = 1, bid_amount = 1.25, daily_budget = 3.00, total_price = 3.00 WHERE id = 'f92cf8d5-aabb-4e52-a650-ec65eb446d65';
UPDATE ad_campaigns SET currency = 'USD', fx_rate = 1, bid_amount = 1.50, daily_budget = 2.50, total_price = 2.50 WHERE id = 'c48618c0-5c08-4f65-8236-d513f65726ee';
UPDATE ad_campaigns SET currency = 'USD', fx_rate = 1, bid_amount = 1.00, daily_budget = 5.00, total_price = 5.00 WHERE advertiser_name = 'TechPivo Studio';
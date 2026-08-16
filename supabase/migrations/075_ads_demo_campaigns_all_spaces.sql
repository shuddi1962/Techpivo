-- 075_ads_demo_campaigns_all_spaces.sql
-- 1. ad_position enum may be missing some positions (post_top_banner, home_sidebar_mid, post_sidebar_mid)
--    even though the placements/code reference them — without them, campaign inserts fail AND
--    real bookings for those spaces 500.
-- 2. Seed the two sidebar-mid placements (they exist in code + Sidebar.tsx but NOT in the DB).
-- 3. Seed live demo campaigns for every remaining ad placement so ALL sitewide slots serve ads.
-- Idempotent: enum guards + WHERE NOT EXISTS placement guard + only seeds where NO active
-- live/approved campaign occupies the position.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ad_position'::regtype AND enumlabel = 'post_top_banner') THEN
    ALTER TYPE ad_position ADD VALUE 'post_top_banner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ad_position'::regtype AND enumlabel = 'home_sidebar_mid') THEN
    ALTER TYPE ad_position ADD VALUE 'home_sidebar_mid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ad_position'::regtype AND enumlabel = 'post_sidebar_mid') THEN
    ALTER TYPE ad_position ADD VALUE 'post_sidebar_mid';
  END IF;
END $$;

-- Sidebar half-page placements consumed by Sidebar.tsx (home_sidebar_mid / post_sidebar_mid) — missing from DB.
INSERT INTO ad_placements (name, location, position, description, ad_type, width, height, sizes, is_active, price_per_day, cpm, min_days, min_budget, est_impressions, advertisers, min_bid_cpm, min_bid_cpc)
SELECT * FROM (VALUES
  ('Homepage Sidebar (Half Page)', 'sidebar', 'home_sidebar_mid', 'Tall sticky sidebar banner on the TechPivo homepage — high visibility, ideal for brand campaigns.', 'banner', 300, 600, '["300x600","300x250"]'::jsonb, true, 12000, 2500, 1, 150000, 45000, 0, 1000, 100),
  ('Article Sidebar (Half Page)', 'sidebar', 'post_sidebar_mid', 'Tall sidebar banner on article pages, shown between the top and bottom sidebar slots.', 'banner', 300, 600, '["300x600","300x250"]'::jsonb, true, 12000, 2500, 1, 150000, 35000, 0, 1000, 100)
) AS v(name, location, position, description, ad_type, width, height, sizes, is_active, price_per_day, cpm, min_days, min_budget, est_impressions, advertisers, min_bid_cpm, min_bid_cpc)
WHERE NOT EXISTS (SELECT 1 FROM ad_placements WHERE ad_placements.position IN ('home_sidebar_mid','post_sidebar_mid'));

INSERT INTO ad_campaigns (
  user_id, advertiser_email, advertiser_name, headline, description, cta_text,
  ad_image_url, destination_url, placement_id, positions,
  billing_model, billing_frequency, units, unit_price, total_price,
  budget, daily_budget, bid_amount, currency, fx_rate,
  goal, cta_type, target_audience, media_type, video_url, poster_url, content_url,
  start_date, end_date, status, submitted_at, approved_at, is_active
)
SELECT
  'fe1ede95-0a79-44e4-9af7-167a127fe362',
  'demo@techpivo.com',
  demo.advertiser_name,
  demo.headline,
  demo.description,
  demo.cta_text,
  demo.ad_image_url,
  demo.destination_url,
  ap.id,
  ARRAY[ap.position]::ad_position[],
  'cpm', 'day', 77, 1500, 385000,
  5000, 5000, 1500, 'NGN', 1,
  'clicks', 'learn_more', '{"countries":[],"devices":[],"interests":[]}'::jsonb,
  demo.media_type, demo.video_url, demo.poster_url, demo.content_url,
  '2026-08-16', '2026-10-31', 'live', now(), now(), true
FROM ad_placements ap
JOIN (
  VALUES
    ('home_bottom_banner', 'TechPivo Studio', 'Grow Your Tech Startup', 'Build, ship and scale with tools your team will actually love — see what TechPivo readers use.', 'Learn more', 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg', 'https://techpivo.com/tools', 'image', NULL, NULL, NULL),
    ('post_top_banner', 'TechPivo Studio', 'Level Up Your Coding Skills', 'Fresh tutorials, real projects and honest reviews — the developer learning hub TechPivo readers trust.', 'Start learning', 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg', 'https://techpivo.com/community', 'image', NULL, NULL, NULL),
    ('post_in_content_1', 'TechPivo Studio', 'Watch: Inside a Modern Data Center', 'See how the internet actually runs — a guided tour of racks, cooling and redundancy.', 'Watch now', 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg', 'https://techpivo.com/tools', 'video', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg', NULL),
    ('home_sidebar_top', 'TechPivo Studio', 'Build Faster with TechPivo Tools', 'Free utilities for developers, security, SEO and more — no signup, no ads, all in your browser.', 'Explore tools', 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg', 'https://techpivo.com/tools', 'image', NULL, NULL, NULL),
    ('home_sticky_top', 'TechPivo Studio', 'Your Daily Tech Briefing', 'AI, gadgets, security and programming — one sharp daily summary for busy builders.', 'Get the briefing', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg', 'https://techpivo.com/newsletter', 'image', NULL, NULL, NULL),
    ('category_top_banner', 'TechPivo Studio', 'Cybersecurity 101: Start Here', 'Practical guides to passwords, phishing and privacy — secure your setup this week.', 'Read the guide', 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg', 'https://techpivo.com/community', 'image', NULL, NULL, NULL),
    ('category_sidebar', 'TechPivo Studio', 'Compare Gadgets Before You Buy', 'Side-by-side comparisons and honest reviews that actually help you choose.', 'See comparisons', 'https://images.pexels.com/photos/159306/pexels-photo-159306.jpeg', 'https://techpivo.com/community', 'image', NULL, NULL, NULL),
    ('post_sidebar_top', 'TechPivo Studio', 'Master JavaScript in 30 Days', 'A guided path from syntax to shipped projects — join thousands of Techpivo learners.', 'Start the path', 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg', 'https://techpivo.com/community', 'image', NULL, NULL, NULL),
    ('home_sidebar_mid', 'TechPivo Studio', 'Ship It: Weekly Web Dev Digest', 'Hand-picked links, tools and lessons for frontend and full-stack builders — every Friday.', 'Subscribe free', 'https://images.pexels.com/photos/3184639/pexels-photo-3184639.jpeg', 'https://techpivo.com/newsletter', 'image', NULL, NULL, NULL),
    ('post_sidebar_mid', 'TechPivo Studio', 'The AI Stack, Explained Simply', 'From tokens to fine-tuning — plain-English guides to the AI tools every developer should know.', 'Read the guides', 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg', 'https://techpivo.com/community', 'image', NULL, NULL, NULL)
) AS demo(position_key, advertiser_name, headline, description, cta_text, ad_image_url, destination_url, media_type, video_url, poster_url, content_url)
  ON demo.position_key = ap.position
WHERE ap.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM ad_campaigns c
    WHERE c.positions @> ARRAY[ap.position]::ad_position[]
      AND c.is_active = true
      AND c.status IN ('approved', 'live')
      AND c.end_date >= CURRENT_DATE
  );

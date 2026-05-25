-- Seed Categories (10 categories)
INSERT INTO categories (id, name, slug, description, color, icon, created_at)
VALUES
  (gen_random_uuid(), 'Tech News',        'tech-news',        'Breaking tech headlines from top publications',  '#3B82F6', '📡', now()),
  (gen_random_uuid(), 'AI & Automation',  'ai-automation',    'Artificial intelligence, ML, and automation',   '#6366F1', '🤖', now()),
  (gen_random_uuid(), 'Cybersecurity',    'cybersecurity',    'Security, hacking, privacy, and threats',       '#EF4444', '🔒', now()),
  (gen_random_uuid(), 'Gadgets',          'gadgets',          'Phones, laptops, wearables, and devices',       '#F59E0B', '📱', now()),
  (gen_random_uuid(), 'Programming',      'programming',      'Code, frameworks, languages, and dev tools',    '#10B981', '💻', now()),
  (gen_random_uuid(), 'Web Development',  'web-development',  'Frontend, backend, and web technologies',       '#8B5CF6', '🌐', now()),
  (gen_random_uuid(), 'Tutorials',        'tutorials',        'Guides, how-tos, and step-by-step walkthroughs','#06B6D4', '📚', now()),
  (gen_random_uuid(), 'Digital Business', 'digital-business', 'Startups, funding, and tech industry news',     '#EC4899', '💼', now()),
  (gen_random_uuid(), 'Networking & IT',  'networking-it',    'Cloud, servers, infrastructure, and DevOps',    '#14B8A6', '🖧',  now()),
  (gen_random_uuid(), 'Reviews',          'reviews',          'Product reviews, rankings, and buying guides',  '#F97316', '⭐', now())
ON CONFLICT (slug) DO NOTHING;

-- Insert all RSS feeds using helper function
CREATE OR REPLACE FUNCTION cat(slug_val TEXT)
RETURNS UUID AS $$
  SELECT id FROM categories WHERE slug = slug_val LIMIT 1;
$$ LANGUAGE SQL;

-- TECH NEWS (13 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'The Verge', 'https://www.theverge.com/rss/index.xml', cat('tech-news'), true, true, true, 30, now()),
(gen_random_uuid(), 'TechCrunch', 'https://techcrunch.com/feed/', cat('tech-news'), true, true, true, 30, now()),
(gen_random_uuid(), 'Engadget', 'https://www.engadget.com/rss.xml', cat('tech-news'), true, true, true, 30, now()),
(gen_random_uuid(), 'Gizmodo', 'https://gizmodo.com/feed/rss', cat('tech-news'), true, true, true, 30, now()),
(gen_random_uuid(), 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'CNET', 'https://www.cnet.com/rss/all/', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'Wired', 'https://www.wired.com/feed/rss', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'Tom''s Guide', 'https://www.tomsguide.com/feeds/rss2/news.xml', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'TechRadar', 'https://www.techradar.com/feeds/rss/news.xml', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'ZDNet', 'https://www.zdnet.com/news/rss.xml', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'Mashable Tech', 'https://mashable.com/feeds/rss/tech.xml', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'Digital Trends', 'https://www.digitaltrends.com/feed/', cat('tech-news'), true, true, true, 60, now()),
(gen_random_uuid(), 'MIT Tech Review', 'https://www.technologyreview.com/stories.rss', cat('tech-news'), true, true, true, 120, now());

-- AI & AUTOMATION (6 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'VentureBeat AI', 'https://venturebeat.com/category/ai/feed/', cat('ai-automation'), true, true, true, 30, now()),
(gen_random_uuid(), 'The Verge – AI', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', cat('ai-automation'), true, true, true, 30, now()),
(gen_random_uuid(), 'TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/', cat('ai-automation'), true, true, true, 30, now()),
(gen_random_uuid(), 'Wired AI', 'https://www.wired.com/feed/tag/artificial-intelligence/rss', cat('ai-automation'), true, true, true, 60, now()),
(gen_random_uuid(), 'MIT Tech Review AI', 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', cat('ai-automation'), true, true, true, 120, now()),
(gen_random_uuid(), 'Ars Technica AI', 'https://feeds.arstechnica.com/arstechnica/ai', cat('ai-automation'), true, true, true, 60, now());

-- CYBERSECURITY (6 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'BleepingComputer', 'https://www.bleepingcomputer.com/feed/', cat('cybersecurity'), true, true, true, 30, now()),
(gen_random_uuid(), 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', cat('cybersecurity'), true, true, true, 30, now()),
(gen_random_uuid(), 'SecurityWeek', 'https://www.securityweek.com/feed/', cat('cybersecurity'), true, true, true, 60, now()),
(gen_random_uuid(), 'Krebs on Security', 'https://krebsonsecurity.com/feed/', cat('cybersecurity'), true, true, true, 120, now()),
(gen_random_uuid(), 'Dark Reading', 'https://www.darkreading.com/rss.xml', cat('cybersecurity'), true, true, true, 60, now()),
(gen_random_uuid(), 'Threatpost', 'https://threatpost.com/feed/', cat('cybersecurity'), true, true, true, 60, now());

-- GADGETS (8 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), '9to5Mac', 'https://9to5mac.com/feed/', cat('gadgets'), true, true, true, 30, now()),
(gen_random_uuid(), 'MacRumors', 'https://feeds.macrumors.com/MacRumors-All', cat('gadgets'), true, true, true, 30, now()),
(gen_random_uuid(), '9to5Google', 'https://9to5google.com/feed/', cat('gadgets'), true, true, true, 30, now()),
(gen_random_uuid(), 'Android Authority', 'https://www.androidauthority.com/feed/', cat('gadgets'), true, true, true, 30, now()),
(gen_random_uuid(), 'PCMag', 'https://www.pcmag.com/feeds/rss/software', cat('gadgets'), true, true, true, 60, now()),
(gen_random_uuid(), 'AppleInsider', 'https://appleinsider.com/rss/news/', cat('gadgets'), true, true, true, 60, now()),
(gen_random_uuid(), 'Tom''s Hardware', 'https://www.tomshardware.com/feeds/all', cat('gadgets'), true, true, true, 60, now()),
(gen_random_uuid(), 'GSMArena', 'https://www.gsmarena.com/rss-news-reviews.php3', cat('gadgets'), true, true, true, 60, now());

-- PROGRAMMING (5 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'Dev.to', 'https://dev.to/feed', cat('programming'), true, true, true, 30, now()),
(gen_random_uuid(), 'GitHub Blog', 'https://github.blog/feed/', cat('programming'), true, true, true, 60, now()),
(gen_random_uuid(), 'Stack Overflow Blog', 'https://stackoverflow.blog/feed/', cat('programming'), true, true, true, 120, now()),
(gen_random_uuid(), 'Hacker News Best', 'https://hnrss.org/best', cat('programming'), true, true, true, 60, now()),
(gen_random_uuid(), 'freeCodeCamp', 'https://www.freecodecamp.org/news/rss/', cat('programming'), true, true, true, 120, now());

-- WEB DEVELOPMENT (4 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'Smashing Magazine', 'https://www.smashingmagazine.com/feed/', cat('web-development'), true, true, true, 120, now()),
(gen_random_uuid(), 'CSS-Tricks', 'https://css-tricks.com/feed/', cat('web-development'), true, true, true, 120, now()),
(gen_random_uuid(), 'web.dev', 'https://web.dev/feed.xml', cat('web-development'), true, true, true, 120, now()),
(gen_random_uuid(), 'Netlify Blog', 'https://www.netlify.com/blog/index.xml', cat('web-development'), true, true, true, 120, now());

-- TUTORIALS (3 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'DigitalOcean Tutorials', 'https://www.digitalocean.com/community/tutorials/feed', cat('tutorials'), true, true, true, 120, now()),
(gen_random_uuid(), 'MakeUseOf', 'https://www.makeuseof.com/feed/', cat('tutorials'), true, true, true, 60, now()),
(gen_random_uuid(), 'How-To Geek', 'https://www.howtogeek.com/feed/', cat('tutorials'), true, true, true, 60, now());

-- DIGITAL BUSINESS (4 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'TechCrunch Startups', 'https://techcrunch.com/category/startups/feed/', cat('digital-business'), true, true, true, 30, now()),
(gen_random_uuid(), 'VentureBeat', 'https://venturebeat.com/feed/', cat('digital-business'), true, true, true, 60, now()),
(gen_random_uuid(), 'Business Insider Tech', 'https://feeds.businessinsider.com/businessinsider/tech', cat('digital-business'), true, true, true, 60, now()),
(gen_random_uuid(), 'Fast Company Tech', 'https://www.fastcompany.com/technology/rss', cat('digital-business'), true, true, true, 120, now());

-- NETWORKING & IT (4 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'Network World', 'https://www.networkworld.com/index.rss', cat('networking-it'), true, true, true, 60, now()),
(gen_random_uuid(), 'The Register', 'https://www.theregister.com/headlines.atom', cat('networking-it'), true, true, true, 60, now()),
(gen_random_uuid(), 'AWS Blog', 'https://aws.amazon.com/blogs/aws/feed/', cat('networking-it'), true, true, true, 120, now()),
(gen_random_uuid(), 'Google Cloud Blog', 'https://cloud.google.com/feeds/gcp-news-rss.xml', cat('networking-it'), true, true, true, 120, now());

-- REVIEWS (5 feeds)
INSERT INTO rss_feeds (id, feed_name, feed_url, category_id, is_active, auto_rewrite, auto_publish, fetch_interval_minutes, created_at) VALUES
(gen_random_uuid(), 'PCMag Reviews', 'https://www.pcmag.com/feeds/rss/reviews', cat('reviews'), true, true, true, 60, now()),
(gen_random_uuid(), 'CNET Reviews', 'https://www.cnet.com/rss/reviews/', cat('reviews'), true, true, true, 60, now()),
(gen_random_uuid(), 'Wirecutter', 'https://www.nytimes.com/wirecutter/feed/', cat('reviews'), true, true, true, 120, now()),
(gen_random_uuid(), 'Rtings', 'https://www.rtings.com/news/feed', cat('reviews'), true, true, true, 120, now()),
(gen_random_uuid(), 'NotebookCheck', 'https://www.notebookcheck.net/News.rss', cat('reviews'), true, true, true, 60, now());

-- Drop the helper function
DROP FUNCTION IF EXISTS cat(TEXT);

-- Seed subcategories
DO $$
DECLARE
  cat_web_dev UUID; cat_programming UUID; cat_ai UUID; cat_security UUID;
BEGIN
  SELECT id INTO cat_web_dev FROM categories WHERE slug = 'web-development';
  SELECT id INTO cat_programming FROM categories WHERE slug = 'programming';
  SELECT id INTO cat_ai FROM categories WHERE slug = 'ai-automation';
  SELECT id INTO cat_security FROM categories WHERE slug = 'cybersecurity';

  INSERT INTO subcategories (category_id, name, slug) VALUES
    (cat_web_dev, 'Frontend', 'frontend'),
    (cat_web_dev, 'Backend', 'backend'),
    (cat_web_dev, 'CSS & Design', 'css-design'),
    (cat_programming, 'JavaScript', 'javascript'),
    (cat_programming, 'Python', 'python'),
    (cat_programming, 'TypeScript', 'typescript'),
    (cat_ai, 'Machine Learning', 'machine-learning'),
    (cat_ai, 'LLMs', 'llms'),
    (cat_security, 'Ethical Hacking', 'ethical-hacking'),
    (cat_security, 'Privacy', 'privacy');
END $$;

-- Seed affiliate program configs
INSERT INTO affiliate_program_configs (program_key, program_name, api_type, search_enabled) VALUES
  ('amazon', 'Amazon Associates', 'direct_api', true),
  ('ebay', 'eBay Partner Network', 'direct_api', true),
  ('cj', 'Commission Junction', 'cj', true),
  ('shareasale', 'ShareASale', 'shareasale', true),
  ('impact', 'Impact Radius', 'impact', true),
  ('rakuten', 'Rakuten Advertising', 'rakuten', true),
  ('awin', 'Awin', 'awin', true),
  ('udemy', 'Udemy Affiliate', 'direct_api', true),
  ('bluehost', 'Bluehost Affiliate', 'direct_api', true),
  ('hostinger', 'Hostinger Affiliate', 'direct_api', true)
ON CONFLICT (program_key) DO NOTHING;

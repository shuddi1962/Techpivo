-- Seed Categories
INSERT INTO categories (name, slug, description, color) VALUES
  ('Tech News', 'tech-news', 'Latest technology news and updates', '#3B82F6'),
  ('Web Development', 'web-development', 'Frontend, backend, and full-stack web development', '#8B5CF6'),
  ('Programming', 'programming', 'Software development, languages, and best practices', '#10B981'),
  ('Cybersecurity', 'cybersecurity', 'Security threats,防护, and best practices', '#EF4444'),
  ('AI & Automation', 'ai-automation', 'Artificial intelligence and automation technologies', '#F59E0B'),
  ('Gadgets', 'gadgets', 'Reviews and news about the latest gadgets', '#EC4899'),
  ('Tutorials', 'tutorials', 'Step-by-step guides and tutorials', '#14B8A6'),
  ('Digital Business', 'digital-business', 'Startups, entrepreneurship, and digital business', '#6366F1'),
  ('Networking & IT Support', 'networking-it-support', 'Networking, IT infrastructure, and support', '#F97316'),
  ('Reviews', 'reviews', 'In-depth product and service reviews', '#06B6D4')
ON CONFLICT (slug) DO NOTHING;

-- Seed RSS Feeds for each category
DO $$
DECLARE
  cat_tech_news UUID; cat_web_dev UUID; cat_programming UUID;
  cat_security UUID; cat_ai UUID; cat_gadgets UUID;
  cat_tutorials UUID; cat_business UUID; cat_networking UUID; cat_reviews UUID;
BEGIN
  SELECT id INTO cat_tech_news FROM categories WHERE slug = 'tech-news';
  SELECT id INTO cat_web_dev FROM categories WHERE slug = 'web-development';
  SELECT id INTO cat_programming FROM categories WHERE slug = 'programming';
  SELECT id INTO cat_security FROM categories WHERE slug = 'cybersecurity';
  SELECT id INTO cat_ai FROM categories WHERE slug = 'ai-automation';
  SELECT id INTO cat_gadgets FROM categories WHERE slug = 'gadgets';
  SELECT id INTO cat_tutorials FROM categories WHERE slug = 'tutorials';
  SELECT id INTO cat_business FROM categories WHERE slug = 'digital-business';
  SELECT id INTO cat_networking FROM categories WHERE slug = 'networking-it-support';
  SELECT id INTO cat_reviews FROM categories WHERE slug = 'reviews';

  -- Tech News feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_tech_news, 'https://techcrunch.com/feed/', 'TechCrunch'),
    (cat_tech_news, 'https://feeds.arstechnica.com/arstechnica/index', 'Ars Technica'),
    (cat_tech_news, 'https://www.wired.com/feed/rss', 'Wired'),
    (cat_tech_news, 'https://www.theverge.com/rss/index.xml', 'The Verge');

  -- Web Development feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_web_dev, 'https://css-tricks.com/feed/', 'CSS-Tricks'),
    (cat_web_dev, 'https://www.smashingmagazine.com/feed/', 'Smashing Magazine'),
    (cat_web_dev, 'https://dev.to/feed/tag/webdev', 'Dev.to Web Dev');

  -- Programming feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_programming, 'https://dev.to/feed', 'Dev.to'),
    (cat_programming, 'https://freecodecamp.org/news/rss', 'freeCodeCamp');

  -- Cybersecurity feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_security, 'https://krebsonsecurity.com/feed/', 'Krebs on Security'),
    (cat_security, 'https://threatpost.com/feed/', 'Threatpost');

  -- AI feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_ai, 'https://venturebeat.com/category/ai/feed/', 'VentureBeat AI'),
    (cat_ai, 'https://towardsdatascience.com/feed', 'Towards Data Science');

  -- Gadgets feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_gadgets, 'https://www.engadget.com/rss.xml', 'Engadget'),
    (cat_gadgets, 'https://gizmodo.com/rss', 'Gizmodo');

  -- Tutorials feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_tutorials, 'https://dev.to/feed/tag/tutorial', 'Dev.to Tutorials'),
    (cat_tutorials, 'https://www.digitalocean.com/community/tutorials/feed', 'DigitalOcean Tutorials');

  -- Business feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_business, 'https://www.entrepreneur.com/feed.rss', 'Entrepreneur'),
    (cat_business, 'https://techcrunch.com/startups/feed/', 'TechCrunch Startups');

  -- Networking feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_networking, 'https://www.networkworld.com/news/rss.xml', 'Network World'),
    (cat_networking, 'https://www.bleepingcomputer.com/feed/', 'BleepingComputer');

  -- Reviews feeds
  INSERT INTO rss_feeds (category_id, feed_url, feed_name) VALUES
    (cat_reviews, 'https://www.pcmag.com/feeds/rss', 'PCMag'),
    (cat_reviews, 'https://www.techradar.com/feeds/rss.xml', 'TechRadar');
END $$;

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

-- Seed default admin profile (requires auth.users entry first)
-- This is handled by the trigger on auth.users creation

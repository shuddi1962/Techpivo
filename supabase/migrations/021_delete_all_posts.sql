-- Delete all existing posts and reset RSS feed counters
-- This clears all content for a fresh start with Gemini-powered rewriting

-- Delete related data first (respecting foreign keys)
DELETE FROM social_posts;
DELETE FROM newsletter_sends;
DELETE FROM comments;
DELETE FROM reactions;
DELETE FROM reading_list;
DELETE FROM google_indexing_queue;
DELETE FROM analytics_events;
DELETE FROM affiliate_products;
DELETE FROM push_subscriptions;

-- Delete all posts
DELETE FROM posts;

-- Reset RSS feed counters
UPDATE rss_feeds SET posts_fetched = 0, last_fetched_at = NULL;

-- Reset daily article count
DELETE FROM daily_article_count;

-- Reset Gemini usage log for a clean slate
DELETE FROM gemini_usage_log;
DELETE FROM ai_usage_log;

-- Reset keyword articles
DELETE FROM keyword_articles;

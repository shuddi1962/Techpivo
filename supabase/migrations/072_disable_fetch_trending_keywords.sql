-- Kill switch for the daily fetch-trending-keywords pipeline (03:45 UTC Vercel
-- dashboard cron -> /api/cron/fetch-trending-keywords -> edge function).
-- While fetch_trending_keywords_enabled = false (or missing), BOTH the cron
-- route and the edge function no-op, so draft keyword_articles are never
-- re-created. Flip to true to re-enable.

INSERT INTO site_settings (key, value)
VALUES ('fetch_trending_keywords_enabled', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb;
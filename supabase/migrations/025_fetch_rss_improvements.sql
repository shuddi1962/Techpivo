-- ===========================================================
-- Migration 025: Improve RSS fetching — real-time, no drafts,
-- no old posts, forced Gemini rewrite
-- ===========================================================

-- 1. Index original_source_url for fast dedup checks
CREATE INDEX IF NOT EXISTS idx_posts_original_source_url ON posts(original_source_url);

-- 2. Force auto_rewrite = true on all active feeds
UPDATE rss_feeds SET auto_rewrite = true WHERE is_active = true;

-- 3. Increase daily cap from 10 to 50 so frequent runs can ingest
INSERT INTO site_settings (key, value) VALUES ('rss_daily_cap', '50')
ON CONFLICT (key) DO UPDATE SET value = '50', updated_at = NOW();

-- 4. Update pg_cron to run every 30 minutes instead of once daily
-- This ensures fresh content is fetched within 30 min of publication
DO $$
BEGIN
  PERFORM cron.unschedule('fetch-rss-feeds-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule fetch-rss-feeds-daily: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'fetch-rss-feeds-daily',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xkhvojjogoeuvrifekwr.supabase.co/functions/v1/fetch-rss-feeds',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer PLACEHOLDER_SUPABASE_SERVICE_ROLE_KEY'
    )::jsonb,
    body:='{"max_posts":20}'::jsonb
  ) AS request_id;
  $$
);

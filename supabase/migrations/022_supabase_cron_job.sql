-- Enable extensions for cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the fetch-rss-feeds edge function to run daily at 6:00 AM
-- This replaces the old Vercel/GitHub cron jobs
-- The edge function will fetch up to 20 posts per day

-- Safely remove any existing schedule with this name
DO $$
BEGIN
  PERFORM cron.unschedule('fetch-rss-feeds-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule fetch-rss-feeds-daily: %', SQLERRM;
END;
$$;

-- Schedule the daily RSS fetch job
SELECT cron.schedule(
  'fetch-rss-feeds-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://xkhvojjogoeuvrifekwr.supabase.co/functions/v1/fetch-rss-feeds',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHZvampvZ29ldXZyaWZla3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU1MjYzMywiZXhwIjoyMDk1MTI4NjMzfQ.06p7J_Gr9CW3nyGc1f0HGj8hXad5U8nJ9yt9XKC9aa8'
    )::jsonb,
    body:='{"max_posts":20}'::jsonb
  ) AS request_id;
  $$
);

-- Also schedule a weekly cleanup of old logs (Sundays at 2 AM)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-logs');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule cleanup-old-logs: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'cleanup-old-logs',
  '0 2 * * 0',
  $$
  DELETE FROM gemini_usage_log WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM ai_usage_log WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);

-- Set default daily RSS cap to 20
INSERT INTO site_settings (key, value) VALUES ('rss_daily_cap', '20')
ON CONFLICT (key) DO UPDATE SET value = '20', updated_at = NOW();

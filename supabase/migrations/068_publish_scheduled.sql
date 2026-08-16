-- 068: Supabase pg_cron dispatcher for scheduled post publishing
-- Polls https://techpivo.com/api/cron/publish-scheduled every minute; that endpoint
-- flips posts with status='scheduled' and scheduled_at <= now() to published,
-- then revalidates the public homepage + article page.
-- No Vercel cron needed — runs entirely inside Postgres (same pattern as 047).

-- Dispatcher: reads the secret from site_settings, then fires the endpoint.
CREATE OR REPLACE FUNCTION public.publish_scheduled_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT value::text INTO v_secret
  FROM site_settings
  WHERE key = 'cron_secret';

  IF v_secret IS NULL OR v_secret = '' OR v_secret = 'null' THEN
    RAISE NOTICE 'cron_secret missing in site_settings; publish-scheduled dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/publish-scheduled',
    headers := jsonb_build_object('Authorization', 'Bearer ' || btrim(v_secret, '"'))
  );
END;
$$;

-- SECURITY DEFINER functions in public are callable by ALL roles by default — lock down.
REVOKE ALL ON FUNCTION public.publish_scheduled_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_scheduled_dispatcher() TO postgres;

-- Idempotent schedule: every minute
DO $$
BEGIN
  PERFORM cron.unschedule('techpivo-publish-scheduled');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule techpivo-publish-scheduled: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'techpivo-publish-scheduled',
  '* * * * *',
  $$ SELECT public.publish_scheduled_dispatcher(); $$
);
-- 047: Supabase pg_cron dispatcher for scheduled reports
-- Polls https://techpivo.com/api/cron/reports hourly; that endpoint decides which
-- report_schedules rows are due (daily/weekly/monthly) and emails them.
-- No Vercel cron needed — runs entirely inside Postgres.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Random secret generated AT APPLY TIME (never committed to the repo).
-- /api/cron/reports accepts it as Bearer via site_settings.cron_secret fallback.
INSERT INTO site_settings (key, value)
VALUES ('cron_secret', to_jsonb(replace(gen_random_uuid()::text, '-', '')))
ON CONFLICT (key) DO NOTHING;

-- Dispatcher: reads the secret from site_settings, then fires the endpoint.
CREATE OR REPLACE FUNCTION public.report_cron_dispatcher()
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
    RAISE NOTICE 'cron_secret missing in site_settings; report cron dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/reports',
    headers := jsonb_build_object('Authorization', 'Bearer ' || btrim(v_secret, '"'))
  );
END;
$$;

-- SECURITY DEFINER functions in public are callable by ALL roles by default — lock down.
REVOKE ALL ON FUNCTION public.report_cron_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_cron_dispatcher() TO postgres;

-- Idempotent schedule: hourly at minute 0 (endpoint self-selects due schedules)
DO $$
BEGIN
  PERFORM cron.unschedule('techpivo-report-cron');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule techpivo-report-cron: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'techpivo-report-cron',
  '0 * * * *',
  $$ SELECT public.report_cron_dispatcher(); $$
);

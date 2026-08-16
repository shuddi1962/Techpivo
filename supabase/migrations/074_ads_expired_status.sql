-- 074: 'expired' status for ad campaigns + auto-expire dispatcher
-- The public ad renderers filter end_date >= today, but campaigns past their
-- end date should ALSO be marked expired + deactivated in the DB. A daily
-- pg_cron job (same pattern as 047/068) fires https://techpivo.com/api/cron/ads-expire
-- which flips live/approved campaigns past end_date to expired + is_active=false.

-- 1. Widen the status CHECK constraint (created inline in 043 -> ad_campaigns_status_check)
ALTER TABLE public.ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_status_check;
ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT ad_campaigns_status_check
  CHECK (status IN ('draft','pending','approved','rejected','live','completed','paused','cancelled','expired'));

-- 2. Backfill: anything currently serving with end_date in the past -> expired + off
UPDATE public.ad_campaigns
SET status = 'expired', is_active = false
WHERE status IN ('live','approved')
  AND is_active = true
  AND end_date IS NOT NULL
  AND end_date < CURRENT_DATE;

-- 3. Dispatcher function (mirrors publish_scheduled_dispatcher in 068)
CREATE OR REPLACE FUNCTION public.ads_expire_dispatcher()
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
    RAISE NOTICE 'cron_secret missing in site_settings; ads-expire dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/ads-expire',
    headers := jsonb_build_object('Authorization', 'Bearer ' || btrim(v_secret, '"'))
  );
END;
$$;

-- SECURITY DEFINER functions in public are callable by ALL roles by default — lock down.
REVOKE ALL ON FUNCTION public.ads_expire_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ads_expire_dispatcher() TO postgres;

-- 4. Idempotent schedule: daily at 00:05 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('techpivo-ads-expire');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule techpivo-ads-expire: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'techpivo-ads-expire',
  '5 0 * * *',
  $$ SELECT public.ads_expire_dispatcher(); $$
);
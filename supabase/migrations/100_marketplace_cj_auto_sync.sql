-- 100 — Automatic CJ sync (marketplace <-> CJDropshipping)
--
-- The store and the CJDropshipping platform must stay in step without a
-- human pressing a button. A pg_cron job (same pattern as 047/068/074)
-- fires https://techpivo.com/api/cron/marketplace-sync every 10 minutes.
-- That route:
--   1. pulls the CJ order status back into marketplace_orders,
--   2. gives every catalogue product a supplier variant (cj_vid),
--   3. pushes every catalogue product into CJ "My Products".

CREATE OR REPLACE FUNCTION public.marketplace_sync_dispatcher()
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
    RAISE NOTICE 'cron_secret missing in site_settings; marketplace-sync dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/marketplace-sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || btrim(v_secret, '"'))
  );
END;
$$;

-- SECURITY DEFINER functions in public are callable by ALL roles by default - lock down.
REVOKE ALL ON FUNCTION public.marketplace_sync_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_sync_dispatcher() TO postgres;

-- Idempotent schedule: every 10 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('techpivo-marketplace-sync');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule techpivo-marketplace-sync: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'techpivo-marketplace-sync',
  '*/10 * * * *',
  $$ SELECT public.marketplace_sync_dispatcher(); $$
);

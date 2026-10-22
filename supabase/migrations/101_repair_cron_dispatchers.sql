-- 101 — Repair the pg_cron dispatchers
--
-- The cron secret moved to the server-only `site_secrets` table (migration
-- 097) and the `site_settings.cron_secret` row was deleted — so EVERY
-- dispatcher (reports, publish-scheduled, ads-expire, marketplace-sync)
-- silently did nothing. The row is back, but the dispatchers read it in a
-- way that produced a double-quoted Bearer token, so they answered 401.
--
-- Fix: read the secret from `site_secrets` first (the server-only store,
-- where it is a plain string), fall back to `site_settings`, and strip
-- every layer of quoting before building the header.

CREATE OR REPLACE FUNCTION public._cron_secret_value()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  -- The server-only secret store is the source of truth.
  BEGIN
    SELECT value::text INTO v_secret FROM public.site_secrets WHERE key = 'cron_secret';
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  IF v_secret IS NULL OR v_secret = '' OR v_secret = 'null' THEN
    SELECT value::text INTO v_secret FROM public.site_settings WHERE key = 'cron_secret';
  END IF;

  -- Strip every layer of JSON quoting: "secret" -> secret
  v_secret := btrim(btrim(btrim(COALESCE(v_secret, ''), '"'), '"'), '"');
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public._cron_secret_value() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._cron_secret_value() TO postgres;

-- ── marketplace sync (100) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marketplace_sync_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  v_secret := public._cron_secret_value();
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'cron_secret missing; marketplace-sync dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/marketplace-sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)
  );
END;
$$;

-- ── publish scheduled (068) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_scheduled_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  v_secret := public._cron_secret_value();
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'cron_secret missing; publish-scheduled dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/publish-scheduled',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)
  );
END;
$$;

-- ── ads expire (074) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ads_expire_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  v_secret := public._cron_secret_value();
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'cron_secret missing; ads-expire dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/ads-expire',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)
  );
END;
$$;

-- ── reports (047) ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.report_cron_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  v_secret := public._cron_secret_value();
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'cron_secret missing; report cron dispatch skipped';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := 'https://techpivo.com/api/cron/reports',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_sync_dispatcher() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_scheduled_dispatcher() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_expire_dispatcher() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.report_cron_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_sync_dispatcher() TO postgres;
GRANT EXECUTE ON FUNCTION public.publish_scheduled_dispatcher() TO postgres;
GRANT EXECUTE ON FUNCTION public.ads_expire_dispatcher() TO postgres;
GRANT EXECUTE ON FUNCTION public.report_cron_dispatcher() TO postgres;

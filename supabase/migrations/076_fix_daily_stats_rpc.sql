-- Migration 076: Fix increment_campaign_daily_stats — rename params to eliminate
-- the plpgsql variable/column ambiguity (42702 "column reference campaign_id is ambiguous")
-- that BOTH the 044 unqualified version AND the 045 function-name-qualified version raised.
-- Proven live (2026-08-16): a direct postgres-role call of the 045 qualified body still
-- raised 42702 — the bare `campaign_id` in the INSERT column list / ON CONFLICT target
-- stays ambiguous against the same-named parameter no matter how VALUES is qualified.
-- Renaming params to p_campaign_id/p_kind removes the collision entirely.
-- NOTE: client RPC call sites were updated to send {p_campaign_id, p_kind} (AdSlot, popup-ad, sponsored-widget).

DROP FUNCTION IF EXISTS increment_campaign_daily_stats(uuid, text);

CREATE FUNCTION increment_campaign_daily_stats(p_campaign_id UUID, p_kind TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO ad_campaign_daily_stats (campaign_id, stat_date, impressions, clicks)
  VALUES (p_campaign_id, CURRENT_DATE,
          CASE WHEN p_kind = 'impressions' THEN 1 ELSE 0 END,
          CASE WHEN p_kind = 'clicks' THEN 1 ELSE 0 END)
  ON CONFLICT (campaign_id, stat_date)
  DO UPDATE SET
    impressions = ad_campaign_daily_stats.impressions + EXCLUDED.impressions,
    clicks = ad_campaign_daily_stats.clicks + EXCLUDED.clicks;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_campaign_daily_stats(UUID, TEXT) TO anon, authenticated;
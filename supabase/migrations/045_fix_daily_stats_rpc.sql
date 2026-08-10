-- Migration 045: Fix increment_campaign_daily_stats — column reference "campaign_id" was ambiguous
-- (function parameter vs table column). Qualify references with the function name.
-- Applied live: 2026-08-10

CREATE OR REPLACE FUNCTION increment_campaign_daily_stats(campaign_id UUID, kind TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO ad_campaign_daily_stats (campaign_id, stat_date, impressions, clicks)
  VALUES (increment_campaign_daily_stats.campaign_id, CURRENT_DATE,
          CASE WHEN increment_campaign_daily_stats.kind = 'impressions' THEN 1 ELSE 0 END,
          CASE WHEN increment_campaign_daily_stats.kind = 'clicks' THEN 1 ELSE 0 END)
  ON CONFLICT (campaign_id, stat_date)
  DO UPDATE SET
    impressions = ad_campaign_daily_stats.impressions + EXCLUDED.impressions,
    clicks = ad_campaign_daily_stats.clicks + EXCLUDED.clicks;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_campaign_daily_stats(UUID, TEXT) TO anon, authenticated;

-- 037_ai_feature_usage.sql
-- Tracks usage of non-Gemini AI features (breaking news polling, agent-reach
-- channels, editorial intelligence) so the AI Usage Center shows real activity.
-- Gemini API calls stay in gemini_usage_log (quota-protected); this table is
-- informational and throttled (logAIUsageThrottled) to avoid polling floods.

CREATE TABLE IF NOT EXISTS ai_feature_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature     TEXT NOT NULL,
  headline    TEXT,
  status      TEXT DEFAULT 'success',
  duration_ms INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feature_usage_feature_date
  ON ai_feature_usage(feature, created_at DESC);

ALTER TABLE ai_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read" ON ai_feature_usage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role only" ON ai_feature_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Extend the weekly cleanup to also purge feature usage rows older than 30 days
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
  DELETE FROM ai_feature_usage WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);

-- 046: Analytics V2 — session/device tracking + Report scheduling
-- Part of Analytics Center + Report Center rebuild.

-- 1) Richer analytics_events
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS os TEXT;
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- 2) Report schedules (Report Center auto-delivery)
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('daily','weekly','monthly','seo','revenue','audience')),
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily','weekly','monthly')),
  format TEXT NOT NULL DEFAULT 'md' CHECK (format IN ('md','csv')),
  email TEXT,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read report_schedules" ON report_schedules;
CREATE POLICY "Authenticated read report_schedules" ON report_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage report_schedules" ON report_schedules;
CREATE POLICY "Admins manage report_schedules" ON report_schedules
  FOR ALL USING (is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE report_schedules;

-- 3) Ad campaign daily stats realtime (Revenue tab live transactions)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS ad_campaign_daily_stats;

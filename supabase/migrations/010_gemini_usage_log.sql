CREATE TABLE IF NOT EXISTS gemini_usage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  used_for    TEXT NOT NULL,
  headline    TEXT,
  model       TEXT DEFAULT 'gemini-2.5-flash-grounded',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gemini_usage_date
  ON gemini_usage_log(used_for, created_at DESC);

ALTER TABLE gemini_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON gemini_usage_log
  FOR ALL USING (auth.role() = 'service_role');

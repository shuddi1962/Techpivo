-- Create daily_article_count table for tracking daily RSS ingestion caps
CREATE TABLE IF NOT EXISTS daily_article_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to increment daily article count
CREATE OR REPLACE FUNCTION increment_daily_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_article_count (date, count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date)
  DO UPDATE SET count = daily_article_count.count + 1, updated_at = NOW();
END;
$$;

-- Index for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_daily_article_count_date ON daily_article_count(date);

-- Enable RLS
ALTER TABLE daily_article_count ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage
CREATE POLICY "Service role can manage daily_article_count" ON daily_article_count
  FOR ALL USING (auth.role() = 'service_role');

-- Allow admins/editors to read
CREATE POLICY "Admins can read daily_article_count" ON daily_article_count
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor'))
  );

-- Insert default daily cap setting
INSERT INTO site_settings (key, value) VALUES ('rss_daily_cap', '30') ON CONFLICT (key) DO NOTHING;

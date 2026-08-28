-- Add status + duration_ms columns so the AI Usage Center can show
-- success/error rates and average response times.
ALTER TABLE ai_usage_log
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Add to realtime publication so the admin page gets live INSERT events.
ALTER PUBLICATION supabase_realtime ADD TABLE ai_usage_log;

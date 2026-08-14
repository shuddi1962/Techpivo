-- 062: community topics performance indexes
-- Applied live via Management API 2026-08-14. Idempotent + re-runnable.

CREATE INDEX IF NOT EXISTS idx_topic_follows_topic ON public.topic_follows (topic_id);
CREATE INDEX IF NOT EXISTS idx_post_topics_topic ON public.post_topics (topic_id);
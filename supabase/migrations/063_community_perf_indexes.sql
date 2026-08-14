-- P15 performance: targeted indexes for hot community queries
-- APPLIED live 2026-08-14 (verified). Idempotent + re-runnable.
CREATE INDEX IF NOT EXISTS idx_reading_history_user_updated ON public.user_reading_history (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON public.event_rsvps (user_id);
CREATE INDEX IF NOT EXISTS idx_xp_log_ref ON public.user_xp_log (reference_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_last_reply ON public.forum_posts (last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON public.quiz_attempts (user_id, created_at DESC);
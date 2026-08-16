-- 070_post_delete_fk_fix.sql
-- ROOT CAUSE: deleting a post failed with an FK violation because
-- analytics_events.post_id (written on EVERY page view) and
-- newsletter_sends.post_id used ON DELETE NO ACTION — any post with
-- views/sends was undeletable ("Failed to delete post.", never synced to DB).
-- FIX: SET NULL preserves analytics/newsletter history while allowing deletes.
-- APPLIED LIVE 2026-08-16 via Management API, verified confdeltype = n on both.

ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_post_id_fkey;
ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;

ALTER TABLE newsletter_sends
  DROP CONSTRAINT IF EXISTS newsletter_sends_post_id_fkey;
ALTER TABLE newsletter_sends
  ADD CONSTRAINT newsletter_sends_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;
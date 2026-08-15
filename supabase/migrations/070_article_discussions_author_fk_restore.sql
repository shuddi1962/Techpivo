-- 070_article_discussions_author_fk_restore.sql
-- Migration 049 dropped article_discussions_author_id_fkey (guest comments) which
-- BROKE PostgREST embeds: every .select("*, author:user_profiles(...)") on
-- article_discussions returned PGRST200 "Could not find a relationship" ->
-- comment posting + comment lists silently failed for everyone.
-- Restore the FK (ON DELETE SET NULL keeps guest comments author_id NULL valid).

ALTER TABLE public.article_discussions
  DROP CONSTRAINT IF EXISTS article_discussions_author_id_fkey;

ALTER TABLE public.article_discussions
  ADD CONSTRAINT article_discussions_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- NOTE: forum_votes.user_id FK NOT restored - migration 065 seeded votes with
-- fake user IDs absent from auth.users, so the constraint cannot be re-added
-- without deleting seed rows. Not needed for any current embed.

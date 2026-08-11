-- 049: Allow guest + authenticated comments on posts, fix vote FKs, realtime for discussions
-- (Comments were silently failing: article_discussions insert policy required auth.uid()
--  so guest posts (author_id NULL) were denied; author_id FK required a user_profiles
--  row (admin-invited users have none) so auth posts also failed; forum_votes.reply_id
--  only referenced forum_replies so article- discussion votes violated the FK.)

-- 1) Guests can post, authenticated users post as themselves.
DROP POLICY IF EXISTS "Authenticated users can discuss" ON public.article_discussions;
CREATE POLICY "Anyone can start a discussion" ON public.article_discussions
  FOR INSERT WITH CHECK (author_id IS NULL OR auth.uid() = author_id);

-- 2) Drop FKs that blocked real users who lack user_profiles rows,
--    and allow forum_votes.reply_id to reference article_discussions too.
ALTER TABLE public.article_discussions DROP CONSTRAINT IF EXISTS article_discussions_author_id_fkey;
ALTER TABLE public.forum_votes DROP CONSTRAINT IF EXISTS forum_votes_user_id_fkey;
ALTER TABLE public.forum_votes DROP CONSTRAINT IF EXISTS forum_votes_reply_id_fkey;

-- 3) Realtime: new comments appear live on the post page.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'article_discussions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.article_discussions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'forum_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_votes;
  END IF;
END $$;
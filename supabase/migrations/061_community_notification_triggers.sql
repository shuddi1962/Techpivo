-- 061_community_notification_triggers.sql
-- DB-driven community notifications: replies -> post author, follows -> followed user.
-- Idempotent — safe to re-run.

-- Central notify helper (SECURITY DEFINER so it can insert under RLS, respects prefs).
CREATE OR REPLACE FUNCTION public.notify_community(p_user_id uuid, p_type text, p_title text, p_message text, p_link text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs jsonb;
  allowed boolean;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT notification_preferences INTO prefs FROM user_profiles WHERE id = p_user_id;
  IF prefs IS NULL THEN prefs := '{}'::jsonb; END IF;

  allowed := COALESCE((prefs->>'forum_replies')::boolean, true);
  IF p_type = 'follow' THEN
    allowed := COALESCE((prefs->>'new_followers')::boolean, true);
  END IF;
  IF NOT allowed THEN RETURN; END IF;

  INSERT INTO user_notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_community(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_community(uuid, text, text, text, text) TO postgres, service_role;

-- New reply/answer -> notify the post author (skips self-replies).
CREATE OR REPLACE FUNCTION public.notify_on_forum_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
  post_title text;
  post_slug text;
  post_category_slug text;
  author_name text;
  target_link text;
BEGIN
  SELECT fp.author_id, fp.title, fp.slug, fc.slug
    INTO post_author, post_title, post_slug, post_category_slug
    FROM forum_posts fp
    LEFT JOIN forum_categories fc ON fc.id = fp.category_id
   WHERE fp.id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.author_id THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, username, 'Someone') INTO author_name FROM user_profiles WHERE id = NEW.author_id;

  IF NEW.reply_type = 'answer' THEN
    target_link := '/answers/' || COALESCE(post_slug, NEW.post_id::text) || '?focus=' || NEW.id::text;
  ELSE
    target_link := '/community/forum/' || COALESCE(post_category_slug, 'general') || '/' || NEW.post_id::text;
  END IF;

  PERFORM public.notify_community(
    post_author,
    'answer',
    CASE WHEN NEW.reply_type = 'answer' THEN 'New answer to your question' ELSE 'New reply to your post' END,
    author_name || ' — "' || left(post_title, 80) || '"',
    target_link
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_forum_reply ON public.forum_replies;
CREATE TRIGGER trg_notify_forum_reply
AFTER INSERT ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_on_forum_reply();

-- New follow -> notify the followed user.
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO follower_name FROM user_profiles WHERE id = NEW.follower_id;
  PERFORM public.notify_community(
    NEW.following_id,
    'follow',
    'New follower',
    follower_name || ' started following you',
    '/u/' || COALESCE((SELECT username FROM user_profiles WHERE id = NEW.follower_id), NEW.follower_id::text)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON public.user_follows;
CREATE TRIGGER trg_notify_follow
AFTER INSERT ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Perf indexes for feed + notifications.
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON public.user_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_type ON public.forum_replies (post_id, reply_type);
CREATE INDEX IF NOT EXISTS idx_forum_posts_type_status ON public.forum_posts (content_type, question_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_created ON public.forum_posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows (follower_id, following_id);
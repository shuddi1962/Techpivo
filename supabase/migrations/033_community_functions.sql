-- =====================================================
-- MIGRATION 033: Community SQL Functions
-- Helper functions for community features
-- =====================================================

-- Increment poll vote count
CREATE OR REPLACE FUNCTION increment_poll_votes(poll_id UUID, option_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE polls SET total_votes = total_votes + 1 WHERE id = poll_id;
  UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = option_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment reply count on forum post
CREATE OR REPLACE FUNCTION increment_reply_count(target_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_posts SET reply_count = reply_count + 1, last_reply_at = now() WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment view count
CREATE OR REPLACE FUNCTION increment_views(target_id TEXT, target_type TEXT DEFAULT 'post')
RETURNS VOID AS $$
BEGIN
  IF target_type = 'post' THEN
    UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id::text = target_id;
  ELSIF target_type = 'forum' THEN
    UPDATE forum_posts SET view_count = view_count + 1 WHERE id::text = target_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award XP to user
CREATE OR REPLACE FUNCTION award_xp(target_user_id UUID, xp_amount INT, action_name TEXT, desc TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles SET xp = xp + xp_amount WHERE id = target_user_id;
  INSERT INTO user_xp_log (user_id, action, xp_amount, description) VALUES (target_user_id, action_name, xp_amount, desc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update forum vote count
CREATE OR REPLACE FUNCTION update_post_vote_count(target_post_id UUID)
RETURNS VOID AS $$
DECLARE
  new_count INT;
BEGIN
  SELECT COALESCE(SUM(vote_type), 0) INTO new_count FROM forum_votes WHERE post_id = target_post_id;
  UPDATE forum_posts SET vote_count = new_count WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reply vote count
CREATE OR REPLACE FUNCTION update_reply_vote_count(target_reply_id UUID)
RETURNS VOID AS $$
DECLARE
  new_count INT;
BEGIN
  SELECT COALESCE(SUM(vote_type), 0) INTO new_count FROM forum_votes WHERE reply_id = target_reply_id;
  UPDATE forum_replies SET vote_count = new_count WHERE id = target_reply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

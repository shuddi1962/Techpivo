-- =====================================================
-- MIGRATION 057: Community RLS + missing functions + realtime + seed
-- Fixes "community not functional": all community tables had RLS enabled
-- with ZERO policies (queries silently denied), migration 033 functions were
-- never applied, publication was missing community tables, and forum
-- categories were never seeded.
-- Applied live 2026-08-12 via Management API (first batch: RLS policies +
-- functions + realtime + forum/quiz/poll seeds + discussion_replies).
-- SECOND batch applied live (2026-08-12): community_events + event_rsvps
-- (first batch stopped before them — relation did not exist), event seeds.
-- THIRD batch applied live (2026-08-12): handle_new_user trigger extended to
-- also create user_profiles rows (all community tables FK to user_profiles.id;
-- table was EMPTY → every vote/post/reply/attempt/XP insert failed FK) +
-- backfill user_profiles from existing auth.users. Whole file is idempotent.
-- =====================================================

-- ---------- RLS POLICIES ----------
-- CREATE POLICY has no IF NOT EXISTS; guard via pg_policies checks.

-- forum_categories: public read, admin manage
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_categories' AND policyname='forum_categories public read') THEN
  CREATE POLICY "forum_categories public read" ON forum_categories FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_categories' AND policyname='forum_categories admin all') THEN
  CREATE POLICY "forum_categories admin all" ON forum_categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- forum_posts: public read, authenticated insert, own update/delete, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='forum_posts public read') THEN
  CREATE POLICY "forum_posts public read" ON forum_posts FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='forum_posts authenticated insert') THEN
  CREATE POLICY "forum_posts authenticated insert" ON forum_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='forum_posts own update') THEN
  CREATE POLICY "forum_posts own update" ON forum_posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='forum_posts own delete') THEN
  CREATE POLICY "forum_posts own delete" ON forum_posts FOR DELETE USING (auth.uid() = author_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='forum_posts admin all') THEN
  CREATE POLICY "forum_posts admin all" ON forum_posts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- forum_replies: public read, authenticated insert, own update/delete, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_replies' AND policyname='forum_replies public read') THEN
  CREATE POLICY "forum_replies public read" ON forum_replies FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_replies' AND policyname='forum_replies authenticated insert') THEN
  CREATE POLICY "forum_replies authenticated insert" ON forum_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_replies' AND policyname='forum_replies own update') THEN
  CREATE POLICY "forum_replies own update" ON forum_replies FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_replies' AND policyname='forum_replies own delete') THEN
  CREATE POLICY "forum_replies own delete" ON forum_replies FOR DELETE USING (auth.uid() = author_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_replies' AND policyname='forum_replies admin all') THEN
  CREATE POLICY "forum_replies admin all" ON forum_replies FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- forum_votes: public read, own insert/update/delete
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_votes' AND policyname='forum_votes public read') THEN
  CREATE POLICY "forum_votes public read" ON forum_votes FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_votes' AND policyname='forum_votes own insert') THEN
  CREATE POLICY "forum_votes own insert" ON forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_votes' AND policyname='forum_votes own update') THEN
  CREATE POLICY "forum_votes own update" ON forum_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_votes' AND policyname='forum_votes own delete') THEN
  CREATE POLICY "forum_votes own delete" ON forum_votes FOR DELETE USING (auth.uid() = user_id);
END IF; END $$;

-- quizzes: public read, admin manage
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quizzes' AND policyname='quizzes public read') THEN
  CREATE POLICY "quizzes public read" ON quizzes FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quizzes' AND policyname='quizzes admin all') THEN
  CREATE POLICY "quizzes admin all" ON quizzes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- quiz_questions: public read, admin manage
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_questions' AND policyname='quiz_questions public read') THEN
  CREATE POLICY "quiz_questions public read" ON quiz_questions FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_questions' AND policyname='quiz_questions admin all') THEN
  CREATE POLICY "quiz_questions admin all" ON quiz_questions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- quiz_attempts: owner read/insert/update, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_attempts' AND policyname='quiz_attempts owner read') THEN
  CREATE POLICY "quiz_attempts owner read" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_attempts' AND policyname='quiz_attempts owner insert') THEN
  CREATE POLICY "quiz_attempts owner insert" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_attempts' AND policyname='quiz_attempts owner update') THEN
  CREATE POLICY "quiz_attempts owner update" ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_attempts' AND policyname='quiz_attempts admin all') THEN
  CREATE POLICY "quiz_attempts admin all" ON quiz_attempts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- polls: public read, admin manage
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='polls' AND policyname='polls public read') THEN
  CREATE POLICY "polls public read" ON polls FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='polls' AND policyname='polls admin all') THEN
  CREATE POLICY "polls admin all" ON polls FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- poll_options: public read, admin manage
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_options' AND policyname='poll_options public read') THEN
  CREATE POLICY "poll_options public read" ON poll_options FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_options' AND policyname='poll_options admin all') THEN
  CREATE POLICY "poll_options admin all" ON poll_options FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- poll_votes: owner read/insert, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_votes' AND policyname='poll_votes owner read') THEN
  CREATE POLICY "poll_votes owner read" ON poll_votes FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_votes' AND policyname='poll_votes owner insert') THEN
  CREATE POLICY "poll_votes owner insert" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_votes' AND policyname='poll_votes admin all') THEN
  CREATE POLICY "poll_votes admin all" ON poll_votes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- user_xp_log: owner read/insert, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_xp_log' AND policyname='user_xp_log owner read') THEN
  CREATE POLICY "user_xp_log owner read" ON user_xp_log FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_xp_log' AND policyname='user_xp_log owner insert') THEN
  CREATE POLICY "user_xp_log owner insert" ON user_xp_log FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_xp_log' AND policyname='user_xp_log admin all') THEN
  CREATE POLICY "user_xp_log admin all" ON user_xp_log FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- user_follows: public read, own insert/delete
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_follows' AND policyname='user_follows public read') THEN
  CREATE POLICY "user_follows public read" ON user_follows FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_follows' AND policyname='user_follows own insert') THEN
  CREATE POLICY "user_follows own insert" ON user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_follows' AND policyname='user_follows own delete') THEN
  CREATE POLICY "user_follows own delete" ON user_follows FOR DELETE USING (auth.uid() = follower_id);
END IF; END $$;

-- user_bookmarks: own read/insert/delete
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_bookmarks' AND policyname='user_bookmarks owner read') THEN
  CREATE POLICY "user_bookmarks owner read" ON user_bookmarks FOR SELECT USING (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_bookmarks' AND policyname='user_bookmarks owner insert') THEN
  CREATE POLICY "user_bookmarks owner insert" ON user_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_bookmarks' AND policyname='user_bookmarks owner delete') THEN
  CREATE POLICY "user_bookmarks owner delete" ON user_bookmarks FOR DELETE USING (auth.uid() = user_id);
END IF; END $$;

-- user_reading_history: own read/insert/update
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_reading_history' AND policyname='user_reading_history owner read') THEN
  CREATE POLICY "user_reading_history owner read" ON user_reading_history FOR SELECT USING (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_reading_history' AND policyname='user_reading_history owner insert') THEN
  CREATE POLICY "user_reading_history owner insert" ON user_reading_history FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_reading_history' AND policyname='user_reading_history owner update') THEN
  CREATE POLICY "user_reading_history owner update" ON user_reading_history FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF; END $$;

-- user_badges: owner read, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND policyname='user_badges owner read') THEN
  CREATE POLICY "user_badges owner read" ON user_badges FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND policyname='user_badges admin all') THEN
  CREATE POLICY "user_badges admin all" ON user_badges FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- user_notifications: owner read/update, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_notifications' AND policyname='user_notifications owner read') THEN
  CREATE POLICY "user_notifications owner read" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_notifications' AND policyname='user_notifications owner update') THEN
  CREATE POLICY "user_notifications owner update" ON user_notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_notifications' AND policyname='user_notifications admin all') THEN
  CREATE POLICY "user_notifications admin all" ON user_notifications FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- discussion_replies (article comment replies): table did not exist in live DB (032 never ran)
CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES article_discussions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON discussion_replies TO anon, authenticated, service_role;

-- discussion_replies (article comment replies): public read, authenticated insert, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='discussion_replies' AND policyname='discussion_replies public read') THEN
  CREATE POLICY "discussion_replies public read" ON discussion_replies FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='discussion_replies' AND policyname='discussion_replies authenticated insert') THEN
  CREATE POLICY "discussion_replies authenticated insert" ON discussion_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='discussion_replies' AND policyname='discussion_replies admin all') THEN
  CREATE POLICY "discussion_replies admin all" ON discussion_replies FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- article_discussions: public read (insert policy exists from 049)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='article_discussions' AND policyname='article_discussions public read') THEN
  CREATE POLICY "article_discussions public read" ON article_discussions FOR SELECT USING (true);
END IF; END $$;

-- user_profiles: allow users to read their OWN profile (needed by /api/community/xp which updates own xp via session client)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='Users can view own profile') THEN
  CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
END IF; END $$;

-- learning_path_lessons: admin manage (public select exists)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_path_lessons' AND policyname='learning_path_lessons admin all') THEN
  CREATE POLICY "learning_path_lessons admin all" ON learning_path_lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- ---------- MISSING FUNCTIONS (033 never applied; adapted to live schema) ----------

CREATE OR REPLACE FUNCTION award_xp(target_user_id UUID, xp_amount INT, action_name TEXT, "desc" TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_profiles (id, xp, level)
  VALUES (target_user_id, xp_amount, 1)
  ON CONFLICT (id) DO UPDATE SET xp = COALESCE(user_profiles.xp, 0) + EXCLUDED.xp;
  INSERT INTO user_xp_log (user_id, amount, reason) VALUES (target_user_id, xp_amount, COALESCE("desc", action_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_poll_votes(poll_id UUID, option_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE polls SET total_votes = COALESCE(total_votes, 0) + 1 WHERE id = poll_id;
  UPDATE poll_options SET vote_count = COALESCE(vote_count, 0) + 1 WHERE id = option_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_reply_count(target_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_posts SET reply_count = COALESCE(reply_count, 0) + 1, last_reply_at = now() WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_post_vote_count(target_post_id UUID)
RETURNS VOID AS $$
DECLARE new_count INT;
BEGIN
  SELECT COALESCE(SUM(vote_type), 0) INTO new_count FROM forum_votes WHERE post_id = target_post_id;
  UPDATE forum_posts SET vote_count = new_count WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_reply_vote_count(target_reply_id UUID)
RETURNS VOID AS $$
DECLARE new_count INT;
BEGIN
  SELECT COALESCE(SUM(vote_type), 0) INTO new_count FROM forum_votes WHERE reply_id = target_reply_id;
  UPDATE forum_replies SET vote_count = new_count WHERE id = target_reply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_quiz_stats(qid UUID, new_score INT)
RETURNS VOID AS $$
DECLARE cur_count INT; cur_avg NUMERIC; new_count INT;
BEGIN
  SELECT attempt_count, avg_score INTO cur_count, cur_avg FROM quizzes WHERE id = qid;
  new_count := COALESCE(cur_count, 0) + 1;
  UPDATE quizzes SET attempt_count = new_count,
    avg_score = COALESCE(ROUND(((COALESCE(cur_avg, 0) * COALESCE(cur_count, 0) + new_score) / new_count)::numeric, 2), 0)
  WHERE id = qid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_views(target_id TEXT, target_type TEXT DEFAULT 'post')
RETURNS VOID AS $$
BEGIN
  IF target_type = 'post' THEN
    UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id::text = target_id;
  ELSIF target_type = 'forum' THEN
    UPDATE forum_posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id::text = target_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_xp(UUID, INT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_poll_votes(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_reply_count(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_post_vote_count(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_reply_vote_count(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_quiz_stats(UUID, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_views(TEXT, TEXT) TO anon, authenticated, service_role;

-- community_events (used by /community/events + /api/community/events — table did not exist live)
CREATE TABLE IF NOT EXISTS community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meetup' CHECK (event_type IN ('meetup', 'conference', 'hackathon', 'webinar', 'workshop', 'launch', 'other')),
  location TEXT,
  url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_virtual BOOLEAN DEFAULT false,
  max_participants INT,
  current_participants INT DEFAULT 0,
  created_by UUID,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_events_start ON community_events(start_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON community_events TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_rsvps TO anon, authenticated, service_role;

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- community_events: public read, admin manage
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_events' AND policyname='community_events public read') THEN
  CREATE POLICY "community_events public read" ON community_events FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_events' AND policyname='community_events admin all') THEN
  CREATE POLICY "community_events admin all" ON community_events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- event_rsvps: public read, owner insert/delete, admin all
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_rsvps' AND policyname='event_rsvps public read') THEN
  CREATE POLICY "event_rsvps public read" ON event_rsvps FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_rsvps' AND policyname='event_rsvps owner insert') THEN
  CREATE POLICY "event_rsvps owner insert" ON event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_rsvps' AND policyname='event_rsvps owner delete') THEN
  CREATE POLICY "event_rsvps owner delete" ON event_rsvps FOR DELETE USING (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_rsvps' AND policyname='event_rsvps admin all') THEN
  CREATE POLICY "event_rsvps admin all" ON event_rsvps FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor')));
END IF; END $$;

-- ---------- REALTIME PUBLICATION ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['forum_categories','forum_posts','forum_replies','quizzes','quiz_questions','quiz_attempts','polls','poll_options','poll_votes','user_xp_log','user_follows','user_bookmarks','user_reading_history','user_badges','user_notifications','discussion_replies','learning_path_lessons','community_events','event_rsvps']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ---------- SEED: FORUM CATEGORIES ----------
INSERT INTO forum_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Programming', 'programming', 'Code, languages, frameworks, and development', '💻', '#3B82F6', 1),
  ('Cybersecurity', 'cybersecurity', 'Security, privacy, and threats', '🛡', '#EF4444', 2),
  ('AI & Machine Learning', 'ai', 'Artificial intelligence, ML, and automation', '🤖', '#8B5CF6', 3),
  ('Gaming', 'gaming', 'Games, consoles, and gaming tech', '🎮', '#F59E0B', 4),
  ('Linux', 'linux', 'Linux distros, commands, and servers', '🐧', '#F97316', 5),
  ('Windows', 'windows', 'Windows OS, tips, and troubleshooting', '🪟', '#06B6D4', 6),
  ('Hardware', 'hardware', 'PC builds, components, and peripherals', '🔧', '#6366F1', 7),
  ('Career', 'career', 'Jobs, skills, and professional growth', '📈', '#10B981', 8),
  ('Web Development', 'webdev', 'HTML, CSS, JS, and web frameworks', '🌐', '#EC4899', 9),
  ('Mobile', 'mobile', 'Android, iOS, and mobile apps', '📱', '#14B8A6', 10),
  ('Networking', 'networking', 'Networks, servers, and infrastructure', '📡', '#0EA5E9', 11),
  ('General', 'general', 'General tech discussions', '💬', '#6B7280', 12)
ON CONFLICT (slug) DO NOTHING;

-- ---------- SEED: STARTER QUIZZES ----------
DO $$
DECLARE qid UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'JavaScript Fundamentals') THEN
    INSERT INTO quizzes (title, description, category, difficulty, question_count, is_published)
    VALUES ('JavaScript Fundamentals', 'Test your core JavaScript knowledge: variables, functions, arrays, and more.', 'Programming', 'easy', 5, true)
    RETURNING id INTO qid;

    INSERT INTO quiz_questions (quiz_id, question, question_type, options, correct_answer, explanation, points, sort_order) VALUES
      (qid, 'Which keyword declares a block-scoped variable?', 'multiple_choice', '["var","let","const","both B and C"]', 'both B and C', 'let and const are block-scoped; var is function-scoped.', 1, 0),
      (qid, 'What does typeof null return?', 'multiple_choice', '["null","undefined","object","number"]', 'object', 'A historic quirk of the language.', 1, 1),
      (qid, 'Which method adds an element to the end of an array?', 'multiple_choice', '["shift()","push()","pop()","unshift()"]', 'push()', 'push() appends to the end.', 1, 2),
      (qid, 'JavaScript is a statically typed language.', 'true_false', '["True","False"]', 'False', 'JavaScript is dynamically typed.', 1, 3),
      (qid, 'What does JSON.stringify() do?', 'multiple_choice', '["Parses JSON","Converts an object to a JSON string","Validates JSON","Compresses JSON"]', 'Converts an object to a JSON string', 'It serializes values into a JSON string.', 1, 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Cybersecurity Basics') THEN
    INSERT INTO quizzes (title, description, category, difficulty, question_count, is_published)
    VALUES ('Cybersecurity Basics', 'How well do you know the fundamentals of staying safe online?', 'Cybersecurity', 'medium', 5, true)
    RETURNING id INTO qid;

    INSERT INTO quiz_questions (quiz_id, question, question_type, options, correct_answer, explanation, points, sort_order) VALUES
      (qid, 'What does 2FA stand for?', 'multiple_choice', '["Two-Factor Authentication","Two-Firewall Access","Total File Access","Two-Factor Authorization"]', 'Two-Factor Authentication', '2FA adds a second verification step.', 1, 0),
      (qid, 'Which of these is the strongest password?', 'multiple_choice', '["password123","Qwerty!2024","Tr0ub4dor&3-River","letmein"]', 'Tr0ub4dor&3-River', 'Length + variety wins.', 1, 1),
      (qid, 'HTTPS encrypts traffic between your browser and the server.', 'true_false', '["True","False"]', 'True', 'TLS/SSL encrypts the connection.', 1, 2),
      (qid, 'What is phishing?', 'multiple_choice', '["A type of malware","A social engineering attack","A network protocol","A firewall rule"]', 'A social engineering attack', 'Phishing tricks people into revealing credentials.', 1, 3),
      (qid, 'A VPN makes you 100% anonymous online.', 'true_false', '["True","False"]', 'False', 'VPNs hide your IP but not all activity.', 1, 4);
  END IF;
END $$;

-- ---------- SEED: STARTER POLLS ----------
DO $$
DECLARE pid UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM polls WHERE title = 'Which programming language are you learning next?') THEN
    INSERT INTO polls (title, description, is_active) VALUES
      ('Which programming language are you learning next?', 'Vote for the language you plan to pick up next.', true)
    RETURNING id INTO pid;

    INSERT INTO poll_options (poll_id, text, sort_order) VALUES
      (pid, 'Rust', 0), (pid, 'Go', 1), (pid, 'TypeScript', 2), (pid, 'Python', 3), (pid, 'Other', 4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM polls WHERE title = 'How often do you back up your data?') THEN
    INSERT INTO polls (title, description, is_active) VALUES
      ('How often do you back up your data?', 'Good backups save careers. How disciplined are you?', true)
    RETURNING id INTO pid;

    INSERT INTO poll_options (poll_id, text, sort_order) VALUES
      (pid, 'Daily / automated', 0), (pid, 'Weekly', 1), (pid, 'Monthly', 2), (pid, 'Rarely', 3), (pid, 'Never', 4);
  END IF;
END $$;

-- ---------- SEED: STARTER EVENTS ----------
-- launch_events (Launch Center / editorial intelligence feed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM launch_events WHERE title = 'Google I/O 2026') THEN
    INSERT INTO launch_events (title, description, event_type, category, brand, product_name, event_date, source_url, is_published)
    VALUES ('Google I/O 2026', 'Google''s annual developer conference with the latest Android, AI, and Cloud announcements.', 'conference', 'AI & Automation', 'Google', 'Google I/O', '2026-05-19 09:00:00+00', 'https://io.google/', true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM launch_events WHERE title = 'iPhone 17 Launch Event') THEN
    INSERT INTO launch_events (title, description, event_type, category, brand, product_name, event_date, source_url, is_published)
    VALUES ('iPhone 17 Launch Event', 'Apple''s September keynote unveiling the next iPhone generation.', 'product_launch', 'Gadgets', 'Apple', 'iPhone 17', '2026-09-09 17:00:00+00', 'https://www.apple.com/apple-events/', true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM launch_events WHERE title = 'RSA Conference 2026') THEN
    INSERT INTO launch_events (title, description, event_type, category, brand, product_name, event_date, source_url, is_published)
    VALUES ('RSA Conference 2026', 'The world''s largest cybersecurity conference covering threats, defense, and innovation.', 'conference', 'Cybersecurity', 'RSA Conference', 'RSA Conference', '2026-06-01 08:00:00+00', 'https://www.rsaconference.com/', true);
  END IF;
END $$;

-- Seed 3 upcoming community events (2026 dates — today is 2026-08-12)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Google I/O 2026 Developer Conference') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, is_published)
    VALUES ('Google I/O 2026 Developer Conference', 'Google''s annual developer conference: Android, AI, and Cloud announcements with live sessions.', 'conference', NULL, 'https://io.google/', '2026-09-08 16:00:00+00', '2026-09-10 22:00:00+00', true, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Nairobi AI Meetup — LLMs in Production') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, is_published)
    VALUES ('Nairobi AI Meetup — LLMs in Production', 'Hands-on meetup on deploying large language models: RAG, fine-tuning, and cost control.', 'meetup', 'Nairobi, Kenya', NULL, '2026-09-15 17:00:00+00', '2026-09-15 20:00:00+00', false, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'TechPivo Web Hackathon 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, is_published)
    VALUES ('TechPivo Web Hackathon 2026', '48-hour online hackathon: build a web tool for developers. Prizes for the top 3 projects.', 'hackathon', NULL, NULL, '2026-10-02 08:00:00+00', '2026-10-04 20:00:00+00', true, true);
  END IF;
END $$;

-- ---------- USER PROFILES AUTO-CREATE (community FK fix) ----------
-- Every community table (forum_posts.author_id, forum_votes.user_id,
-- user_xp_log.user_id, poll_votes.user_id, quiz_attempts.user_id, follows,
-- bookmarks, notifications, reading history, badges) has a FK to
-- user_profiles(id), but the signup trigger only created `profiles` rows —
-- user_profiles was EMPTY, so every community write from a real session
-- failed with FK violation. Extend the trigger + backfill existing users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'contributor'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

INSERT INTO public.user_profiles (id, username, full_name)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
       COALESCE(u.raw_user_meta_data->>'full_name', 'User')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

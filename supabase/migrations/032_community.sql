-- =====================================================
-- MIGRATION 032: Community System
-- All community tables, RLS policies, and seed data
-- =====================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  streak INT DEFAULT 0,
  last_active_date DATE,
  reputation INT DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Follows
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Forum Categories
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💬',
  color TEXT DEFAULT '#6B7280',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Forum Posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT,
  tags TEXT[] DEFAULT '{}',
  reply_count INT DEFAULT 0,
  vote_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_solved BOOLEAN DEFAULT false,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Forum Replies
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  vote_count INT DEFAULT 0,
  is_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Forum Votes
CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  vote_type INT NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit INT,
  question_count INT DEFAULT 0,
  attempt_count INT DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'text')),
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  time_taken INT,
  answers JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  total_votes INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Poll Options
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vote_count INT DEFAULT 0
);

-- Poll Votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- User Bookmarks
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- User Reading History
CREATE TABLE IF NOT EXISTS user_reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  title TEXT,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_read TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- User Badges (earned)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- XP Log
CREATE TABLE IF NOT EXISTS user_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_amount INT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  reference_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Article Discussions (comments under articles)
CREATE TABLE IF NOT EXISTS article_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES article_discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Replies (replies to article discussions)
CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES article_discussions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Community Events
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
  created_by UUID REFERENCES user_profiles(id),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_log_user ON user_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_article_discussions_post ON article_discussions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_events_start ON community_events(start_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Public read policies for public data
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Follows are viewable by everyone" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON user_follows FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Forum categories are public" ON forum_categories FOR SELECT USING (true);

CREATE POLICY "Forum posts are public" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Forum replies are public" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can reply" ON forum_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can update own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can view votes" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON forum_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON forum_votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Published quizzes are public" ON quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "Quiz questions are public" ON quiz_questions FOR SELECT USING (true);

CREATE POLICY "Quiz attempts visible to owner" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Active polls are public" ON polls FOR SELECT USING (is_active = true);
CREATE POLICY "Poll options are public" ON poll_options FOR SELECT USING (true);

CREATE POLICY "Poll votes visible to owner" ON poll_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can vote" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bookmarks" ON user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark" ON user_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmark" ON user_bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own history" ON user_reading_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add history" ON user_reading_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON user_reading_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own xp log" ON user_xp_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own as read" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Discussions are public" ON article_discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can discuss" ON article_discussions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Discussion replies are public" ON discussion_replies FOR SELECT USING (true);

CREATE POLICY "Events are public" ON community_events FOR SELECT USING (is_published = true);
CREATE POLICY "RSVPs are viewable" ON event_rsvps FOR SELECT USING (true);
CREATE POLICY "Users can RSVP" ON event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SEED DATA: Forum Categories
-- =====================================================
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

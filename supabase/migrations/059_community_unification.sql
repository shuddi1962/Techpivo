-- ============================================================================
-- 059 COMMUNITY UNIFICATION — unified content model (idempotent, re-runnable)
-- Adapts existing forum/polls/quizzes tables into ONE community architecture.
-- Existing rows/data preserved; nothing dropped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. forum_posts → unified community content (content_type + question lifecycle)
-- ---------------------------------------------------------------------------
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'discussion';
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS question_status text NOT NULL DEFAULT 'new';
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS bounty_points integer NOT NULL DEFAULT 0;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS accepted_reply_id uuid;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_posts_content_type_check') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_content_type_check
      CHECK (content_type IN ('question','discussion','poll','quiz','ama','showcase','debate','tutorial_discussion'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_posts_question_status_check') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_question_status_check
      CHECK (question_status IN ('new','needs_context','unanswered','active','answered','solved','stale','archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_posts_difficulty_check') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_difficulty_check
      CHECK (difficulty IS NULL OR difficulty IN ('beginner','intermediate','advanced'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_posts_bounty_check') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_bounty_check CHECK (bounty_points >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_posts_accepted_reply_fkey') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_accepted_reply_fkey
      FOREIGN KEY (accepted_reply_id) REFERENCES forum_replies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Canonical slugs: unique where present
DROP INDEX IF EXISTS forum_posts_slug_unique_idx;
CREATE UNIQUE INDEX forum_posts_slug_unique_idx ON forum_posts(slug) WHERE slug IS NOT NULL AND slug <> '';

-- ---------------------------------------------------------------------------
-- 2. forum_replies → unified answers/comments (reply_type + acceptance + rank)
-- ---------------------------------------------------------------------------
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS reply_type text NOT NULL DEFAULT 'answer';
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS accepted_by uuid;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS rank_score double precision NOT NULL DEFAULT 0;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_replies_reply_type_check') THEN
    ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_reply_type_check
      CHECK (reply_type IN ('answer','comment','argument','alternative_solution','update'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_replies_position_check') THEN
    ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_position_check
      CHECK (position IS NULL OR position IN ('for','against'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_replies_accepted_by_fkey') THEN
    ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_accepted_by_fkey
      FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Polls: community-post linkage + poll engine flags
-- ---------------------------------------------------------------------------
ALTER TABLE polls ADD COLUMN IF NOT EXISTS community_post_id uuid;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_change boolean NOT NULL DEFAULT false;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polls_community_post_fkey') THEN
    ALTER TABLE polls ADD CONSTRAINT polls_community_post_fkey
      FOREIGN KEY (community_post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
  END IF;
  -- Vote idempotency: one vote per poll per user (dedupe keeps earliest vote)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_user_unique') THEN
    DELETE FROM poll_votes pv USING poll_votes pv2
      WHERE pv.poll_id = pv2.poll_id AND pv.user_id = pv2.user_id
        AND pv.created_at > pv2.created_at;
    ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_user_unique UNIQUE (poll_id, user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Quizzes: community-post linkage
-- ---------------------------------------------------------------------------
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS community_post_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_community_post_fkey') THEN
    ALTER TABLE quizzes ADD CONSTRAINT quizzes_community_post_fkey
      FOREIGN KEY (community_post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. user_profiles: topic expertise (activity-derived, computed by server)
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expertise jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 6. topics + post_topics (knowledge graph)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_approved boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_topics (
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, topic_id)
);

CREATE TABLE IF NOT EXISTS post_follows (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS topic_follows (
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

-- ---------------------------------------------------------------------------
-- 7. AMA questions (attached to ama-type forum posts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ama_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ama_post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id uuid,
  content text NOT NULL,
  vote_count integer NOT NULL DEFAULT 0,
  is_answered boolean NOT NULL DEFAULT false,
  answered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. Moderation: content_reports + moderation_actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_reports_target_type_check') THEN
    ALTER TABLE content_reports ADD CONSTRAINT content_reports_target_type_check
      CHECK (target_type IN ('post','reply','poll','quiz','event','profile'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_reports_status_check') THEN
    ALTER TABLE content_reports ADD CONSTRAINT content_reports_status_check
      CHECK (status IN ('pending','reviewing','actioned','dismissed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moderation_actions_type_check') THEN
    ALTER TABLE moderation_actions ADD CONSTRAINT moderation_actions_type_check
      CHECK (action_type IN ('warn','remove_content','restore_content','hide_content','suspend','unsuspend','ban','unban','ai_flag','approve'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. reputation_ledger — immutable-by-design reputation source of truth
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reputation_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points <> 0),
  signal text NOT NULL,
  source_type text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reputation_ledger_user_idx ON reputation_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_status_idx ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_target_idx ON content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS ama_questions_ama_idx ON ama_questions(ama_post_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. Performance indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS forum_posts_type_created_idx ON forum_posts(content_type, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_qstatus_idx ON forum_posts(question_status);
CREATE INDEX IF NOT EXISTS forum_posts_qstatus_type_idx ON forum_posts(question_status, content_type);
CREATE INDEX IF NOT EXISTS forum_replies_post_accepted_idx ON forum_replies(post_id, is_accepted);
CREATE INDEX IF NOT EXISTS forum_replies_post_rank_idx ON forum_replies(post_id, rank_score DESC);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_user_idx ON quiz_attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS xp_log_user_reason_idx ON user_xp_log(user_id, reason);

-- ---------------------------------------------------------------------------
-- 11. Slug backfill for existing posts (canonical URLs)
-- ---------------------------------------------------------------------------
WITH base AS (
  SELECT id, created_at,
         trim(both '-' FROM lower(regexp_replace(regexp_replace(coalesce(NULLIF(slug,''), title), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))) AS b
  FROM forum_posts
  WHERE slug IS NULL OR slug = ''
)
UPDATE forum_posts fp SET slug = x.b || CASE WHEN x.dup > 1 THEN '-' || x.rn::text ELSE '' END
FROM (
  SELECT id, b, count(*) OVER (PARTITION BY b) AS dup, row_number() OVER (PARTITION BY b ORDER BY created_at) AS rn
  FROM base
) x
WHERE fp.id = x.id;

-- ---------------------------------------------------------------------------
-- 12. Seed topics (curated + derived from existing tags) — idempotent
-- ---------------------------------------------------------------------------
INSERT INTO topics (slug, name, description, icon)
SELECT * FROM (VALUES
  ('javascript', 'JavaScript', 'Modern JavaScript: syntax, patterns, tooling', 'FileCode2'),
  ('typescript', 'TypeScript', 'Typed JavaScript, type systems, tsconfig', 'Braces'),
  ('react', 'React', 'React, hooks, state management, component design', 'Atom'),
  ('vue', 'Vue', 'Vue 3, composition API, ecosystem', 'Hexagon'),
  ('nextjs', 'Next.js', 'Next.js App Router, SSR, RSC, deployments', 'Triangle'),
  ('css', 'CSS', 'Layouts, Tailwind, design systems, animation', 'Palette'),
  ('python', 'Python', 'Python: scripting, automation, data, backends', 'Snake'),
  ('nodejs', 'Node.js', 'Node.js servers, APIs, npm ecosystem', 'Server'),
  ('sql', 'SQL', 'SQL queries, joins, indexing, optimization', 'Database'),
  ('supabase', 'Supabase', 'Supabase: Postgres, auth, RLS, realtime', 'DatabaseZap'),
  ('postgresql', 'PostgreSQL', 'Postgres administration, tuning, extensions', 'Database'),
  ('mongodb', 'MongoDB', 'MongoDB, document modeling, aggregation', 'Database'),
  ('cloud', 'Cloud Computing', 'AWS, GCP, Azure, serverless architecture', 'Cloud'),
  ('devops', 'DevOps', 'CI/CD, containers, orchestration', 'GitBranch'),
  ('docker', 'Docker', 'Containers, Dockerfiles, compose', 'Container'),
  ('linux', 'Linux', 'Linux administration, shell, servers', 'Terminal'),
  ('networking', 'Networking', 'TCP/IP, DNS, HTTP, infrastructure', 'Network'),
  ('cybersecurity', 'Cybersecurity', 'Security: threats, hardening, best practice', 'Shield'),
  ('security', 'Security', 'Security engineering, cryptography, auth', 'Lock'),
  ('ai', 'Artificial Intelligence', 'AI, LLMs, agents, prompt engineering', 'Brain'),
  ('machine-learning', 'Machine Learning', 'ML, training, evaluation, tooling', 'Cpu'),
  ('web-development', 'Web Development', 'Web platform, browsers, performance', 'Globe'),
  ('career', 'Career', 'Tech careers, interviews, growth', 'Briefcase'),
  ('homelab', 'Homelab', 'Self-hosting, home servers, automation', 'Server'),
  ('automation', 'Automation', 'Scripting and automating repetitive work', 'Bot'),
  ('git', 'Git', 'Version control, workflows, history', 'GitBranch'),
  ('api', 'APIs', 'REST, GraphQL, API design, integration', 'Plug'),
  ('mobile', 'Mobile Development', 'iOS, Android, React Native, Flutter', 'Smartphone'),
  ('gaming', 'Gaming', 'Gaming tech, hardware, development', 'Gamepad2'),
  ('hardware', 'Hardware', 'Processors, GPUs, builds, troubleshooting', 'Cpu')
) AS t(slug, name, description, icon)
ON CONFLICT (slug) DO NOTHING;

-- topics derived from existing post tags
INSERT INTO topics (slug, name)
SELECT DISTINCT lower(trim(tag)), initcap(trim(tag))
FROM forum_posts fp, jsonb_array_elements_text(fp.tags) AS tag
WHERE trim(tag) <> '' AND lower(trim(tag)) NOT IN (SELECT slug FROM topics)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. Link existing posts to topics via their tags (knowledge graph backfill)
-- ---------------------------------------------------------------------------
INSERT INTO post_topics (post_id, topic_id)
SELECT fp.id, t.id
FROM forum_posts fp, jsonb_array_elements_text(fp.tags) AS tag, topics t
WHERE t.slug = lower(trim(tag)) AND t.is_approved
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. Functions
-- ---------------------------------------------------------------------------
-- award_reputation: only callable server-side; ledger insert + profile total update.
CREATE OR REPLACE FUNCTION award_reputation(target_user_id uuid, points int, signal text, src_type text DEFAULT NULL, src_id text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF points = 0 THEN RETURN (SELECT reputation FROM user_profiles WHERE id = target_user_id); END IF;
  INSERT INTO reputation_ledger (user_id, points, signal, source_type, source_id)
  VALUES (target_user_id, points, signal, src_type, src_id);
  UPDATE user_profiles SET reputation = COALESCE(reputation, 0) + points WHERE id = target_user_id;
  SELECT COALESCE(reputation, 0) INTO new_total FROM user_profiles WHERE id = target_user_id;
  RETURN new_total;
END $$;

-- refresh_reply_rank: multi-signal answer ranking (votes + accepted + freshness).
CREATE OR REPLACE FUNCTION refresh_reply_rank(target_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE forum_replies r SET rank_score =
      GREATEST(0, COALESCE(r.vote_count, 0)) * 3.0
      + CASE WHEN r.is_accepted THEN 60.0 ELSE 0.0 END
      + GREATEST(0.0, 24.0 - EXTRACT(EPOCH FROM (now() - r.created_at)) / 3600.0) * 0.5
    WHERE r.post_id = target_post_id;
END $$;

-- ---------------------------------------------------------------------------
-- 15. RLS (house style: public read / owner write / admin ALL)
-- ---------------------------------------------------------------------------
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ama_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topics' AND policyname = 'topics_public_read') THEN
    CREATE POLICY topics_public_read ON topics FOR SELECT USING (is_approved);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topics' AND policyname = 'topics_admin_all') THEN
    CREATE POLICY topics_admin_all ON topics FOR ALL
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_topics' AND policyname = 'post_topics_public_read') THEN
    CREATE POLICY post_topics_public_read ON post_topics FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_follows' AND policyname = 'post_follows_owner_write') THEN
    CREATE POLICY post_follows_owner_write ON post_follows FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topic_follows' AND policyname = 'topic_follows_owner_write') THEN
    CREATE POLICY topic_follows_owner_write ON topic_follows FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reports' AND policyname = 'content_reports_owner_insert') THEN
    CREATE POLICY content_reports_owner_insert ON content_reports FOR INSERT
      WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reports' AND policyname = 'content_reports_owner_select') THEN
    CREATE POLICY content_reports_owner_select ON content_reports FOR SELECT
      USING (auth.uid() = reporter_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reports' AND policyname = 'content_reports_admin_update') THEN
    CREATE POLICY content_reports_admin_update ON content_reports FOR UPDATE
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'moderation_actions' AND policyname = 'moderation_actions_admin_all') THEN
    CREATE POLICY moderation_actions_admin_all ON moderation_actions FOR ALL
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reputation_ledger' AND policyname = 'reputation_ledger_owner_select') THEN
    CREATE POLICY reputation_ledger_owner_select ON reputation_ledger FOR SELECT
      USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reputation_ledger' AND policyname = 'reputation_ledger_no_direct_write') THEN
    CREATE POLICY reputation_ledger_no_direct_write ON reputation_ledger FOR ALL
      USING (false) WITH CHECK (false);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ama_questions' AND policyname = 'ama_questions_public_read') THEN
    CREATE POLICY ama_questions_public_read ON ama_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ama_questions' AND policyname = 'ama_questions_owner_insert') THEN
    CREATE POLICY ama_questions_owner_insert ON ama_questions FOR INSERT
      WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ama_questions' AND policyname = 'ama_questions_admin_all') THEN
    CREATE POLICY ama_questions_admin_all ON ama_questions FOR ALL
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 16. Realtime publication (guarded — ALTER PUBLICATION has no IF NOT EXISTS)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'topics') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE topics;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_topics') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_topics;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_follows') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_follows;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'topic_follows') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE topic_follows;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'content_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_reports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'moderation_actions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE moderation_actions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reputation_ledger') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reputation_ledger;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ama_questions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ama_questions;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 17. Function grants (server-side only for write-sensitive functions)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION award_reputation(uuid, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_reputation(uuid, integer, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION refresh_reply_rank(uuid) TO service_role, authenticated;

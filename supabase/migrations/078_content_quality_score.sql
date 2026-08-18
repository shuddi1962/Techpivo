-- Phase 3: Content indexation architecture (spec §19/§20)
-- Adds content_quality_score + word_count to posts for noindex quality gating.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_quality_score integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS word_count integer;

-- Backfill word_count for existing published posts from content
UPDATE posts
SET word_count = array_length(string_to_array(trim(regexp_replace(content, '<[^>]+>', '', 'g')), ' '), 1)
WHERE word_count IS NULL
  AND content IS NOT NULL
  AND status = 'published';

COMMENT ON COLUMN posts.content_quality_score IS '0-100 quality gate score; null = not yet scored';
COMMENT ON COLUMN posts.word_count IS 'plain-text word count (stripped of HTML)';

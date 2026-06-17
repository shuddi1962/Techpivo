-- Rename internal column (not user-facing)
ALTER TABLE posts RENAME COLUMN blizine_score TO quality_score;

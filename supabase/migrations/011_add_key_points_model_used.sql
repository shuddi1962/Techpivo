ALTER TABLE posts ADD COLUMN IF NOT EXISTS key_points  JSONB DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS model_used  TEXT DEFAULT 'gemini-grounded';

CREATE INDEX IF NOT EXISTS idx_posts_model ON posts(model_used);

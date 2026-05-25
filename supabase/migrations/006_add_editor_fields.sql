ALTER TABLE posts ADD COLUMN IF NOT EXISTS focus_keyword text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_score integer DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'Article';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS schema_data jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_description text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_description text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_image text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS readability_score numeric DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS flesch_score numeric DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS secondary_keywords text[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS robots_nofollow boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS breadcrumb_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_format text DEFAULT 'standard';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_sticky boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS enable_comments boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS preview_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  title text,
  slug text,
  content text,
  excerpt text,
  featured_image text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_preview_drafts_expires ON preview_drafts(expires_at);

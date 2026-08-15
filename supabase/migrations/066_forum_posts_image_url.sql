-- 066: forum_posts cover image (composer image upload round)
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS image_url text;

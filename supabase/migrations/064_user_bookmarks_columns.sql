-- 064: user_bookmarks title/url columns (account page + save button rely on them; POST was 400 "Could not find the 'title' column")
ALTER TABLE user_bookmarks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE user_bookmarks ADD COLUMN IF NOT EXISTS url text;

-- Fix broken poll image (pexels 159306 returns 404)
UPDATE polls
SET image_url = 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE image_url LIKE '%159306%' AND image_url IS NOT NULL;
-- 056_site_blocks_style.sql
-- Adds a `style` jsonb column to site_blocks so block appearance (ticker variant,
-- blinking, speed, colors, label) is configurable from the admin and saved to the DB —
-- rendered live via realtime (site_blocks is already in supabase_realtime publication).

ALTER TABLE public.site_blocks ADD COLUMN IF NOT EXISTS style jsonb DEFAULT NULL;
-- 095: popup campaign analytics (views / clicks / closes per campaign).
-- Writes go through the service-role /api/marketplace/popup-stats route
-- (no anon policy = no direct writes); admins read via RLS below.

CREATE TABLE IF NOT EXISTS public.marketplace_popup_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('view', 'click', 'close')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popup_stats_campaign_time
  ON public.marketplace_popup_stats (campaign_id, created_at DESC);

ALTER TABLE public.marketplace_popup_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view popup stats" ON public.marketplace_popup_stats;
CREATE POLICY "Admins view popup stats" ON public.marketplace_popup_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))
  );

-- Realtime (guarded — ALTER PUBLICATION ADD TABLE has no IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_popup_stats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_popup_stats;
  END IF;
END $$;

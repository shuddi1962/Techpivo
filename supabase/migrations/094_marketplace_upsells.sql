-- 094_marketplace_upsells.sql — recommendations, bundles-lite + conversion analytics.
-- Idempotent: every statement is guarded so the whole file is re-runnable.
-- Apply via Supabase Dashboard → SQL Editor (or Management API /v1/projects/.../database/query).

-- 1. Admin-curated complementary products ("Complete Your Purchase" overrides).
CREATE TABLE IF NOT EXISTS public.marketplace_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_id UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  recommended_id UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_recommendations_different CHECK (primary_id <> recommended_id),
  CONSTRAINT marketplace_recommendations_unique UNIQUE (primary_id, recommended_id)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_recommendations_primary
  ON public.marketplace_recommendations(primary_id);

-- 2. Conversion analytics events (product ids + counts only — no PII).
CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  product_id UUID NULL REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_kind_created
  ON public.marketplace_events(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_product
  ON public.marketplace_events(product_id);

-- 3. RLS: public reads active recommendations; inserts to events go through
-- the service-role track route (no anon policy = no direct writes).
ALTER TABLE public.marketplace_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active recommendations" ON public.marketplace_recommendations;
CREATE POLICY "Public can view active recommendations" ON public.marketplace_recommendations
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins manage marketplace recommendations" ON public.marketplace_recommendations;
CREATE POLICY "Admins manage marketplace recommendations" ON public.marketplace_recommendations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))
  );

DROP POLICY IF EXISTS "Admins view marketplace events" ON public.marketplace_events;
CREATE POLICY "Admins view marketplace events" ON public.marketplace_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))
  );

-- 4. Realtime (guarded — ALTER PUBLICATION ADD TABLE has no IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_recommendations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_recommendations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_events;
  END IF;
END $$;

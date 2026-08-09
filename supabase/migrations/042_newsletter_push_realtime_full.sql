-- 2026-08-09: Full realtime + functionality support for Newsletter Center & Push Notifications.
-- 1) newsletter_ab_tests table (A/B Tests tab was dead — no table existed)
CREATE TABLE IF NOT EXISTS public.newsletter_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  variant_a_subject text,
  variant_b_subject text,
  variant_a_opens integer DEFAULT 0,
  variant_b_opens integer DEFAULT 0,
  variant_a_clicks integer DEFAULT 0,
  variant_b_clicks integer DEFAULT 0,
  winner text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.newsletter_ab_tests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'newsletter_ab_tests' AND policyname = 'Authenticated read') THEN
    CREATE POLICY "Authenticated read" ON public.newsletter_ab_tests
      FOR SELECT TO authenticated USING (auth.role() = 'authenticated'::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'newsletter_ab_tests' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON public.newsletter_ab_tests
      FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

-- 2) newsletter_sends had NO RLS policies at all -> every admin campaign read/write silently failed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'newsletter_sends' AND policyname = 'Authenticated can view newsletter sends') THEN
    CREATE POLICY "Authenticated can view newsletter sends" ON public.newsletter_sends
      FOR SELECT TO authenticated USING (auth.role() = 'authenticated'::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'newsletter_sends' AND policyname = 'Admins can manage newsletter sends') THEN
    CREATE POLICY "Admins can manage newsletter sends" ON public.newsletter_sends
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin'::user_role, 'editor'::user_role)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin'::user_role, 'editor'::user_role)));
  END IF;
END $$;

-- 3) Realtime for Newsletter Center + Push Notifications tables
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.subscribers,
  public.newsletter_sends,
  public.newsletter_templates,
  public.newsletter_lists,
  public.newsletter_automations,
  public.newsletter_ab_tests,
  public.push_subscriptions,
  public.push_notifications;

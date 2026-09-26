-- TechPivo Intelligence: content_briefs had RLS enabled with zero policies
-- (pre-existing from the 030 era). Reads/writes only worked via service-role.
-- Add the standard admin/editor policy for consistency. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'intelligence_admin_all_content_briefs') THEN
    CREATE POLICY intelligence_admin_all_content_briefs ON content_briefs FOR ALL
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')))
      WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','editor')));
  END IF;
END $$;

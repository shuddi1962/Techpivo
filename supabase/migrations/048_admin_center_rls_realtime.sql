-- 048: Administration Center — RLS policies, realtime publication, enum + unique-key guards
-- Applies to: Comments, Users, Roles, Reporters, Security, Settings pages

-- 1. COMMENTS — admins need full visibility + moderation (ORs with existing public-approved SELECT + authenticated INSERT)
DROP POLICY IF EXISTS "Admins can view all comments" ON public.comments;
CREATE POLICY "Admins can view all comments" ON public.comments
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can moderate comments" ON public.comments;
CREATE POLICY "Admins can moderate comments" ON public.comments
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete comments" ON public.comments;
CREATE POLICY "Admins can delete comments" ON public.comments
  FOR DELETE USING (public.is_admin());

-- 2. USER_PROFILES — had ZERO policies (all admin reads/writes silently failed)
DROP POLICY IF EXISTS "Public can view public user_profiles" ON public.user_profiles;
CREATE POLICY "Public can view public user_profiles" ON public.user_profiles
  FOR SELECT USING (public.is_admin() OR is_public IS TRUE);

DROP POLICY IF EXISTS "Users can insert own user_profiles" ON public.user_profiles;
CREATE POLICY "Users can insert own user_profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own user_profiles" ON public.user_profiles;
CREATE POLICY "Users can update own user_profiles" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage user_profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage user_profiles" ON public.user_profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. AUDIT_LOGS — admins write audit entries (admin SELECT policy already exists)
DROP POLICY IF EXISTS "Admins can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- 4. site_settings unique(key) guard — upserts rely on it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.site_settings'::regclass AND contype = 'u') THEN
    ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_key_key UNIQUE (key);
  END IF;
END $$;

-- 5. user_role enum safety — values used by admin role UIs (no-op when column is text or values exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'user_role') THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reporter';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'seo_specialist';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'social_media_manager';
  END IF;
END $$;

-- 6. Realtime publication — 8 admin tables (guarded, idempotent)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['comments','user_profiles','profiles','custom_roles','audit_logs','api_keys','user_sessions','site_settings'] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = t AND n.nspname = 'public')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables pt WHERE pt.pubname = 'supabase_realtime' AND pt.schemaname = 'public' AND pt.tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

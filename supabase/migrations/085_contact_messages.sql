-- Migration 085: contact_messages table
-- Stores contact form submissions so admins can view them in-dashboard (not just via Resend email).

-- 1. Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_unread ON public.contact_messages (is_read) WHERE is_read = FALSE;

-- 3. RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Admins/editors can do everything; anon/authenticated can only insert (submit the form).
DROP POLICY IF EXISTS "contact_messages_admin_all" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_all"
  ON public.contact_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "contact_messages_insert_public" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_public"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- 4. Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'contact_messages' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  END IF;
END $$;

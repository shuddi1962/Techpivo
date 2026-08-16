-- 071: add keyword_articles to the realtime publication so the admin
-- keywords page updates live when research adds rows / generation publishes.
-- ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS, so guard manually.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'keyword_articles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.keyword_articles;
  END IF;
END
$$;
-- 2026-08-09: Add SEO/indexing/social tables to the realtime publication.
-- Only media_files/posts/analytics_events were in supabase_realtime, so every
-- client postgres_changes subscription on the other tables silently never fired.

alter publication supabase_realtime add table public.social_accounts;
alter publication supabase_realtime add table public.google_indexing_queue;
alter publication supabase_realtime add table public.seo_issues;
alter publication supabase_realtime add table public.seo_audits;
alter publication supabase_realtime add table public.keyword_rankings;
alter publication supabase_realtime add table public.topic_authority;
alter publication supabase_realtime add table public.seo_redirects;

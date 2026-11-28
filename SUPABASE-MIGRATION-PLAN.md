# TechPivo — Supabase Migration Rollout Plan

**Source project:** `xkhvojjogoeuvrifekwr` (current, to be kept read-only during migration)
**Target project:** NEW Supabase project (created under new account)
**Migration files:** 102 SQL files in `supabase/migrations/`

---

## Phase 1: Create New Supabase Project

1. Create new Supabase project in the new account
2. Record: Project Ref, URL, Anon Key, Service Role Key
3. Set `SUPABASE_ACCESS_TOKEN` env var for Management API access
4. Enable required extensions: `pg_cron`, `pg_net`, `pg_uuidv7`, `realtime`

---

## Phase 2: Apply Migrations (102 files, idempotent)

Apply all migrations in numerical order against the new project:

```
supabase/migrations/003_rls_fixes.sql
supabase/migrations/004_add_quick_brief.sql
...
supabase/migrations/106_marketplace_category_description_seo.sql
```

**Method:** Use Supabase Management API `POST /v1/projects/{ref}/database/query` for each migration file, or use Supabase CLI `supabase db push`.

**Important:** Some migrations use `ALTER PUBLICATION ... ADD TABLE` which lacks `IF NOT EXISTS`. Guard these with `pg_publication_tables` checks (see migration 071 pattern).

**Migration categories:**
- 003–026: Core tables (posts, categories, keywords, SEO, social)
- 027–039: Enterprise tables (user management, tools, knowledge graph, analytics)
- 040–052: Pages, blocks, newsletter, push, ads marketplace
- 053–066: Site pages hero, blocks style, community realism, forums
- 067–080: Community topics, notifications, categories active/realtime
- 081–094: Gmail-only signup, pages placement, reports cron, ads
- 095–106: Popup stats, upsells, ship methods, coupon columns, CJ import history, category SEO

---

## Phase 3: Recreate Realtime Publication

Add all tables requiring realtime to `supabase_realtime` publication:

```
-- Tables that need realtime (from codebase audit)
media_files, posts, analytics_events, ad_campaigns, ad_placements,
ad_revenue, ad_campaign_daily_stats, site_pages, site_blocks,
subscribers, newsletter_sends, push_subscriptions, push_notifications,
forum_posts, forum_replies, forum_votes, quizzes, quiz_attempts,
polls, poll_votes, community_events, event_rsvps, user_xp_log,
user_follows, user_bookmarks, user_reading_history, user_badges,
user_notifications, keyword_articles, seo_issues, keyword_rankings,
topic_authority, content_briefs, editorial_queue, company_watchlist,
trend_predictions, content_gaps, competitor_watch, api_keys,
audit_logs, custom_roles, user_sessions, google_indexing_queue,
report_schedules, affiliate_products, marketplace_orders,
marketplace_reviews, user_profiles
```

---

## Phase 4: Recreate Edge Functions

Deploy these edge functions to the new project:

| Function | Purpose |
|----------|---------|
| `write-keyword-article` | AI article generation |
| `fetch-trending-keywords` | DISABLED (kill switch via site_settings) |
| `fetch-rss` | RSS ingestion |
| `ingest` | Article ingest pipeline |
| `indexnow` | IndexNow submission |

All functions use `verify_jwt=true` and `CRON_SECRET` auth.

---

## Phase 5: Recreate RLS Policies

Verify RLS policies on all sensitive tables:

| Table | Policy Pattern |
|-------|---------------|
| `profiles` | Public view if public or admin; self insert/update; admin ALL |
| `user_profiles` | Public view if public or admin; self insert/update; admin ALL |
| `comments` | Public SELECT approved; admin SELECT/UPDATE/DELETE all |
| `affiliate_products` | Admin/editor ALL; public read active |
| `marketplace_orders` | Owner read; admin ALL |
| `api_keys` | Admin ALL |
| `audit_logs` | Admin INSERT |
| `site_settings` | Public read non-secret; admin ALL |
| `media_files` | Public read; owner write |
| All community tables | Public read / owner write / admin ALL |

---

## Phase 6: Seed Static Data

Seed reference data that isn't in migrations:

1. **Forum categories** — 12 categories (from migration 057)
2. **Quizzes** — 2 quizzes with 10 questions each (migration 057)
3. **Polls** — 2 polls with 10 options each (migration 057)
4. **Community events** — 3 events + 3 launch events (migration 057)
5. **Ad placements** — 10 marketplace placements (migration 043)
6. **site_settings** — cron_secret, fetch_trending_keywords_enabled=false, etc.
7. **site_pages** — 9 editable pages (about, contact, privacy, etc.)
8. **site_blocks** — 4 blocks (header-banner, home-intro, footer-about, footer-links)

---

## Phase 7: Validate Record Counts

Compare old vs new project:

| Table | Old Count | New Count | Match? |
|-------|-----------|-----------|--------|
| `posts` | TBD | TBD | |
| `categories` | TBD | TBD | |
| `affiliate_products` | TBD | TBD | |
| `marketplace_orders` | TBD | TBD | |
| `user_profiles` | TBD | TBD | |
| `forum_posts` | TBD | TBD | |
| `quizzes` | TBD | TBD | |
| `polls` | TBD | TBD | |
| `media_files` | TBD | TBD | |

Validation queries:
```sql
SELECT 'posts' AS table, count(*) FROM posts UNION ALL
SELECT 'categories', count(*) FROM categories UNION ALL
SELECT 'affiliate_products', count(*) FROM affiliate_products;
```

---

## Phase 8: Validate Relationships & FKs

Check foreign key integrity:

```sql
-- No orphaned records
SELECT count(*) FROM affiliate_products ap
LEFT JOIN categories c ON ap.category_slug = c.slug
WHERE c.slug IS NULL;

-- All RLS policies present
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- All realtime tables
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

---

## Phase 9: Validate Auth & Users

1. Verify `auth.users` migrated (via `user_profiles` + `profiles` tables)
2. Verify `user_profiles` rows exist for all auth users
3. Verify role assignments (admin, editor, author, user)
4. Test login/signup/password reset flow

---

## Phase 10: Rollback Plan

1. Keep old Supabase project (`xkhvojjogoeuvrifekwr`) **read-only** until new platform confirmed stable
2. DNS can be reverted by re-pointing CNAME/A records at Cloudflare IPs
3. All migration scripts are idempotent and version-controlled in `supabase/migrations/`
4. No destructive migrations — no `DROP TABLE` or `DELETE` without WHERE
5. If issues arise, switch DNS back to Cloudflare Pages deployment

---

## Phase 11: Post-Migration Verification

1. Application connects to new Supabase (test `/api/posts` route)
2. Auth works (login, signup, session persistence)
3. Realtime works (test a table subscription)
4. Edge functions deploy and execute
5. Cron jobs fire (pg_cron dispatchers)
6. Image upload works via Vercel Blob (test `/api/upload`)
7. All admin functions accessible
8. Marketplace checkout/payment flow works (test mode)

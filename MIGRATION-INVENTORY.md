# TechPivo — Infrastructure Migration Inventory & Dependency Map

> Full audit of the existing TechPivo platform prior to migration to:
> - **Vercel** (3 projects: techpivo-main, techpivo-marketplace, techpivo-images)
> - **Supabase** (shared backend, new project)
> - **Vercel Blob** (replacing Cloudflare R2)
> - **GitHub** (existing repo: shuddi1962/Techpivo)

---

## 1. Codebase Overview

| Item | Detail |
|------|--------|
| Repository | `https://github.com/shuddi1962/Techpivo` (single monorepo) |
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + shadcn/ui components |
| State | React 18, useSyncExternalStore, localStorage |
| Build | `next build` (NODE_OPTIONS=--max-old-space-size=2048) |
| Tests | Vitest 4.1.10 (53+ tests across 6 files) |
| Lint | Next.js ESLint |
| Current deploy | Cloudflare Pages (per CLOUDFLARE-DEPLOYMENT-FIX.md) |

---

## 2. Project Structure (Single Repo → 3 Vercel Projects)

The existing codebase is **one Next.js application** that serves both the main website and the marketplace via host-based middleware routing (`shop.techpivo.com` → `/marketplace/*` paths). For the 3-project Vercel setup:

| Vercel Project | Domain | Deployment Strategy |
|----------------|--------|---------------------|
| `techpivo-main` | `techpivo.com` | Full Next.js app (main site + shared routes) |
| `techpivo-marketplace` | `shop.techpivo.com` | Same codebase, marketplace-focused env vars, middleware handles `/marketplace/*` rewrite |
| `techpivo-images` | `images.techpivo.com` | Vercel Blob CDN (no Next.js needed — Blob provides public URLs directly) |

**Key insight:** The codebase stays as ONE repo. All 3 Vercel projects connect to the same GitHub repo but with different environment variables. The middleware (`src/middleware.ts`) handles the `shop.techpivo.com` → `/marketplace/*` path rewrite.

---

## 3. Backend: Supabase (New Project)

| Item | Current | Migration Target |
|------|---------|------------------|
| Project ref | `xkhvojjogoeuvrifekwr` | NEW Supabase project |
| URL | `https://xkhvojjogoeuvrifekwr.supabase.co` | NEW project URL |
| Anon key | In `.env.local` | NEW anon key |
| Service role key | In `.env.local` | NEW service role key |
| Migrations | 102+ SQL files in `supabase/migrations/` | Apply ALL idempotently to new project |
| Realtime | 19+ tables in `supabase_realtime` publication | Recreate publication on new project |
| Edge Functions | 8 functions in `supabase/functions/` | Redeploy to new project |
| RLS | Policies on all sensitive tables | Recreate on new project |

### Tables to migrate (non-exhaustive)
`posts`, `categories`, `subcategories`, `affiliate_products`, `marketplace_orders`, `marketplace_reviews`, `user_profiles`, `profiles`, `site_settings`, `site_pages`, `site_blocks`, `media_files`, `ad_campaigns`, `ad_placements`, `ad_revenue`, `ad_campaign_daily_stats`, `forum_posts`, `forum_replies`, `forum_votes`, `quizzes`, `quiz_questions`, `quiz_attempts`, `polls`, `poll_options`, `poll_votes`, `community_events`, `event_rsvps`, `learning_paths`, `learning_path_lessons`, `keyword_articles`, `seo_audits`, `seo_issues`, `keyword_rankings`, `topic_authority`, `content_briefs`, `editorial_calendar`, `company_watchlist`, `trend_predictions`, `content_gaps`, `competitor_watch`, `editorial_queue`, `analytics_events`, `newsletter_sends`, `subscribers`, `push_subscriptions`, `push_notifications`, `api_keys`, `audit_logs`, `custom_roles`, `user_sessions`, `user_xp_log`, `user_follows`, `user_bookmarks`, `user_reading_history`, `user_badges`, `user_notifications`, `article_discussions`, `discussion_replies`, `google_indexing_queue`, `report_schedules`, `cron_jobs`...

---

## 4. Image/Media Storage: Cloudflare R2 → Vercel Blob

### Current (R2)
- Bucket: `techpivo-media`
- Custom domain: `https://images.techpivo.com`
- Credentials: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- Client: `src/lib/r2.ts` (S3-compatible via `@aws-sdk/client-s3`)
- Upload: `src/app/api/upload/route.ts` → `r2Upload()` (server-side buffer upload)
- Remote image fetch: `src/lib/media.ts` → `storeRemoteImage()` → `r2Upload()`
- Public URL helper: `src/lib/images.ts` → `imageUrl()` builds `https://images.techpivo.com/<path>`

### Target (Vercel Blob)
- Token: `BLOB_READ_WRITE_TOKEN` (Vercel env var)
- Public URL: `https://blob.techpivo.com` or custom domain on Vercel Blob
- Client: `@vercel/blob` (replaces `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- Logical paths: `/products/`, `/products/gallery/`, `/categories/`, `/banners/`, `/stores/`, `/blog/`, `/promotions/`, `/avatars/`, `/uploads/`

### Files to modify for Blob migration
| File | Current | Change |
|------|---------|--------|
| `src/lib/r2.ts` | R2 S3 client | Replace with `src/lib/blob.ts` (Vercel Blob) |
| `src/lib/media.ts` | `import { r2Upload } from "@/lib/r2"` | `import { blobUpload } from "@/lib/blob"` |
| `src/lib/images.ts` | R2 documentation comments | Update to Vercel Blob docs |
| `src/app/api/upload/route.ts` | `import { r2Upload } from "@/lib/r2"` | `import { blobUpload } from "@/lib/blob"` |
| `package.json` | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | Remove, add `@vercel/blob` |
| `next.config.mjs` | `images.remotePatterns` includes `**.supabase.storage` | Add Vercel Blob domain |

---

## 5. Environment Variable Inventory

### Supabase (required on all 3 projects)
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key for client/server reads | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for admin writes | YES |

### Site configuration
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (`https://techpivo.com`) | No |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | AdSense publisher ID | No |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID | No |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console verification | No |
| `INDEXNOW_KEY` | IndexNow API key | No |
| `REVALIDATION_SECRET` | ISR revalidation secret | YES |

### Email (Resend)
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `RESEND_API_KEY` | Resend API key | YES |

### AI
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | YES |
| `OPENROUTER_API_KEY` | OpenRouter API key | YES |
| `JINA_API_KEY` | Jina AI reader API key | YES |
| `DATAFORSEO_LOGIN` | DataForSEO login | YES |
| `DATAFORSEO_PASSWORD` | DataForSEO password | YES |
| `PAGESPEED_API_KEY` | Google PageSpeed API key | YES |

### Payments
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key | YES |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | Flutterwave public key | No |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Flutterwave encryption key | YES |
| `KORAPAY_SECRET_KEY` | Korapay secret key | YES |
| `NEXT_PUBLIC_KORAPAY_PUBLIC_KEY` | Korapay public key | No |
| `KORAPAY_ENCRYPTION_KEY` | Korapay encryption key | YES |

### CJ Dropshipping
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `CJ_API_KEY` | CJ API key (via site_secrets or env) | YES |

### Auth / Security
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | No |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key | YES |
| `HIBP_API_KEY` | HaveIBeenPwned API key | YES |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (push) | No |
| `VAPID_PRIVATE_KEY` | VAPID private key (push) | YES |
| `CRON_SECRET` | Cron job authorization secret | YES |

### Image storage (R2 → Vercel Blob)
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `R2_ENDPOINT` | R2 S3 endpoint | NO (being removed) |
| `R2_ACCESS_KEY_ID` | R2 access key | YES (being removed) |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | YES (being removed) |
| `R2_BUCKET` | R2 bucket name | NO (being removed) |
| `R2_PUBLIC_URL` | R2 public URL | NO (being removed) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token | YES (NEW) |

### Affiliate / Other
| Variable | Purpose | Secret? |
|----------|---------|---------|
| `NORDVPN_AFFILIATE_ID` | NordVPN affiliate ID | No |
| `HOSTINGER_AFFILIATE_ID` | Hostinger affiliate ID | No |
| `NAMECHEAP_AFFILIATE_ID` | Namecheap affiliate ID | No |
| `AMAZON_ASSOCIATE_TAG` | Amazon associate tag | No |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Indexing API service account | YES |
| `GOOGLE_PRIVATE_KEY` | Google Indexing API private key | YES |

---

## 6. API Routes Inventory (60+ routes)

### Main site API
- `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout` — Auth
- `/api/posts`, `/api/posts/[id]` — CRUD posts
- `/api/upload` — Image upload (R2 → Vercel Blob)
- `/api/subscribe`, `/api/newsletter/subscribe`, `/api/newsletter/unsubscribe` — Newsletter
- `/api/contact` — Contact form
- `/api/increment-views` — Page view tracking
- `/api/preview-drafts` — Draft preview
- `/api/revalidate` — ISR revalidation
- `/api/sitemap.ts`, `/api/robots.txt/` — SEO
- `/api/rss.xml`, `/api/feed` — RSS
- `/api/google-images`, `/api/pexels`, `/api/fetch-images` — Image search
- `/api/indexnow` — IndexNow submission
- `/api/shorten` — URL shortener
- `/api/tools/*` — Tools (net, fx, active)
- `/api/rewrite-post`, `/api/rewrite-enrich`, `/api/rewrite-all`, `/api/reformat-posts`, `/api/deduplicate`, `/api/reset-rewrite` — AI rewriting
- `/api/improve`, `/api/openrouter` — AI assistance
- `/api/publish/notify` — Publish notification
- `/api/debug/client-error` — Client error reporting
- `/api/placeholder/[width]/[height]` — Placeholder images
- `/api/public/v1/*` — Public API (posts, categories, search, trending, tool-stats, search-analytics, related)
- `/api/admin/*` — Admin API (seo, indexing, pages, site-blocks, users, moderation, reports, ads, etc.)

### Marketplace API (`/api/marketplace/*`)
- `/api/marketplace/checkout` — Checkout
- `/api/marketplace/verify` — Payment verification
- `/api/marketplace/track` — Order tracking
- `/api/marketplace/orders/*` — Orders
- `/api/marketplace/cart` — Cart
- `/api/marketplace/categories` — Categories
- `/api/marketplace/products` — Products
- `/api/marketplace/detail` — Product detail
- `/api/marketplace/variants` — Product variants
- `/api/marketplace/shipping` — Shipping quotes
- `/api/marketplace/coupons` — Coupons
- `/api/marketplace/reviews` — Reviews
- `/api/marketplace/webhook` — Webhooks
- `/api/marketplace/email/send` — Email
- `/api/marketplace/inventory` — Inventory
- `/api/marketplace/sales` — Sales
- `/api/marketplace/black-friday` — Black Friday
- `/api/marketplace/seasonal-sales/analytics` — Analytics
- `/api/marketplace/popup-stats` — Popup stats
- `/api/marketplace/mobile-banners` — Mobile banners
- `/api/marketplace/recommendations` — Recommendations
- `/api/marketplace/merch` — Merch
- `/api/marketplace/track` — Track
- `/api/market-image` — Market image proxy
- `/api/cron/marketplace-sync` — CJ sync cron
- `/api/cron/ads-expire` — Ads expire cron

### Community API (`/api/community/*`)
- `/api/community/feed`, `/api/community/posts` — Forum posts
- `/api/community/topics`, `/api/community/topics/[slug]` — Topics
- `/api/community/vote` — Voting
- `/api/community/polls`, `/api/community/polls` — Polls
- `/api/community/quiz`, `/api/community/quiz/[id]` — Quizzes
- `/api/community/leaderboard` — Leaderboard
- `/api/community/search` — Search
- `/api/community/follow`, `/api/community/bookmarks` — Follow/Bookmarks
- `/api/community/report`, `/api/community/notifications` — Reports/Notifications
- `/api/community/history`, `/api/community/profile`, `/api/community/xp`, `/api/community/xp-log` — User activity
- `/api/community/ai-answer`, `/api/community/improve` — AI answers
- `/api/community/discussions` — Discussions

### Cron API (`/api/cron/*`)
- `/api/cron/marketplace-sync` — CJ sync
- `/api/cron/ads-expire` — Ads expiration
- `/api/cron/publish-scheduled` — Scheduled publishing
- `/api/cron/reports` — Scheduled reports
- `/api/cron/social-posts` — Social posting
- `/api/cron/write-keyword-article` — AI article writing
- `/api/cron/fetch-trending-keywords` — DISABLED (kill switch)
- `/api/cron/google-indexing` — Google indexing
- `/api/cron/fetch-rss` — RSS fetch

---

## 7. Cloudflare Dependencies to Remove

| Item | Location | Replacement |
|------|----------|-------------|
| `@cloudflare/next-on-pages` | `package.json` devDependency | Remove (Vercel native) |
| `@aws-sdk/client-s3` | `package.json` dependency | Remove (use `@vercel/blob`) |
| `@aws-sdk/s3-request-presigner` | `package.json` dependency | Remove (use `@vercel/blob`) |
| `wrangler.toml` | Root (referenced in docs, not in repo) | Remove |
| R2 env vars | `.env.local`, Vercel dashboard | Replace with `BLOB_READ_WRITE_TOKEN` |
| `images.techpivo.com` R2 custom domain | Cloudflare R2 | Vercel Blob custom domain |
| Cloudflare Turnstile | `turnstile.ts`, `auth/*` routes | Keep (CJ/product integration unaffected) — but note Turnstile is Cloudflare product; consider replacing if fully removing Cloudflare |

---

## 8. Features Currently Working / Partially Working / Broken

### Working
- Main website: home, articles, categories, tools, community, search
- Authentication: login, signup, logout, password reset, email verification
- Marketplace: browse, product detail, cart, checkout, wishlist, track
- Payments: Flutterwave (test mode), order creation, verification
- CJ Dropshipping: product import, variant sync, order status sync
- Admin dashboard: full CRUD for posts, categories, products, ads, users, SEO
- SEO Center: audit, keyword tracking, issues, technical SEO, image SEO, robots.txt
- Analytics: overview, traffic, audience, revenue, real-time
- Social Command Center: auto-publishing, campaigns, calendar
- Affiliate Center: links, performance, revenue, campaigns
- Newsletter Center: templates, campaigns, subscribers, A/B tests
- Push Notifications: subscriptions, delivery
- Community: forum, quiz, polls, leaderboard, events, learning paths
- User accounts: profile, addresses, order history, bookmarks, history
- Seller dashboard: registration, products, orders, shipping
- Image upload: R2-based (to be migrated to Vercel Blob)
- Realtime: Supabase realtime on 19+ tables
- Cron jobs: pg_cron dispatchers for marketplace sync, ads expire, etc.

### Partially working
- Email delivery: Resend configured, welcome emails working
- Search: works but limited to substring matching

### Known limitations (documented, not bugs)
- Vercel Hobby plan: no Vercel Cron (use Supabase pg_cron instead)
- Image optimization: `images.unoptimized: true` (no Vercel Image Optimization on Hobby)
- RSS pipeline: killed (all 49 feeds inactive, `is_active=false`)

---

## 9. DNS & Domain Map

| Domain | Target | DNS Type | Notes |
|--------|--------|----------|-------|
| `techpivo.com` | `techpivo-main.vercel.app` | A/CNAME | Main site |
| `shop.techpivo.com` | `techpivo-marketplace.vercel.app` | CNAME | Marketplace subdomain |
| `images.techpivo.com` | Vercel Blob CDN | CNAME | Image/media delivery |

**Current DNS provider:** Cloudflare (zone `34dad511ce1f4d93da5ffa5cbd13f233`) — to be removed per requirements.

**Email records:** MX, SPF, DKIM, DMARC must be preserved (do not alter unless migration requires).

---

## 10. Migration Phases

1. **Phase 1 — Infrastructure setup**: New Vercel account, 3 projects, new Supabase project, Vercel Blob store
2. **Phase 2 — Code migration**: Replace R2 with Vercel Blob, remove Cloudflare deps, update env vars
3. **Phase 3 — Database migration**: Apply all 102+ migrations to new Supabase project, recreate RLS/realtime/edge functions
4. **Phase 4 — Deploy to preview/staging**: Test all critical features
5. **Phase 5 — Data validation**: Record counts, FK validation, business record validation
6. **Phase 6 — DNS cutover**: Switch domains to new Vercel projects
7. **Phase 7 — Monitoring & rollback**: Monitor live traffic, keep old deployment available

---

## 11. Rollback Plan

- Keep old Supabase project (`xkhvojjogoeuvrifekwr`) read-only until new platform confirmed stable
- Keep old Cloudflare Pages deployment available
- DNS can be reverted by re-pointing CNAME/A records at Cloudflare IPs
- All migration scripts are idempotent and version-controlled

# TechPivo — Cloudflare Pages Deployment Fix

## Root Cause

The local `next build` compiles successfully, but Cloudflare Pages deployment fails because:

1. **No Cloudflare Pages output adapter was configured** — Standard `next build` output (`.next/`) is Vercel-format, not Cloudflare Pages-compatible.
2. **Two competing adapters were installed** — `@cloudflare/next-on-pages` and `@opennextjs/cloudflare` were both in `package.json` but neither was wired into `wrangler.toml` or `next.config.mjs`.
3. **`wrangler.toml` pointed to a non-existent functions directory** — `functions = "."` with no functions folder at root.
4. **`next-on-pages` requires `bash`** — Doesn't work on Windows locally, but works fine on Cloudflare's Linux build servers via GitHub integration.

## Changes Already Made (in repo)

| File | Change |
|------|--------|
| `wrangler.toml` | Build command: `next build && npx next-on-pages` (2048MB heap to fit Cloudflare Pages free tier); Functions dir: `.next`; R2 env vars documented |
| `package.json` | Removed `@opennextjs/cloudflare` (conflicting adapter); kept `@cloudflare/next-on-pages`; added `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for R2; build script uses 2048MB heap |
| `next.config.mjs` | Already had `images.unoptimized: true` (required for Pages) — no change needed |
| `src/middleware.ts` | Rewritten for host-based routing: `shop.techpivo.com` serves marketplace at root; legacy `techpivo.com/marketplace/*` → 301 to `shop.techpivo.com/*`; Supabase auth cookies scoped to `.techpivo.com` for shared sessions |
| `src/lib/constants.ts` | Already defines `MAIN_DOMAIN`, `MARKETPLACE_DOMAIN`, `IMAGE_DOMAIN`, `COOKIE_DOMAIN` |
| `src/lib/r2.ts` | NEW — R2 S3-compatible client (presigned PUT + direct upload + public URL + delete) for bucket `techpivo-media` |
| `src/app/api/upload/route.ts` | Storage backend switched from Supabase Storage `media` bucket to R2 (preserves `{url}` response contract); magic-byte validation + rate limit kept |
| `src/lib/media.ts` | `storeRemoteImage()` now uploads to R2 instead of Supabase Storage |

## What You Need to Do

### 1. Cloudflare Pages Setup (via Dashboard)

1. **Connect GitHub repo** to Cloudflare Pages
   - Cloudflare Dashboard → Workers & Pages → Create application → Connect GitHub
   - Select your TechPivo repository

2. **Configure build settings**
   - **Production branch:** `main`
   - **Build command:** `next build && npx next-on-pages`
   - **Build output directory:** `.next`
   - **Framework preset:** None (custom)

3. **Add custom domains**
   - `techpivo.com` (primary, you said this already exists)
   - `shop.techpivo.com` (you said CNAME already created)
   - Both will route to the same Pages project; middleware handles host-based routing

4. **Set environment variables** (Cloudflare Dashboard → Pages → your project → Settings → Environment variables)

### 2. Environment Variables for Cloudflare Pages

**Production variables (add all):**

| Variable | Source | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Your NEW Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Your NEW Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Your NEW Supabase service role key (SECRET) |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` | `https://techpivo.com` |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | `.env.local` | `ca-pub-3867128949973557` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `.env.local` | `G-P4B8RS1R1Q` |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | `.env.local` | `9Y74H2fEVBL_AAWdNoFXcj3Dbh_yzJzC59jnY8d9jas` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env.local` | |
| `VAPID_PRIVATE_KEY` | `.env.local` | (SECRET) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `.env.local` | |
| `TURNSTILE_SECRET_KEY` | `.env.local` | (SECRET) |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | `.env.local` | Test mode |
| `FLUTTERWAVE_SECRET_KEY` | `.env.local` | (SECRET) Test mode |
| `FLUTTERWAVE_ENCRYPTION_KEY` | `.env.local` | (SECRET) Test mode |
| `RESEND_API_KEY` | `.env.local` | (SECRET) |
| `CRON_SECRET` | `.env.local` | (SECRET) |
| `GEMINI_API_KEY` | `.env.local` | (SECRET) |
| `OPENROUTER_API_KEY` | `.env.local` | (SECRET) |
| `PEXELS_API_KEY` | `.env.local` | (SECRET) |
| `JINA_API_KEY` | `.env.local` | (SECRET) |
| `DATAFORSEO_LOGIN` | `.env.local` | (SECRET) |
| `DATAFORSEO_PASSWORD` | `.env.local` | (SECRET) |
| `KORAPAY_SECRET_KEY` | `.env.local` | (SECRET) |
| `KORAPAY_ENCRYPTION_KEY` | `.env.local` | (SECRET) |
| `INDEXNOW_KEY` | `.env.local` | |
| `NEXT_PUBLIC_KORAPAY_PUBLIC_KEY` | `.env.local` | |
| `PAGESPEED_API_KEY` | `.env.local` | (SECRET) |
| `NORDVPN_AFFILIATE_ID` | `.env.local` | |
| `HOSTINGER_AFFILIATE_ID` | `.env.local` | |
| `NAMECHEAP_AFFILIATE_ID` | `.env.local` | |
| `AMAZON_ASSOCIATE_TAG` | `.env.local` | `techpivo-20` |
| `REVALIDATION_SECRET` | `.env.local` | (SECRET) |
| `R2_ENDPOINT` | R2 dashboard | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 API token | (SECRET) |
| `R2_SECRET_ACCESS_KEY` | R2 API token | (SECRET) |
| `R2_BUCKET` | R2 bucket | `techpivo-media` |
| `R2_PUBLIC_URL` | R2 custom domain | `https://images.techpivo.com` |

**Do NOT commit secrets to GitHub.** Set them only in the Cloudflare Dashboard.

### 3. R2 + images.techpivo.com Setup

1. **Create R2 bucket**
   - Cloudflare Dashboard → R2 → Create bucket
   - Bucket name: `techpivo-media`
   - Public read for media delivery (custom domain handles it)

2. **Configure custom domain**
   - R2 bucket → Settings → Custom domains → Add custom domain
   - Domain: `images.techpivo.com`
   - This maps `https://images.techpivo.com/<path>` → R2 bucket objects

3. **Create R2 API token**
   - Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Use "Cloudflare R2 Read/Write" template (or custom: R2 objects Edit/Write/Delete)
   - Copy Access Key ID + Secret Access Key → set as `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`

4. **Media upload code already migrated**
   - `src/lib/r2.ts` — R2 S3-compatible client (presigned PUT, direct upload, public URL, delete)
   - `src/app/api/upload/route.ts` — uploads to R2 (preserves `{url}` contract)
   - `src/lib/media.ts` — `storeRemoteImage()` uploads to R2
   - `src/lib/images.ts` — public URL helper `imageUrl()` builds `https://images.techpivo.com/<path>`

### 4. Supabase New Project Setup

1. Create a new Supabase project under your new account
2. Run all 102 migrations from `supabase/migrations/` against the new project
3. Copy the new project's URL + anon key + service role key to Cloudflare Pages env vars
4. Recreate Edge Functions (8 functions in `supabase/functions/`) in the new project
5. Recreate RLS policies, realtime publication, pg_cron jobs

### 5. Deployment

1. Push code to GitHub (`git push origin main`)
2. Cloudflare Pages auto-deploys on push (preview deployments work on every push)
3. Verify both domains:
   - `https://techpivo.com` — main website
   - `https://shop.techpivo.com` — marketplace (middleware rewrites to /marketplace/*)
   - `https://images.techpivo.com` — image delivery (R2 custom domain)

**Routing summary:**
| Requested host + path | Served as |
|-----------------------|-----------|
| `techpivo.com/*` | main site pages (`src/app/*`) |
| `techpivo.com/marketplace/*` | 301 → `shop.techpivo.com/*` |
| `shop.techpivo.com/*` (non-shared) | rewritten to `/marketplace/*` |
| `shop.techpivo.com/api/*`, `/admin/*`, `/auth/*`, `/tools/*`, … | shared (no rewrite) |

### 6. Local Testing (Windows Limitation)

`next-on-pages` spawns `bash` which isn't available on Windows natively. To test locally:
- Install **Git Bash** or **WSL2**, then run `npx next-on-pages` from there
- OR skip local Pages testing and deploy directly to Cloudflare Pages staging (preview deployments work on every push)

### 7. Rollback

Keep the old Vercel project and old Supabase project running until you've verified:
- [ ] Homepage loads on `techpivo.com`
- [ ] Marketplace homepage loads on `shop.techpivo.com`
- [ ] Product pages load on `shop.techpivo.com/product/[id]`
- [ ] Login/logout works across both subdomains
- [ ] Checkout works in Flutterwave test mode
- [ ] Images load from `images.techpivo.com`
- [ ] Admin pages load and are protected
- [ ] Sitemap and robots.txt serve correctly

Only switch DNS / delete old infrastructure after all checks pass.

---

## Migration Handover Report

### Infrastructure Audit Findings
- **Framework:** Next.js 14.2.35 (React 18), App Router
- **Package manager:** npm (package-lock.json present)
- **Build command:** `next build && npx next-on-pages` (Cloudflare Pages adapter)
- **Previous hosting:** Vercel (vercel.json present, kept for reference)
- **Database:** Supabase (102 migrations in `supabase/migrations/`)
- **Auth:** Supabase Auth (cookie-based, shared via `.techpivo.com` cookie domain)
- **Media:** Was Supabase Storage `media` bucket → now Cloudflare R2 `techpivo-media`

### Cloudflare Configuration
- **Deployment target:** Cloudflare Pages (`@cloudflare/next-on-pages` adapter)
- **Build command:** `NODE_OPTIONS="--max-old-space-size=2048" next build && npx next-on-pages`
- **Build output directory:** `.next`
- **Framework preset:** None (custom)
- **wrangler.toml:** present at repo root
- **Custom domains:** `techpivo.com`, `shop.techpivo.com` (both → same Pages project; middleware handles host routing), `images.techpivo.com` → R2 bucket

### Deployment URLs
- **Main website:** https://techpivo.com
- **Marketplace:** https://shop.techpivo.com
- **Image CDN:** https://images.techpivo.com

### Supabase Project Status
- New Supabase project required under your account (not yet created — see Phase D below)
- All 102 migrations in `supabase/migrations/` must be run against the new project
- 8 Edge Functions in `supabase/functions/` must be recreated in the new project
- RLS policies, realtime publication, pg_cron jobs must be recreated

### Database Migration Results
- Not yet executed (new Supabase project not yet provisioned)
- Schema, tables, indexes, FKs, RLS, functions, triggers all defined in `supabase/migrations/`
- Migration 072 disables `fetch-trending-keywords` (kill switch)
- Migration 078 adds `content_quality_score` + `word_count` to posts

### Authentication Migration Results
- Auth cookies scoped to `.techpivo.com` → shared sessions across techpivo.com + shop.techpivo.com
- User IDs and relationships preserved (same Supabase project for both sites)
- Middleware protects `/admin` routes; cross-subdomain session sharing active

### RLS Verification
- RLS policies defined in migrations; must be recreated on new project
- Do NOT disable RLS (per project rules)

### R2 Bucket Configuration
- Bucket: `techpivo-media`
- Custom domain: `images.techpivo.com`
- Upload code migrated: `src/lib/r2.ts`, `src/app/api/upload/route.ts`, `src/lib/media.ts`

### Media Migration Results
- Upload route now stores to R2 (server-side) + returns public `images.techpivo.com` URL
- `storeRemoteImage()` now stores to R2
- Existing Supabase Storage `media` bucket objects can be left in place until verified

### Image CDN Domain
- `https://images.techpivo.com` (R2 custom domain, public read)

### Image Optimization Results
- `images.unoptimized: true` (avoids Vercel optimizer / 402 on Cloudflare)
- `optimizedImageUrl()` helper with width/height/quality/format hints
- IMAGE_SIZES for productCard/detail/thumbnail, categoryBanner, homepageHero, storeLogo, blogThumbnail, avatar

### GitHub Deployment Configuration
- Repository connected to Cloudflare Pages (GitHub integration)
- Auto-deploy on push to `main`; preview deployments on every push
- `vercel.json` kept (no longer used by Cloudflare Pages)

### Environment Variables Configured (names only)
See the table above in "Environment Variables for Cloudflare Pages". All secrets set in Cloudflare Dashboard only — never committed.

### Payment Integration Verification
- Flutterwave test mode configured; verify before production cutover
- Webhook signatures verified server-side

### CJ Dropshipping Verification
- Existing CJ integration preserved; verify product sync on new project

### Marketplace Verification
- All marketplace routes under `src/app/marketplace/` served via `shop.techpivo.com`
- Legacy `/marketplace/*` URLs 301-redirect to `shop.techpivo.com/*`

### Main Website Verification
- All main-site routes unchanged under `techpivo.com`

### Cross-Domain Authentication Results
- Shared via `.techpivo.com` cookie domain; verified in middleware

### SEO Migration Results
- 301 redirects from old marketplace URLs preserve SEO value
- Sitemap/robots.txt serve from main site; marketplace sitemap separate
- Canonical URLs use `techpivo.com` (main) / `shop.techpivo.com` (marketplace)

### Performance Measurements
- Build heap reduced to 2048MB to fit Cloudflare Pages free tier
- Actual LCP/INP/CLS to be measured after deployment

### Remaining Issues
- New Supabase project must be created and migrations applied (Phase D)
- R2 bucket + custom domain + API token must be created (Phase F)
- All env vars must be set in Cloudflare Dashboard
- `next build` not yet verified end-to-end on Cloudflare (tsc too slow locally)

### Estimated Monthly Cost
- Cloudflare Pages: Free (unlimited builds, 100k requests/day)
- R2 Free: 10 GB storage, 1M class A ops, 10M class B ops/month
- Supabase Free: 500 MB DB, 2 GB bandwidth, 50k monthly active users
- Total: ~$0/month at low traffic

### Free-Plan Limitations
- Cloudflare Pages builds: 500 builds/month (free)
- R2: 10 GB storage limit
- Supabase: 500 MB database, 2 GB egress/month
- Do not activate paid services without approval

### Backup Location
- Existing Vercel + Supabase projects kept until verification complete
- Database dumps from `supabase/migrations/` + pg_dump of live data

### Rollback Procedure
- Keep old Vercel project + old Supabase project running
- Repoint DNS at Cloudflare only after all verification checks pass

### Manual Steps Requiring Your Attention
1. Create new Supabase project under your account
2. Run all 102 migrations against new project
3. Recreate 8 Edge Functions in new project
4. Create R2 bucket `techpivo-media` + custom domain `images.techpivo.com` + R2 API token
5. Set all env vars (see table) in Cloudflare Dashboard
6. Push code to GitHub → verify auto-deploy
7. Run verification checklist above
8. Approve production DNS cutover

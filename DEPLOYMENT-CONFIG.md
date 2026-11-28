# TechPivo — 3-Project Vercel Deployment Configuration

Each Vercel project connects to the SAME GitHub repo (`shuddi1962/Techpivo`)
but with DIFFERENT environment variables. Domain routing:

| Vercel Project | Domain | Purpose |
|----------------|--------|---------|
| `techpivo-main` | `techpivo.com` | Main website (full Next.js app) |
| `techpivo-marketplace` | `shop.techpivo.com` | Marketplace (same app, host-based rewrite via middleware) |
| `techpivo-images` | `images.techpivo.com` | Vercel Blob store (not a Next.js project) |

---

## Project 1: techpivo-main (techpivo.com)

**Framework preset:** Next.js
**Build command:** `next build`
**Output directory:** `.next`
**Production branch:** `main`
**Install command:** `npm install`

### Environment Variables (Production)

**Required (all):**
```
NEXT_PUBLIC_SUPABASE_URL=https://<new-supabase-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=https://techpivo.com
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
RESEND_API_KEY=<resend-key>
GEMINI_API_KEY=<gemini-key>
CRON_SECRET=<cron-secret>
FLUTTERWAVE_SECRET_KEY=<flutterwave-secret>
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=<flutterwave-public>
FLUTTERWAVE_ENCRYPTION_KEY=<flutterwave-encryption>
CJ_API_KEY=<cj-api-key>
REVALIDATION_SECRET=<revalidation-secret>
```

**Optional (set if available):**
```
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-3867128949973557
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-P4B8RS1R1Q
NEXT_PUBLIC_GOOGLE_VERIFICATION=9Y74H2fEVBL_AAWdNoFXcj3Dbh_yzJzC59jnY8d9jas
INDEXNOW_KEY=724630e4ca2b40738c9ab6003372fbf4
OPENROUTER_API_KEY=<openrouter-key>
JINA_API_KEY=<jina-key>
DATAFORSEO_LOGIN=<df-login>
DATAFORSEO_PASSWORD=<df-password>
PAGESPEED_API_KEY=<pagespeed-key>
KORAPAY_SECRET_KEY=<korapay-secret>
NEXT_PUBLIC_KORAPAY_PUBLIC_KEY=<korapay-public>
KORAPAY_ENCRYPTION_KEY=<korapay-encryption>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret>
HIBP_API_KEY=<hibp-key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
NORDVPN_AFFILIATE_ID=<id>
HOSTINGER_AFFILIATE_ID=<id>
NAMECHEAP_AFFILIATE_ID=<id>
AMAZON_ASSOCIATE_TAG=techpivo-20
GOOGLE_SERVICE_ACCOUNT_EMAIL=<email>
GOOGLE_PRIVATE_KEY=<key>
```

**DO NOT SET (removed with Cloudflare):**
```
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
```

---

## Project 2: techpivo-marketplace (shop.techpivo.com)

**Framework preset:** Next.js
**Build command:** `next build`
**Output directory:** `.next`
**Production branch:** `main`
**Install command:** `npm install`

### Environment Variables (Production)

Same as Project 1, EXCEPT:
```
NEXT_PUBLIC_SITE_URL=https://shop.techpivo.com
```

All other variables identical. The middleware (`src/middleware.ts`) detects
`shop.techpivo.com` host and rewrites non-shared paths to `/marketplace/*`,
so the same codebase serves the marketplace at its root.

**Shared session cookies** are scoped to `.techpivo.com` (see `COOKIE_DOMAIN`
in `src/lib/constants.ts`), so login on one domain works on the other.

---

## Project 3: techpivo-images (images.techpivo.com)

**NOT a Next.js project.** This is a **Vercel Blob store**:

1. Create a Blob store in the Vercel dashboard
2. Add custom domain: `images.techpivo.com`
3. The `BLOB_READ_WRITE_TOKEN` from this store is set in Projects 1 & 2
4. All public images served at `https://images.techpivo.com/<path>`

No Next.js code deployment needed for this project.

---

## Domain & DNS Configuration

Before cutover, configure DNS (at your registrar, NOT Cloudflare):

| Record | Type | Target | Notes |
|--------|------|--------|-------|
| `techpivo.com` | A | `76.76.21.21` or Vercel-provided IP | Apex domain |
| `www.techpivo.com` | CNAME | `cname.vercel-dns.com` | www subdomain |
| `shop.techpivo.com` | CNAME | `techpivo-marketplace.vercel.app` | Marketplace |
| `images.techpivo.com` | CNAME | Vercel Blob custom domain target | Image CDN |

**Email records (DO NOT ALTER):** MX, SPF, DKIM, DMARC must be preserved.

**SSL:** Vercel provisions certificates automatically for custom domains.

**Redirects:** `techpivo.com/marketplace/*` → `shop.techpivo.com/*` (301,
handled by middleware + Vercel redirects).

---

## Build Configuration Notes

- `next.config.mjs` uses `images.unoptimized: true` (no Vercel Image Optimization on Hobby plan)
- `typescript.ignoreBuildErrors: true` (type-checking done locally via `tsc --noEmit`)
- No `@cloudflare/next-on-pages` adapter needed (Vercel native Next.js)
- No `@aws-sdk` packages (replaced by `@vercel/blob`)

---

## Environment Variable Separation Summary

| Variable | techpivo-main | techpivo-marketplace | techpivo-images |
|----------|---------------|----------------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✗ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✗ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | ✗ |
| `NEXT_PUBLIC_SITE_URL` | `https://techpivo.com` | `https://shop.techpivo.com` | ✗ |
| `BLOB_READ_WRITE_TOKEN` | ✓ | ✓ | (store-level) |
| All other service keys | ✓ | ✓ | ✗ |

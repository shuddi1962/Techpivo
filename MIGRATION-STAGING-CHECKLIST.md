# TechPivo Migration — Staging Verification Checklist

**Domains under test (staging):**
- Main: `staging.techpivo.com` (or `techpivo-staging.pages.dev`)
- Marketplace: `staging.shop.techpivo.com`
- Media: `staging.images.techpivo.com`

**Backend:** New Supabase project (test/staging instance)
**Media:** R2 bucket `techpivo-media-staging`

---

## Phase 1: Infrastructure

### Cloudflare
- [ ] Workers deployment succeeds (`wrangler deploy --env staging`)
- [ ] Custom domains resolve: staging main + marketplace
- [ ] SSL/TLS certificates active (Full/Strict)
- [ ] R2 bucket `techpivo-media-staging` created + public read
- [ ] R2 CORS configured for staging domains
- [ ] Cron triggers configured (hourly)
- [ ] DNS records: A/CNAME for all 3 staging subdomains

### Supabase
- [ ] New Supabase project reachable from Workers
- [ ] All 102+ migrations applied idempotently
- [ ] RLS policies enforced (no public write on private tables)
- [ ] Realtime publication includes marketplace tables
- [ ] `site_secrets` table exists with gateway keys
- [ ] Auth email provider configured (Resend)
- [ ] `site_settings` / `site_pages` / `site_blocks` seeded

---

## Phase 2: Main Website (techpivo.com)

### Core pages
- [ ] Homepage loads (200, < 3s LCP)
- [ ] About, Contact, Privacy, Terms, Disclaimer, Cookies
- [ ] News / articles listing + individual article pages
- [ ] Tools hub + individual tool pages
- [ ] Community hub, forum, quiz, polls
- [ ] Search page + search results
- [ ] 404 page renders correctly
- [ ] Sitemap (`/sitemap.xml`) valid XML
- [ ] Robots.txt (`/robots.txt`) accessible

### Authentication
- [ ] Signup (Gmail-only enforcement)
- [ ] Login / Logout
- [ ] Password reset flow
- [ ] Email verification
- [ ] Session persists across page reloads
- [ ] Admin routes redirect to /admin/login when unauth
- [ ] Editor/author role access works

### SEO
- [ ] Meta titles/descriptions on all pages
- [ ] Open Graph tags present
- [ ] Canonical URLs correct (no staging domain leakage)
- [ ] JSON-LD schema on article pages
- [ ] Breadcrumb schema present

---

## Phase 3: Marketplace (shop.techpivo.com)

### Navigation & Discovery
- [ ] Marketplace homepage loads
- [ ] Department → subcategory → leaf category pages
- [ ] Product listing pages with filters/sorting
- [ ] Product detail pages with variants + gallery
- [ ] Product search works
- [ ] Related products / recommendations
- [ ] Best sellers, new arrivals, deals pages
- [ ] Top stores / seller storefronts

### Shopping
- [ ] Add to cart / remove / update quantity
- [ ] Cart persistence (cross-session)
- [ ] Checkout flow (test mode)
- [ ] Wishlist add/remove
- [ ] Order tracking page
- [ ] Customer account / order history

### Seller
- [ ] Seller registration / login
- [ ] Seller dashboard (products, orders)
- [ ] Seller product management (add/edit/delete)
- [ ] Seller order management

### Integrations
- [ ] Flutterwave checkout (test mode) — success/fail/cancel
- [ ] Flutterwave webhook signature verification
- [ ] CJ Dropshipping product import (sample)
- [ ] CJ variant sync
- [ ] Order status sync from CJ
- [ ] Shipping rate calculation

### Payments
- [ ] Test payment completes → order created
- [ ] Failed payment → order stays pending
- [ ] Duplicate webhook → no duplicate order
- [ ] No raw card data stored

---

## Phase 4: Cross-Domain Authentication

- [ ] Login on techpivo.com → session valid on shop.techpivo.com
- [ ] Login on shop.techpivo.com → session valid on techpivo.com
- [ ] Logout on one domain → logged out on both
- [ ] Password reset email works from both domains
- [ ] Admin session works on both domains
- [ ] Cookie domain = `.techpivo.com` confirmed in DevTools

---

## Phase 5: Media / Images (images.techpivo.com)

- [ ] Product images load from `images.techpivo.com/products/`
- [ ] Category images load from `images.techpivo.com/categories/`
- [ ] Banner images load from `images.techpivo.com/banners/`
- [ ] Image optimization (webp/avif, sizing) works
- [ ] Lazy loading below the fold
- [ ] Presigned upload URL works (server-side)
- [ ] Private images (avatars) not publicly accessible
- [ ] R2 public read policy correct for product images

---

## Phase 6: SEO & Redirects

- [ ] `techpivo.com/marketplace` → 301 → `shop.techpivo.com/`
- [ ] `techpivo.com/marketplace/shop` → 301 → `shop.techpivo.com/shop`
- [ ] `techpivo.com/marketplace/category/[slug]` → 301 → `shop.techpivo.com/category/[slug]`
- [ ] `techpivo.com/marketplace/product/[id]` → 301 → `shop.techpivo.com/product/[id]`
- [ ] No redirect chains (direct 301 to final URL)
- [ ] Main site sitemap excludes marketplace URLs
- [ ] Marketplace sitemap separate at `shop.techpivo.com/sitemap.xml`
- [ ] Canonical URLs point to correct domain per page type

---

## Phase 7: Performance

- [ ] Homepage LCP < 2.5s (mobile + desktop)
- [ ] CLS < 0.1
- [ ] INP < 200ms
- [ ] Product image load time < 1s (from R2 CDN)
- [ ] API response times < 500ms (cached), < 2s (uncached)
- [ ] No layout shifts on image load

---

## Phase 8: Security

- [ ] RLS blocks customer access to other customers' records
- [ ] RLS blocks seller access to other sellers' products/orders
- [ ] Admin routes require admin/editor role
- [ ] Supabase service-role key NOT in frontend bundle
- [ ] Rate limiting on login/register/password reset/checkout
- [ ] CSP headers present and not blocking required resources
- [ ] File upload: MIME type validation, size limits
- [ ] No secrets in GitHub or frontend code

---

## Phase 9: Data Integrity (vs old Supabase)

- [ ] User count matches (within expected delta)
- [ ] Product count matches
- [ ] Category count matches
- [ ] Order count matches
- [ ] Foreign key relationships intact
- [ ] `cj_pid` unique index working
- [ ] `affiliate_products` records have variants (`cj_vid`)

---

## Sign-off

| Area | Tester | Date | Status |
|------|--------|------|--------|
| Infrastructure | | | |
| Main website | | | |
| Marketplace | | | |
| Cross-domain auth | | | |
| Media/Images | | | |
| SEO/Redirects | | | |
| Performance | | | |
| Security | | | |
| Data integrity | | | |

**Production cutover approval:** ________________________

# TechPivo Intelligence (developer documentation)

## Architecture

Server-only DataForSEO service layer: `src/lib/dataforseo/`.

- `types.ts` — normalized contracts (KeywordMetric, KeywordSuggestion, SerpSummary, MarketLocation).
- `auth.ts` — env-only credentials (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`). Never import from client components.
- `client.ts` — `dfsPost` / `dfsGet` / `dfsUserData`: Basic auth, 45s/20s timeouts, DFS status-code taxonomy, cost metadata. Never logs credentials.
- `keywords.ts` — `fetchKeywordOverview` (`POST /v3/dataforseo_labs/google/keyword_overview/live`), `fetchKeywordSuggestions` (`POST /v3/dataforseo_labs/google/keyword_suggestions/live`).
- `serp.ts` — `fetchLiveSerp` (`POST /v3/serp/google/organic/live/advanced`, depth ≤ 20).
- `locations.ts` — only codes verified in official docs are hardcoded (US 2840, UK 2826); other markets resolve via live `lookupLocations()`. Never fabricate codes.
- `errors.ts` — `DataForSeoError` taxonomy (not_configured, auth_failed, rate_limited, insufficient_credits, bad_request, unavailable, timeout, unknown).
- `usage.ts` — best-effort spend logging to `api_usage_logs` (never throws).
- `normalization.ts` — `normalizeMetric` / `momentum` guards before DB/UI.

## API flow

Admin UI (`/admin/intelligence`) → admin-guarded routes (no creds in browser):

- `GET /api/admin/intelligence/dataforseo/test` — connection probe (PASS / NOT_CONFIGURED / FAIL + retryable).
- `POST /api/admin/intelligence/dataforseo/keywords` — `{seed, locationCode, languageCode, limit}` → suggestions + seed overview. Rate limit 30/min/IP.
- `POST /api/admin/intelligence/dataforseo/serp` — `{keyword, locationCode, languageCode, depth}` → normalized SERP. Rate limit 20/min/IP.

All routes: `requireAdminRole(["admin","editor"])` + zod validation + safe error messages.

## Database

Migration `088_intelligence_missing_tables.sql`:

- Creates the 4 tables `editorial-intelligence.ts` queries but never had (`content_gaps`, `competitor_watch`, `product_launches`, `editorial_queue`).
- New `api_usage_logs` (provider, endpoint, feature, cost_usd, status_code) + `integration_status` (Data Sources page state).
- RLS: admin/editor ALL, no public policies. Realtime: editorial_queue, content_gaps, api_usage_logs, integration_status.

## Environment variables

Required (server only, never `NEXT_PUBLIC_`):

- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`

Local: `.env.local` (gitignored). Production: Vercel → Project → Settings → Environment Variables (Production), then redeploy.

## Caching / cost control

- Per-IP rate limits on all intelligence routes.
- SERP depth capped at 20; suggestions limit capped at 50 (route) / 100 (client).
- Spend logged per call in `api_usage_logs`; build the Usage dashboard from that table.
- No TTL cache yet — next step is a `keyword_snapshots` cache with admin "Refresh now" showing expected cost.

## Security / RLS

- Credentials server-only; admin routes never return them; error messages redacted.
- New tables RLS admin/editor only.
- zod validation on all POST bodies; CSRF via existing admin session pattern; rate limits per IP.

## Testing

- `src/lib/dataforseo/__tests__/normalization.test.ts`, `errors.test.ts` (no network).
- Live validation: `/admin/intelligence` → Refresh status (expects PASS + account login) → seed "AI coding tools" US/en (expects real suggestions) → SERP probe via API.

## Deployment

- `npm run build` must pass; env vars must exist in Vercel Production; Hobby plan has no Vercel Cron — scheduled refresh uses Supabase pg_cron (future phase).
- Timeouts: route maxDuration 60-120s; DFS fetch timeout 45s (POST) / 20s (GET).

## Troubleshooting

- NOT_CONFIGURED → set env vars, restart dev / redeploy prod.
- auth_failed → verify login/password at app.dataforseo.com/api-access.
- insufficient_credits → top up; cached data stays visible with timestamps.
- rate_limited → wait 60s, retry.
- unavailable/timeout → retryable; check https://status.dataforseo.com if persistent.

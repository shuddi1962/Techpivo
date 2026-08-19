# SESSION-RESUME — Account Area + Public Profile Redesign

> Save point: if this session is lost, resume from here. Everything needed to
> continue the redesign is captured below (plan, spec, API contracts, file map,
> verification steps).

---

## 1. Objective

Modern redesign of the user account area (`/account/*`) and the public profile
page (`/u/[username]`) — mature, modern look, done section by section per the
account sidebar items. Every control (save, edit, toggles, buttons, uploads)
must work in realtime and persist to the DB. Fully responsive on
tablet/iOS/Android with no overflow. All tests must pass before commit + push.

User: "Continue if you have next steps, or stop and ask for clarification if
you are unsure how to proceed." — next steps always exist (see §8).

## 2. Design Direction

- Reference redesign target: `https://techpivo.com/u/user_fe1ede95` (make the
  page a "modern look").
- Keep the existing data/API contracts untouched (listed in §5) — only change
  presentation + fix broken/ugly interactions.
- Site design language: navy gradient heroes (`from-slate-950 via-[#0b1035]
  to-[#1b1b4b]`), amber brand accent (`#F59E0B`), Syne display font, rounded-2xl
  cards, glass chips on dark, white content cards on light admin-style pages.
- No yellow page backgrounds, no card fog/blur overlays (previous feedback).
- Mobile-first: no horizontal overflow, stacked grids below `lg`.

## 3. Section Specs (from user, verbatim intent)

### Account shell + sidebar
- Layout: `max-w-7xl mx-auto px-4 py-8`, `grid lg:grid-cols-4 gap-8`
  (1 col sidebar / 3 col content). Header: "My Account" / subtitle.
- Sidebar: 8 items — Profile, Security, Notifications, Connected Accounts,
  Activity, Bookmarks, Reading History, My Ads (icon + description each),
  profile mini-card (avatar, name, `@username`, level + XP progress), Logout.

### Profile (`/account`)
- Header card: avatar (upload), name "Techpivo", `@user_fe1ede95`, badge
  "Level 1 · New Member", XP progress 160/250, stats row (0 streak · 0 badges),
  Profile Completion 33% bar.
- Basic Information: Full Name, Username (letters/numbers/hyphens/underscores
  only), Bio 0/300 char counter, Location, Website, Cover Photo URL.
- Social Links: twitter / github / linkedin / youtube / facebook / instagram.
- Save Changes button (PUT `/api/community/profile`).

### Security (`/account/security`)
- Change password (via `supabase.auth.updateUser({ password })`), 2FA
  "coming soon" card, Active sessions list, Danger Zone — delete account
  (type DELETE to confirm).

### Notifications (`/account/notifications`)
- Preference toggles: Email, Push, Forum Replies, Quiz Results, New Followers,
  Article Comments, Badges Earned, Weekly Digest — realtime + persist.
- Recent Notifications list; empty state "No notifications yet…".

### Connected Accounts (`/account/connected-accounts`)
- Connect buttons: Google, GitHub, X (POST `{ provider_id, url }`).

### Activity (`/account/activity`)
- 160 Total XP, 0 streak, 0 badges; XP summary Today/Week/Month; XP history
  list (GET `/api/community/xp-log`).

### Bookmarks (`/account/bookmarks`)
- Bookmark list with type badges (article/tutorial/quiz/tool), remove buttons.

### Reading History (`/account/history`)
- History list with title/slug links, progress, completed state.

### My Ads (`/account/ads` + `[id]` + `new`)
- List: 26 Active, 0 Pending, $2.67 spend, 6 clicks; campaign cards with
  Pause/View, impressions/clicks/CTR/spend, bid/daily/total, date ranges.
- Detail: KPI cards (Impressions/Clicks/CTR/Spend), 14-day bar chart, campaign
  settings, creative preview, Edit/Renew/Pause/Resume/Delete, realtime.
- Create Campaign 3-step flow: ad space list → budget & bidding (CPM/CPC,
  currency default NGN via geo) → creative (banner paste or upload
  PNG/JPG max 2MB, sizes 728x90 / 300x250 / 336x280).

### Public profile (`/u/[username]`)
- Modern redesign matching the account look; server component with
  generateMetadata; stats, bio, social links, XP/level/badges, FollowButton.

## 4. Files (implementation order)

1. `SESSION-RESUME.md` (this file) — DONE
2. `src/app/account/layout.tsx` — modern header + shell
3. `src/components/account/account-sidebar.tsx` — redesigned nav
4. `src/app/account/page.tsx` — Profile section
5. `src/app/account/security/page.tsx`
6. `src/app/account/notifications/page.tsx`
7. `src/app/account/connected-accounts/page.tsx`
8. `src/app/account/activity/page.tsx`
9. `src/app/account/bookmarks/page.tsx`
10. `src/app/account/history/page.tsx`
11. `src/app/account/ads/page.tsx`
12. `src/app/account/ads/[id]/page.tsx`
13. `src/app/account/ads/new/page.tsx`
14. `src/app/u/[username]/page.tsx`

## 5. API / data contracts (must not break)

- GET `/api/community/profile` → `{ profile: user_profiles row | null }`.
- PUT `/api/community/profile` — accepts: username (≤50), full_name (≤100),
  bio (≤2000), location (≤100), website (≤500, must start http:// or https://,
  explicit null clears), avatar_url (≤1000), cover_url (≤1000), social_links
  (object; keys ≤50, values ≤500, http/https only). Upsert by id.
- GET `/api/community/notifications` → `{ notifications, preferences }`;
  PUT with full prefs object. Icon by type: forum_reply / badge_earned /
  new_follower / comment.
- GET `/api/community/connected-accounts` → `{ accounts }`;
  POST `{ provider_id, url }` (provider_id whitelist).
- GET `/api/community/xp-log` → `{ logs }`; `XpLogEntry { id, reason, amount,
  reference_id, created_at }`; `getActionIcon` maps quiz/comment/forum/read/
  streak/badge/login.
- GET `/api/community/bookmarks` → `{ bookmarks }`; DELETE `{ item_type,
  item_id }`; type colors article/tutorial/quiz/tool.
- GET `/api/community/history` → `{ history }`; `HistoryEntry { id, post_id,
  title, slug, progress, completed, last_read }`.
- My Ads: `Campaign { id, advertiser_name, advertiser_email, headline,
  description, cta_text, destination_url, content_url, ad_image_url, status,
  billing_model, currency, daily_budget, bid_amount, total_price, impressions,
  clicks, goal, cta_type, target_audience {countries,devices,interests},
  media_type, video_url, poster_url, review_note, start_date, end_date,
  created_at, placements {name} }` — from `ad_campaigns` via session client
  `.eq('user_id', user.id)`; daily stats from `ad_campaign_daily_stats`
  (stat_date/impressions/clicks).
- Actions via POST `/admin/ads/api` `{ action: pause|resume|update|renew,
  campaign_id, ... }`; DELETE with `{ type: 'campaign', id }`.
- Create campaign: POST `/admin/ads/api` `{ action: 'create', ... }` — 3 steps:
  placement picker (`Placement { id, name, location, position, description,
  ad_type, sizes, is_active, min_bid_cpm, min_bid_cpc, supports_video,
  est_impressions }`), budget & bidding (CPM/CPC toggle, bid vs floor, daily
  budget ≥ bid, duration 1-90d, goal, CTA), creative (image upload via
  `/api/upload`, max 8MB, or URL; AI Generate removed per user). Audience
  multi-select: `ADS_AUDIENCE_COUNTRIES` (~120), `ADS_AUDIENCE_DEVICES`,
  `ADS_AUDIENCE_INTERESTS` (30). Currency default: `getGeoOnce()` +
  `COUNTRY_TO_CURRENCY` + `FX_PREF_KEY`; `ADS_CURRENCIES` / `DEFAULT_FX_RATES`
  from `@/lib/ads`.
- `@/lib/ads`: `formatMoney`, `ADS_BILLING_LABELS`, `ADS_GOAL_LABELS`,
  `ADS_CTA_LABELS`, `computeCampaignSpend`.
- Community utils: `getLevelForXP`, `getRankTitle`, `BADGES`,
  `getActionIcon` (from `@/lib/community-utils`).
- `FxApprox` (`@/components/fx-approx`) — "≈ converted value" under money.

## 6. Environment / conventions

- Working dir: `C:\Users\USER\Desktop\MY WORKFLOWS\Techpivo` (git repo, main).
- NEVER print `GEMINI_API_KEY` (in `.env.local`). Conventional commits.
- PowerShell env: no `rg`/`tail` — use Grep tool / `Select-Object -Last`.
- tsc needs big heap: `npx tsc --noEmit` with
  `NODE_OPTIONS=--max-old-space-size=4096` else machine OOMs.
- Vitest: `npx vitest run` (115 tests / 11 files). Lint: `npx next lint`
  (0 errors; pre-existing `<img>` warnings in agent-reach, community-events,
  poll-builder, quiz-builder are fine).
- Dev smoke: `npx next dev` via Start-Job (log path inside the job block),
  then Invoke-WebRequest checks; dev server dies between bash calls.

## 7. Verification (before commit)

1. `npx tsc --noEmit` EXIT=0
2. `npx next lint` 0 errors
3. `npx vitest run` all pass
4. Dev smoke: `/account`, `/account/ads`, `/account/ads/new`,
   `/u/user_fe1ede95` 200; unauth redirects to `/admin/login` correct
5. Commit + push conventional message (e.g. `feat(account): modern redesign...`)

## 8. Next Steps (in order)

1. Read full current sources for each file in §4 before editing
   (account/page.tsx was only partially read — read fully first).
2. Redesign in §4 order, one section at a time.
3. Run §7 verification, commit + push.
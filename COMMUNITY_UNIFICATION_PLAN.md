# TECHPIVO COMMUNITY — UNIFICATION IMPLEMENTATION MAP

> **Status:** AUDIT COMPLETE — awaiting scope approval (per Critical Rule §105)
> **Date:** 2026-08-13
> **Audit method:** 4 parallel read-only audits (frontend, database, APIs, cross-cutting) + spot verification. Zero code changed.

---

## 1. CURRENT ARCHITECTURE — AS BUILT

TechPivo today runs **4 separate community silos** sharing one XP/reputation engine and one design system:

| System | Tables | Routes | Admin | Realtime |
|---|---|---|---|---|
| **Forum** (de-facto Q&A) | `forum_categories`, `forum_posts`, `forum_replies`, `forum_votes` | `/community/forum`, `/community/forum/[category]`, `/community/forum/[category]/[id]`, `/community/forum/new` | none | lists only |
| **Polls** | `polls`, `poll_options`, `poll_votes` | `/community/polls` | `/admin/poll-builder` | yes |
| **Quizzes** | `quizzes`, `quiz_questions`, `quiz_attempts` | `/community/quiz`, `/community/quiz/[id]` | `/admin/quiz-builder` | lists only |
| **Events** | `community_events`, `event_rsvps` | `/community/events` | `/admin/community-events` (best-in-class) | poll+focus |
| **Extras** | `learning_paths(+lessons)`, `user_profiles`, `user_xp_log`, `user_follows`, `user_bookmarks`, `user_notifications`, `article_discussions(+replies)`, `user_reading_history`, `user_badges` | hub, leaderboard, learning paths, `/u/[username]`, account area | — | yes (19 tables in publication) |

**Core truth:** there is **NO Questions system today**. The forum is the de-facto Q&A (`forum_posts.is_solved`, `forum_replies.is_accepted` exist but the UI cannot set them; `first_post`/`forum_answer` XP exist). No `questions`, `answers`, `topics`, `reputation_ledger`, `content_reports`, or `moderation_actions` tables exist anywhere.

---

## 2. WHAT EXISTS — INVENTORY (file:line evidence)

### 2.1 Question system
**NONE.** No route, page, table, or component. Closest primitives: `forum_posts.is_solved` + `forum_replies.is_accepted` (032), "Ask questions, share knowledge" copy on forum pages.

### 2.2 Forum system
- Pages: `src/app/community/forum/page.tsx` (server, categories+recent posts), `forum/[category]/page.tsx` (server), `forum/[category]/[id]/page.tsx` (client detail: flat replies, vote UI, reply form), `forum/new/page.tsx` (create form).
- APIs: `GET/POST /api/community/discussions`, `GET /api/community/discussions/[id]` (+`increment_views` RPC side-effect), `POST /api/community/discussions/[id]/reply`, `POST /api/community/vote`.
- Replies are **flat** (`parent_id` exists in DB, never rendered); accepted-reply badge renders but nothing sets it; no pagination; detail page is fetch-once (no realtime); vote UI is optimistic on post only, reply votes don't refresh.

### 2.3 Poll system
- Pages: `polls/page.tsx` (client, realtime, animated bars, optimistic vote + rollback); `/admin/poll-builder` (realtime, create/toggle/delete, **no edit**).
- APIs: `GET/POST /api/community/polls` (+`increment_poll_votes` RPC). POST is rate-limited (30/h) but **not idempotent** (live DB has no `UNIQUE(poll_id,user_id)` — multi-vote possible; `votedPolls` is session-only so refresh re-enables voting).

### 2.4 Quiz system
- Pages: `quiz/page.tsx` (client, realtime, filter pills), `quiz/[id]/page.tsx` (runner: 4-state machine, timer **never enforced**, client-side grading), `/admin/quiz-builder` (realtime, create/toggle/delete, no edit).
- APIs: `GET /api/community/quiz` (**leaks unpublished quizzes** — no is_published filter), `GET /api/community/quiz/[id]` (**leaks `correct_answer` + `explanation` to any visitor**), `POST .../attempt` (**trusts client-supplied score; awards +20 XP unconditionally per attempt → farming; no per-quiz dedupe**).

### 2.5 Events system (the template to copy for quality)
`community_events` + `event_rsvps` + `/admin/community-events` (white, realtime, KPI cards, full create/edit modal, publish toggle) + `/api/admin/community/events` (requireAdminRole + service-role + best validation of the three builders) + public events page (filter tabs, countdown, RSVP optimistic). **Flaws:** RSVP counter inflates on repeated upserts; no `maybe`/`not_going` UI.

### 2.6 Database (live state)
- 032/033 defined the community schema; **057 is the authoritative live state** (RLS everywhere, 7 SECURITY DEFINER functions, 19 tables in realtime publication, seeds).
- **Repo is NOT a complete source of truth:** migrations **035/036 missing** (learning_paths exists live but no DDL in repo); `community_posts/community_replies/community_votes/community_follows/community_post_topics/reputation_ledger/content_reports/user_notification_settings` referenced ONLY in the account-delete route (defensive cleanup) — **zero DDL anywhere**.
- `user_xp_log` live columns: `amount`/`reason`/`reference_id` (032 DDL says `action`/`xp_amount`/`description`).
- Functions live: `award_xp(target_user_id,xp_amount,action_name,desc)`, `increment_poll_votes(poll_id,option_id)`, `increment_reply_count(target_post_id)` (also refreshes category post_count), `update_post_vote_count`, `update_reply_vote_count`, `increment_quiz_stats(qid,new_score)`, `increment_views(target_id,target_type)`, `increment_event_rsvps(event_id,delta)`, `bump_tool_usage(p_slug)`, `is_admin()`, `handle_new_user()` (creates profiles + user_profiles).
- RLS: complete per-table policy set from 057 (public read / owner write / admin ALL via `profiles.role IN ('admin','editor')`). Known gaps: `quizzes` public read returns **unpublished**; `user_profiles` public read is `is_public OR admin`; leaderboard API doesn't filter `is_public` → **private-profile leak**; `learning_path_lessons` admin-all only (public SELECT presumed from 035 — unverifiable in repo).

### 2.7 APIs
- 21 routes under `/api/community/*` + 3 admin builders + `/api/upload` + legacy hub `POST /api/community` action-router (**unrate-limited duplicate of every write path — primary spam vector**).
- Rate limits wired (2026-08-13 hardening): posts 10/h, replies 30/h, votes 120/h, poll votes 30/h, quiz attempts 15/h, follows 60/h, RSVPs 30/h, bookmarks 60/h, uploads 30/h, XP 60/min. **Missing:** hub POST, history POST, profile PUT, notifications PUT, connected-accounts POST/DELETE, view-increment GET side-effect.
- Auth: `requireAdminRole(roles, req)` w/ Bearer fallback (`src/lib/admin-auth.ts`); `createServiceClient` duplicated in `admin-auth.ts` and `lib/supabase/admin.ts` (unification candidate).
- Security findings (priority): quiz answer leak 🔴, unpublished-quiz leak 🔴, XP farming via fake `reference_id` + unconditional quiz-attempt XP 🔴, unrate-limited hub POST 🔴, notifications PUT is a **no-op** (prefs never persisted) 🔴, RSVP counter drift, poll multi-vote, leaderboard privacy, vote-route bug (no-id matches arbitrary vote), silent error swallowing (vote/follow/bookmarks/reply-fallback), no CSRF tokens, upload MIME trusted from client.

### 2.8 Components / design system
- 28 shadcn-style components in `src/components/ui/*` (button, card, badge, input, textarea, **select**, tabs, dialog, dropdown-menu, tooltip, **toast+use-toast**, skeleton, progress, switch, avatar, label, separator, sheet, scroll-area, command, collapsible, safe-image) + project `CategoryBadge/PostMeta/jsonld`.
- Design tokens: **two parallel systems** — legacy hex (`--card/--border/--text/--muted`) for tools + newer HSL semantic set (`--surface/--surface-2/--surface-elevated/--border-token/--text-primary/--text-secondary/--brand/--success/--warning/--danger/--info/--verified/--accepted`) mapped in tailwind (`bg-surface`, `border-borderSoft`, `text-textPrimary`, `text-success`…). Fonts: DM Sans (sans) + Syne (headings). Dark mode full. `prefers-reduced-motion` global collapse.
- Community pages hand-roll the realtime pattern (unique channel + removeChannel + 30s poll + focus); `src/lib/use-realtime-list.ts` hook exists but **is unused**.
- **No `src/components/community/*` directory exists** — all community UI is inline in pages. This is the biggest refactor surface.

### 2.9 Authentication / roles
- Supabase email/password; `profiles` (role: admin/editor/author/contributor/reporter/seo_specialist/social_media_manager) + `user_profiles` (community identity: xp/level/badges/streak) — both created by `handle_new_user` trigger.
- Middleware protects ONLY `/admin/*` — **`/account/*` is NOT guarded** (pages self-check).
- No 2FA, no SSO, no passkeys (out of scope).

### 2.10 SEO
- `sitemap.ts`: posts, categories, tools (55), category pages (8), site pages, hub paths — **NO community content** (only `/community` + `/community/events` hub paths).
- Metadata: per-page `generateMetadata`; JSON-LD builders exist (Article, BreadcrumbList, FAQPage, Course, SoftwareApplication) in `src/components/ui/jsonld.tsx`; robots.txt served from DB.
- No community structured data (QAPage, DiscussionForumPosting), no canonical strategy for posts, no noindex rails for low-quality content.

---

## 3. REUSE / REFACTOR / MERGE / REPLACE / MISSING

### ♻ REUSE (as-is)
- **Database tables**: `forum_posts`, `forum_replies`, `forum_votes`, `polls`, `poll_options`, `poll_votes`, `quizzes`, `quiz_questions`, `quiz_attempts`, `user_profiles`, `user_xp_log`, `user_follows`, `user_bookmarks`, `user_notifications`, `user_reading_history`, `user_badges`, `community_events`, `event_rsvps`, `article_discussions(+replies)` — all data preserved.
- **SQL functions**: all 8 community RPCs (award_xp, increment_*, update_*) — extend, don't replace.
- **RLS pattern** from 057 (public read / owner write / admin ALL) — the house style.
- **Admin auth** `requireAdminRole` + Bearer fallback; **rate limiter** + presets; **realtime pattern** (unique channel/poll/focus) and the unused `useRealtimeList` hook; **`/admin/community-events`** as the admin-page template; **event builder API** validation as the API template; semantic tokens + shadcn ui kit + dark mode + reduced-motion; skeleton components; `timeAgo/formatNumber/LEVELS/BADGES/getXPForAction` in `community-utils.ts`; `PageIntro`/`SiteBlock`; upload API (hardened); `getForumCategories/getForumPosts/getQuizzes/getActivePolls/getLeaderboard/getUpcomingEvents` helpers.

### 🔧 REFACTOR (same role, better shape)
- **Extract `src/components/community/*`** primitives out of inline page code: `CommunityHeader`, `VoteControl`, `AnswerCard`, `PollCard`, `QuizCard`, `CommentThread`, `TopicChip`, `ExpertBadge`, `Skeleton` set, `EmptyState`, `ErrorState` — one system, one look.
- **Realtime:** adopt `useRealtimeList` everywhere (detail pages, events, hub, forum).
- **Quiz API:** strip `correct_answer`/`explanation` from public payload; **server-side grading**; XP only on first attempt per quiz per day (dedupe via `user_xp_log` reason `complete_quiz` + reference_id=quiz_id, atomic `INSERT ... ON CONFLICT`).
- **XP route:** atomic dedupe; validate `target_id` actually exists for follow/bookmark actions (or drop reference-based farming by keying dedupe on action+day only for generic actions).
- **Poll API:** enforce idempotency — add `UNIQUE(poll_id, user_id)` + upsert semantics (migration), validate option belongs to poll, support `allow_change_votes` flag.
- **Events API:** RSVP counter fix (only +1 when row actually created / −1 when actually deleted), whitelist action, `maybe` support.
- **Leaderboard API:** filter `is_public`.
- **Vote API:** require exactly one of post_id/reply_id; validate target exists; surface write errors.
- **Hub POST router:** rate-limit or deprecate in favor of dedicated routes (they now all exist).
- **Notifications:** persist prefs (new `user_notification_settings` table — already referenced by delete route).
- **Upload API:** verify magic bytes server-side (not just client MIME).
- **Unify service client factories** (`admin-auth.createServiceClient` vs `supabase/admin.ts`).
- **Middlewar/account guard**, admin-nav registry for community sections, remove duplicate `--border` in `.dark`.
- **Profile PUT / history POST / connected-accounts:** rate limits + validation (length caps, URL scheme allowlist, provider whitelist).

### 🔀 MERGE
- **Forum + Q&A → one content model.** `forum_posts` becomes the unified `community content` table via a new `content_type` column (question | discussion | poll | quiz | ama | showcase | debate | tutorial_discussion). `forum_replies` becomes the unified `answers/comments` table (answers for questions, comments for discussions) — preserves every row, no data movement.
- **Acceptance system:** `is_accepted` on forum_replies becomes the real "accepted answer" with `accepted_by` + `accepted_at` + strong visual treatment; `is_solved` on forum_posts becomes the solved state, settable only by question owner (server-verified).
- **`article_discussions` + `discussion_replies`:** keep as article comments (already nested); do NOT merge into the forum model — different lifecycle (attached to posts). Bridge later via cross-links.
- **Polls/quizzes inside posts:** add `post_id` linkage so a poll/quiz can live inside a question/discussion (already `polls.post_id` column exists!) — expose via composer; poll+discussion flow uses replies.
- **XP + reputation:** XP ledger (`user_xp_log`) stays the engine; **new `reputation_ledger`** (separate signals, §24-27) computed only from server-verified events, never client-claimable.
- **Topics:** new `topics` + `post_topics` tables (community_posts/post_topics were anticipated in the delete route) — tags migrate into topic links (keep `tags[]` as display layer).

### ❌ REPLACE
- **No Questions system** → build one (question type + answer sort modes + accepted answer + health states).
- **No Topics** → build `topics` + `post_topics` + `/topics/[slug]` hubs (knowledge-graph counts must be real SQL counts).
- **No Moderation** → build `content_reports` + `moderation_actions` + admin Moderation Center (AI flag → queue → human decision; appeals; audit-logged).
- **No AMA/Showcase/Debate** → new content types on the same model (AMA: `amas`-ish columns on post + `ama_questions`; Showcase: `showcase` fields on post + feedback mode; Debate: two-position post type + arguments-as-replies + AI summary, no winner-by-popularity).
- **No community search** → unified search across all types (keyword + filters; semantic later), search-result intelligence panel (question + best-answer preview + related).
- **No community SEO** → QAPage/DiscussionForumPosting schema, canonical `/answers/<slug>` URLs (new) with 301 from old `/community/forum/[category]/[id]` paths, noindex rails for thin content, sitemap inclusion of quality content only.
- **No real notifications engine** → notification triggers from server events (answer, accept, mention, follow-updates) — table + settings exist, triggers don't.

### ➕ MISSING (new build)
Composer ("Create" — type-aware), Command Center (C shortcut), FOR YOU/FOLLOWING/TRENDING/LATEST/UNANSWERED/EXPERTS feed rails, Trending engine (velocity-weighted, not total votes), Question health states + resurrection engine ("you know Supabase — 12 questions need your expertise"), answer ranking (multi-signal, opaque), expert mode (verified via contribution data only — accepted answers + quality history, **no fabricated titles**), trust score (internal, signals-based, no fake accuracy %), topic-specific expertise bars (activity-derived, labeled as such), bounties (reputation credits only, no real money), AI copilot (duplicate detection, question improvement suggestions, tag suggestions, summaries, moderation flags, quiz generation), AI Answer mode (clearly separated + cites TechPivo content), knowledge digests (weekly email architecture), quiz topic analytics → weakness surfacing → related content (educational, non-medical), admin Community Command Center, community analytics (real DB counts: answer rate, acceptance rate, resolution time, etc.), anti-sybil basics (account-age signals, vote-pattern checks), XSS sanitization layer (DOMPurify for any HTML rendering path), CSRF protection, tests (vitest + RLS test suite).

---

## 4. RECOMMENDED ARCHITECTURE — "ADAPT, DON'T REPLACE"

**One physical storage layer, one logical model, type-specific columns — zero data migration of existing rows.**

```
forum_categories (existing)          topics (new) ── post_topics (new)
        │                                   │
forum_posts ── +content_type (question|discussion|poll|quiz|ama|showcase|debate)
        │       +question_status (new|needs_context|unanswered|active|answered|solved|stale|archived)
        │       +accepted_reply_id, +slug (canonical), +is_locked, +difficulty, +bounty_points
        │
forum_replies ── +reply_type (answer|comment|argument|solution_alt), +is_accepted(+by/at),
        │         +rank_score, parent_id → nested threads
        │
polls / poll_options / poll_votes ── +post_id linkage (column exists) +UNIQUE(poll_id,user_id) +allow_change
quizzes / quiz_questions / quiz_attempts ── +post_id linkage, server grading, first-attempt XP
community_events / event_rsvps (existing)
user_profiles / user_xp_log (existing) ── +expertise jsonb (topic → contribution counts)
topics / post_topics (new)             reputation_ledger (new)
content_reports / moderation_actions (new)   user_notification_settings (new, real)
```

**Canonical URLs:** `/answers/<slug>` for questions (new slug column; old forum detail paths 301), `/discussions/<slug>`, `/community/events` stays, polls/quizzes keep existing paths. Feed/topic pages on top.

---

## 5. PHASED DELIVERY PLAN (maps to §104 phases)

| Phase | Deliverable | Est. |
|---|---|---|
| **P0** | Security hotfixes from audit (quiz answer leak, unpublished leak, XP farming, hub POST rate limit, RSVP drift, leaderboard privacy, notifications no-op) — small, independent, do first | 0.5–1 d |
| **P1** | Migration 059: `content_type`/`question_status`/`accepted_by`/`slug`/`difficulty`/`bounty_points` on forum_posts; `reply_type` on forum_replies; `topics`+`post_topics`; `UNIQUE(poll_id,user_id)`; `user_notification_settings`; `content_reports`+`moderation_actions`; `reputation_ledger`; `expertise` on user_profiles; RLS + realtime additions; backfill slugs | 1–2 d |
| **P2** | Design system: `src/components/community/*` primitives (VoteControl, AnswerCard, PollCard, QuizCard, TopicChip, ExpertBadge, EmptyState, ErrorState, skeletons, CommunityHeader/Nav), tokens cleanup, both modes | 2 d |
| **P3** | Unified composer (Create → type-aware forms: Ask/Discuss/Poll/Quiz/AMA/Showcase/Debate), Command Center (C shortcut), AI question-improvement hints + duplicate detection | 2–3 d |
| **P4** | Question experience: `/answers/[slug]` detail (sort modes, accepted answer treatment, related questions), answer ranking, health states + resurrection panel | 2 d |
| **P5** | Feed: FOR YOU / FOLLOWING / TRENDING (velocity) / LATEST / UNANSWERED / EXPERTS / DISCUSSIONS rails; community home dashboard | 2 d |
| **P6** | Polls-in-posts + poll→discussion loop; quizzes-in-posts, server grading, results analytics (weak areas), first-attempt XP, leaderboard periods (no farming) | 2 d |
| **P7** | AMA (schedule, RSVP, live/upcoming/ended, answered/unanswered filters), Showcase (+feedback mode), Debate (arguments, AI summary no winner) | 3 d |
| **P8** | Reputation/trust: reputation_ledger wiring, contribution profile, topic expertise, expert mode (data-derived only) | 1–2 d |
| **P9** | Notifications engine (server triggers), preferences real | 1 d |
| **P10** | Moderation Center (reports, spam queue, actions, appeals, audit logs) + AI moderation flags → human queue | 2 d |
| **P11** | Topic hubs `/topics/[slug]` (real counts), knowledge graph links, internal linking | 2 d |
| **P12** | Unified search + result intelligence; AI Answer mode (separated, citing TechPivo content) | 2 d |
| **P13** | SEO/GEO: QAPage/DiscussionForumPosting schema, canonicals + 301s, sitemap quality gates, noindex rails, OG share cards | 1–2 d |
| **P14** | Security pass (CSRF, sanitizer, URL validation, magic-byte upload, anti-sybil basics), rate-limit completion | 1 d |
| **P15** | Performance (indexes, pagination/cursor, N+1 passes), accessibility audit, reduced-motion | 1 d |
| **P16** | Tests (unit + RLS/unauth + rate limits), full QA, deploy | 2 d |

**Total ≈ 4–6 weeks of focused work.** Every phase keeps existing data intact and ships independently.

---

## 6. KNOWN LIMITATIONS / RISKS (honest)

- Live DB diverges from repo migrations (035/036 missing; 057/058 applied) — every new migration must be written against **live schema** (pull live DDL via Management API first) and be idempotent + re-runnable.
- In-memory rate limiter is per-instance (documented) — acceptable now; a shared store (Upstash/Redis) only if abuse appears.
- "Expertise" bars must be labeled **activity-derived**, never professional claims; expert mode gated by real contribution metrics.
- Poll multi-vote cleanup changes behavior for existing poll_votes (dedupe keeps earliest vote).
- Old forum URLs redirect (301) — sitemap/backlink impact small but real.
- No real-money features; bounties are reputation-only.
- AI features need a provider key (OpenRouter/Gemini already integrated elsewhere — reuse `getAIProvider` pattern).

---

## 7. DECISIONS NEEDED BEFORE BUILD

1. **Scope of first delivery:** P0+P1+P2+P3+P4 (question/discussion unification + composer + design system) as "Milestone 1", or the full 16-phase roadmap in sequence?
2. **URL strategy:** `/answers/<slug>` (new canonical) with 301s — OK to redirect existing `/community/forum/*` detail URLs?
3. **Admin:** extend existing admin shell with a new Community Command Center section (recommended) vs separate white-themed admin like community-events?
4. **AI features:** include AI question-improvement + duplicate detection in Milestone 1 (needs OpenRouter/Gemini key wiring) or defer to P12?
5. **Dark/light:** keep both (recommended) — confirm no preference to default one.
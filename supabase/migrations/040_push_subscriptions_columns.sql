-- 2026-08-09: Push subscriptions — add columns used by the new web-push flow.
-- The old table only had (id, subscription jsonb, user_agent, created_at) but the
-- client (push-subscribe-button -> /api/push/subscribe) and send engine
-- (src/lib/web-push.ts) write/read endpoint, p256dh, auth, device_type, browser,
-- os, subscribed_at, last_seen_at. RLS policies for anon/authenticated already exist.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS endpoint TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS p256dh TEXT,
  ADD COLUMN IF NOT EXISTS auth TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
  ADD COLUMN IF NOT EXISTS browser TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS os TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill endpoint from legacy jsonb subscriptions (table currently empty, but safe)
UPDATE public.push_subscriptions
SET endpoint = subscription->>'endpoint'
WHERE endpoint IS NULL AND subscription->>'endpoint' IS NOT NULL;

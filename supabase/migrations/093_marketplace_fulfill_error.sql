-- Migration 093: TechPivo Market — fulfillment error capture.
-- Idempotent: safe to re-run via Supabase dashboard SQL editor.

-- Last CJ auto-fulfillment failure reason (truncated to 500 chars).
-- NULL/cleared on success so the admin orders tab can show WHY an order
-- needs manual fulfillment plus a Retry button.
ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS fulfill_error TEXT;

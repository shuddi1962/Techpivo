-- Migration 096: TechPivo Market — coupon audit columns on orders.
-- Idempotent: safe to re-run via Supabase dashboard SQL editor.
-- Run this in the dashboard, then coupon codes + discounts are itemized
-- per order. The app works WITHOUT it too (totals still reduced at
-- checkout; itemization degrades gracefully until applied).

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_usd NUMERIC NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_coupon ON marketplace_orders(coupon_code);

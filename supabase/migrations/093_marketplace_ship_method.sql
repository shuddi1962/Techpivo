-- Marketplace: persist the buyer's chosen delivery method on the order so
-- fulfillment uses the same courier (idempotent, re-runnable).
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS ship_method TEXT,
  ADD COLUMN IF NOT EXISTS ship_eta TEXT;

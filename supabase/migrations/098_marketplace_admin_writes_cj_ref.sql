-- 098 — Marketplace admin write access + CJ order reference
--
-- 1. affiliate_products had RLS enabled with ONLY a public SELECT policy.
--    Every admin write (activate, hide, feature, delete, CJ import) ran
--    through the cookie (RLS-bound) client, so RLS silently updated 0 rows
--    and the admin saw "Failed to update product".
-- 2. marketplace_orders.cj_order_ref stores the CJ-facing order reference
--    (SD…) — the number the CJDropshipping platform shows, so an order
--    placed in TechPivo Market can be found in the CJ dashboard.

/* ------------------------------------------------------------------ *
 * 1. Admin write access to the catalogue
 * ------------------------------------------------------------------ */
drop policy if exists "Admins manage affiliate products" on public.affiliate_products;
create policy "Admins manage affiliate products"
  on public.affiliate_products for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin'::user_role, 'editor'::user_role])
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin'::user_role, 'editor'::user_role])
    )
  );

/* ------------------------------------------------------------------ *
 * 2. CJ order reference
 * ------------------------------------------------------------------ */
alter table public.marketplace_orders add column if not exists cj_order_ref text;

create index if not exists idx_marketplace_orders_cj_ref
  on public.marketplace_orders (cj_order_ref);

/* ------------------------------------------------------------------ *
 * 3. Supplier SKU on the catalogue (duplicate guard)
 *
 * The CJ import guard matches on the CJ product id first, then on the
 * supplier SKU: the same product can be reached through different CJ
 * product ids, but never through two different SKUs.
 * ------------------------------------------------------------------ */
alter table public.affiliate_products add column if not exists cj_sku text;

create index if not exists idx_affiliate_products_cj_sku
  on public.affiliate_products (cj_sku);

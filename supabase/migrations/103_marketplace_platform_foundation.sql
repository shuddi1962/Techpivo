-- 103 — TechPivo Marketplace platform foundation (Phase 1 of master upgrade)
--
-- Adds all tables needed for: promotions/campaigns, currency management,
-- shipping zones & rates, seller commissions, email templates & logs,
-- earnings analytics, plus product/category profit-override columns.
--
-- Idempotent: every statement is guarded so the whole file is re-runnable
-- via Supabase Dashboard → SQL Editor (or Management API).
-- ------------------------------------------------------------------ *

-- 1. Promotions & campaigns (storewide, category, product, coupon, flash,
--    Black Friday, seller-funded / TechPivo-funded / shared funding).
create table if not exists public.marketplace_promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('storewide','category','subcategory','product','seller','flash_sale','black_friday','coupon')),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null default 0,
  min_order_usd numeric not null default 0,
  max_discount_usd numeric,
  max_uses int,
  uses int not null default 0,
  per_customer_limit int default 1,
  code text unique,
  funding_source text not null default 'techpivo' check (funding_source in ('techpivo','seller','shared')),
  min_profit_usd numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_promotions_code on public.marketplace_promotions(code);
create index if not exists idx_marketplace_promotions_active on public.marketplace_promotions(is_active, starts_at, ends_at);

-- 2. Exchange rates (USD base). Populated by cron / admin override.
create table if not exists public.marketplace_exchange_rates (
  base_currency text not null default 'USD',
  quote_currency text not null,
  rate numeric not null,
  fetched_at timestamptz not null default now(),
  provider text not null default 'fallback',
  primary key (base_currency, quote_currency)
);
create index if not exists idx_marketplace_exchange_rates_quote on public.marketplace_exchange_rates(quote_currency, fetched_at desc);

-- 3. Shipping zones (admin-defined groups of countries).
create table if not exists public.marketplace_shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  countries text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Shipping rates (per zone, with store markup over supplier quotes).
create table if not exists public.marketplace_shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.marketplace_shipping_zones(id) on delete cascade,
  method_name text not null,
  method_type text not null check (method_type in ('standard','express','free','supplier')),
  fee_usd numeric not null default 0,
  min_order_usd numeric not null default 0,
  eta text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_shipping_rates_zone on public.marketplace_shipping_rates(zone_id, is_active, sort_order);

-- 5. Seller commissions (per seller, optional category/subcategory scope).
create table if not exists public.marketplace_seller_commissions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,  -- references public.profiles(id)
  category_slug text references public.marketplace_categories(slug) on delete set null,
  subcategory_slug text references public.marketplace_categories(slug) on delete set null,
  commission_percent numeric not null default 10,
  min_commission_usd numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, category_slug, subcategory_slug)
);
create index if not exists idx_marketplace_seller_commissions_seller on public.marketplace_seller_commissions(seller_id);

-- 6. Product-level profit overrides (columns on affiliate_products).
alter table public.affiliate_products add column if not exists cost_usd numeric;
alter table public.affiliate_products add column if not exists shipping_cost_usd numeric not null default 0;
alter table public.affiliate_products add column if not exists profit_margin_percent numeric;
alter table public.affiliate_products add column if not exists profit_override_usd numeric;
alter table public.affiliate_products add column if not exists pricing_rule text check (pricing_rule in ('category','override','manual'));
create index if not exists idx_affiliate_products_pricing_rule on public.affiliate_products(pricing_rule);

-- 7. Category-level profit settings (columns on marketplace_categories).
alter table public.marketplace_categories add column if not exists profit_margin_percent numeric;
alter table public.marketplace_categories add column if not exists min_profit_usd numeric not null default 0;
alter table public.marketplace_categories add column if not exists pricing_rule text not null default 'category';

-- 8. Email templates (branded, per event type).
create table if not exists public.marketplace_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text not null,
  subject text not null,
  html_content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_email_templates_event on public.marketplace_email_templates(event_type, is_active);

-- 9. Email send log (delivery tracking, retry support).
create table if not exists public.marketplace_email_logs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.marketplace_email_templates(id) on delete set null,
  recipient_email text not null,
  event_type text not null,
  status text not null default 'sent' check (status in ('sent','failed','delivered')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_email_logs_recipient on public.marketplace_email_logs(recipient_email, created_at desc);
create index if not exists idx_marketplace_email_logs_status on public.marketplace_email_logs(status, created_at desc);

-- 10. Daily earnings / profit aggregation (per category, per day).
create table if not exists public.marketplace_earnings_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category_slug text references public.marketplace_categories(slug) on delete set null,
  gross_revenue_usd numeric not null default 0,
  total_discounts_usd numeric not null default 0,
  supplier_cost_usd numeric not null default 0,
  shipping_charged_usd numeric not null default 0,
  shipping_cost_usd numeric not null default 0,
  gateway_fees_usd numeric not null default 0,
  refunds_usd numeric not null default 0,
  platform_commission_usd numeric not null default 0,
  seller_earnings_usd numeric not null default 0,
  net_profit_usd numeric not null default 0,
  orders_count int not null default 0,
  units_sold int not null default 0,
  unique (date, category_slug),
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_earnings_daily_date on public.marketplace_earnings_daily(date desc);

-- ------------------------------------------------------------------ *
-- RLS (consistent with existing marketplace tables)
-- ------------------------------------------------------------------ *
alter table public.marketplace_promotions enable row level security;
alter table public.marketplace_exchange_rates enable row level security;
alter table public.marketplace_shipping_zones enable row level security;
alter table public.marketplace_shipping_rates enable row level security;
alter table public.marketplace_seller_commissions enable row level security;
alter table public.marketplace_email_templates enable row level security;
alter table public.marketplace_email_logs enable row level security;
alter table public.marketplace_earnings_daily enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view active promotions') then
    create policy "Public can view active promotions" on public.marketplace_promotions
      for select to anon, authenticated using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage promotions') then
    create policy "Admins manage promotions" on public.marketplace_promotions for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Public can view exchange rates') then
    create policy "Public can view exchange rates" on public.marketplace_exchange_rates for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage exchange rates') then
    create policy "Admins manage exchange rates" on public.marketplace_exchange_rates for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Public can view shipping zones') then
    create policy "Public can view shipping zones" on public.marketplace_shipping_zones for select to anon, authenticated using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage shipping zones') then
    create policy "Admins manage shipping zones" on public.marketplace_shipping_zones for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Public can view shipping rates') then
    create policy "Public can view shipping rates" on public.marketplace_shipping_rates for select to anon, authenticated using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage shipping rates') then
    create policy "Admins manage shipping rates" on public.marketplace_shipping_rates for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins manage seller commissions') then
    create policy "Admins manage seller commissions" on public.marketplace_seller_commissions for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Sellers view own commissions') then
    create policy "Sellers view own commissions" on public.marketplace_seller_commissions for select
      using (auth.uid() = seller_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Public can view active email templates') then
    create policy "Public can view active email templates" on public.marketplace_email_templates for select to anon, authenticated using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage email templates') then
    create policy "Admins manage email templates" on public.marketplace_email_templates for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins view email logs') then
    create policy "Admins view email logs" on public.marketplace_email_logs for select
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins view earnings') then
    create policy "Admins view earnings" on public.marketplace_earnings_daily for select
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- ------------------------------------------------------------------ *
-- Realtime (idempotent)
-- ------------------------------------------------------------------ *
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_promotions') then
    alter publication supabase_realtime add table public.marketplace_promotions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_exchange_rates') then
    alter publication supabase_realtime add table public.marketplace_exchange_rates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_shipping_zones') then
    alter publication supabase_realtime add table public.marketplace_shipping_zones;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_shipping_rates') then
    alter publication supabase_realtime add table public.marketplace_shipping_rates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_email_templates') then
    alter publication supabase_realtime add table public.marketplace_email_templates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_earnings_daily') then
    alter publication supabase_realtime add table public.marketplace_earnings_daily;
  end if;
end $$;

-- ------------------------------------------------------------------ *
-- Notes for the operator
-- ------------------------------------------------------------------ *
-- 1. Apply this file in Supabase Dashboard → SQL Editor.
-- 2. Add your CJ API key to site_secrets (key='cj_api_key') — service-role only,
--    never in site_settings. The marketplace CJ lib reads it from there.
-- 3. Add your Flutterwave keys to site_secrets (flutterwave_secret_key,
--    flutterwave_encryption_key, flutterwave_secret_hash, flutterwave_public_key).
-- 4. Add your Resend API key (resend_api_key) to site_secrets for branded emails.
-- 5. Add exchange rates via the admin UI or a cron that writes to
--    marketplace_exchange_rates (base=USD).
-- ------------------------------------------------------------------ *

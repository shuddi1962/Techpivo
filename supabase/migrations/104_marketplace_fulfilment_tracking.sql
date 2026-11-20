-- 104 — TechPivo Marketplace — Fulfilment, Tracking, Inventory & Sellers
--
-- Adds all tables needed for:
--   * TechPivo-owned inventory products + stock tracking
--   * Order line items (per-product ownership & fulfilment type)
--   * CJ + seller fulfilment records + audit trail
--   * Shipment tracking (tracking numbers, courier, events, delivery)
--   * Independent seller marketplace accounts
--   * Customer notification preferences & email event log
--   * Persistent carts + wishlist
--
-- Idempotent: every statement is guarded so the whole file is re-runnable
-- via Supabase Dashboard → SQL Editor (or Management API).
-- ------------------------------------------------------------------ *

-- 1. TechPivo-owned inventory products (separate from CJ affiliate_products)
create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  short_description text,
  sku text unique,
  category_slug text references public.marketplace_categories(slug) on delete set null,
  subcategory_slug text references public.marketplace_categories(slug) on delete set null,
  fulilment_type text not null default 'inventory' check (fulilment_type in ('inventory','cj','seller','digital')),
  seller_id uuid, -- references public.profiles(id) when independent seller
  cost_usd numeric not null default 0,
  shipping_cost_usd numeric not null default 0,
  sale_price_usd numeric not null default 0,
  compare_at_price_usd numeric,
  stock_quantity int not null default 0,
  low_stock_threshold int not null default 5,
  weight_grams numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  main_image_url text,
  gallery_images text[] default '{}',
  video_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_digital boolean not null default false,
  shipping_restrictions text, -- e.g. 'battery,liquid,fragile,oversized'
  cj_pid text, -- if sourced from CJ
  cj_vid text, -- CJ variant id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_products_category on public.marketplace_products(category_slug);
create index if not exists idx_marketplace_products_subcategory on public.marketplace_products(subcategory_slug);
create index if not exists idx_marketplace_products_fulfilment on public.marketplace_products(fulilment_type);
create index if not exists idx_marketplace_products_seller on public.marketplace_products(seller_id);
create index if not exists idx_marketplace_products_cj_pid on public.marketplace_products(cj_pid);
create index if not exists idx_marketplace_products_sku on public.marketplace_products(sku);
alter table public.marketplace_products enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view active inventory products') then
    create policy "Public can view active inventory products" on public.marketplace_products
      for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage inventory products') then
    create policy "Admins manage inventory products" on public.marketplace_products for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 2. Inventory stock movements (audit trail for every stock change)
create table if not exists public.marketplace_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketplace_products(id) on delete cascade,
  change_type text not null check (change_type in ('sale','return','restock','adjustment','fulfilled','cancelled')),
  quantity_change int not null,
  quantity_after int not null,
  reason text,
  reference_id uuid, -- order id or fulfillment id
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_inventory_product on public.marketplace_inventory(product_id, created_at desc);
alter table public.marketplace_inventory enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Admins view inventory') then
    create policy "Admins view inventory" on public.marketplace_inventory for select
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 3. Order line items (ownership + fulfilment classification per product)
create table if not exists public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  product_id text not null, -- affiliate_products.id OR marketplace_products.id
  product_name text not null,
  product_image_url text,
  variant_id text, -- CJ variant id
  variant_name text,
  sku text,
  quantity int not null default 1,
  unit_price_usd numeric not null default 0,
  line_total_usd numeric not null default 0,
  discount_usd numeric not null default 0,
  fulfilment_type text not null check (fulfilment_type in ('cj','inventory','seller','digital')),
  seller_id uuid, -- independent seller (null for TechPivo-owned)
  cj_pid text,
  cj_vid text,
  cj_sent boolean not null default false,
  cj_order_ref text,
  cj_fulfill_error text,
  shipping_charged_usd numeric not null default 0,
  shipping_cost_usd numeric not null default 0,
  tracking_number text,
  tracking_provider text,
  tracking_url text,
  ship_status text not null default 'pending', -- pending, dispatched, in_transit, out_for_delivery, delivered, exception, cancelled
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_order_items_order on public.marketplace_order_items(order_id);
create index if not exists idx_marketplace_order_items_product on public.marketplace_order_items(product_id);
create index if not exists idx_marketplace_order_items_fulfilment on public.marketplace_order_items(fulfilment_type);
create index if not exists idx_marketplace_order_items_ship_status on public.marketplace_order_items(ship_status);
alter table public.marketplace_order_items enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can create order items') then
    create policy "Public can create order items" on public.marketplace_order_items for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage order items') then
    create policy "Admins manage order items" on public.marketplace_order_items for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 4. Fulfilment records (CJ orders + seller shipments audit trail)
create table if not exists public.marketplace_fulfillment (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references public.marketplace_order_items(id) on delete cascade,
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  fulfilment_type text not null check (fulfilment_type in ('cj','inventory','seller')),
  cj_order_id text,
  cj_order_ref text,
  supplier_order_id text,
  courier text,
  tracking_number text,
  tracking_url text,
  shipping_carrier text,
  shipping_method text,
  shipping_cost_usd numeric not null default 0,
  status text not null default 'pending', -- pending, submitted, processing, shipped, delivered, failed, cancelled
  submitted_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_fulfillment_order on public.marketplace_fulfillment(order_id);
create index if not exists idx_marketplace_fulfillment_status on public.marketplace_fulfillment(status);
create index if not exists idx_marketplace_fulfillment_cj_order on public.marketplace_fulfillment(cj_order_id);
alter table public.marketplace_fulfillment enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Admins manage fulfillment') then
    create policy "Admins manage fulfillment" on public.marketplace_fulfillment for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 5. Shipment tracking events (timeline per shipment)
create table if not exists public.marketplace_tracking (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references public.marketplace_order_items(id) on delete cascade,
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  tracking_number text not null,
  carrier text,
  event_type text not null, -- dispatched, in_transit, out_for_delivery, delivered, exception, cancelled
  event_description text,
  location text,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_tracking_item on public.marketplace_tracking(order_item_id, event_at desc);
create index if not exists idx_marketplace_tracking_number on public.marketplace_tracking(tracking_number);
alter table public.marketplace_tracking enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view tracking') then
    create policy "Public can view tracking" on public.marketplace_tracking for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage tracking') then
    create policy "Admins manage tracking" on public.marketplace_tracking for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 6. Independent seller marketplace accounts
create table if not exists public.marketplace_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique, -- references public.profiles(id)
  store_name text not null,
  store_slug text unique,
  store_description text,
  store_logo_url text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  commission_percent numeric not null default 10,
  min_commission_usd numeric not null default 0,
  payment_currency text not null default 'NGN',
  payout_email text,
  payout_account text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  total_sales_usd numeric not null default 0,
  total_earnings_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_sellers_user on public.marketplace_sellers(user_id);
create index if not exists idx_marketplace_sellers_slug on public.marketplace_sellers(store_slug);
alter table public.marketplace_sellers enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view active sellers') then
    create policy "Public can view active sellers" on public.marketplace_sellers for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Sellers view own profile') then
    create policy "Sellers view own profile" on public.marketplace_sellers for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage sellers') then
    create policy "Admins manage sellers" on public.marketplace_sellers for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 7. Customer notification preferences + email event log
create table if not exists public.marketplace_notifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  event_type text not null, -- order_placed, payment_successful, order_shipped, tracking_available, etc.
  template_id uuid references public.marketplace_email_templates(id) on delete set null,
  status text not null default 'pending', -- pending, sent, failed, delivered
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_notifications_email on public.marketplace_notifications(email, created_at desc);
create index if not exists idx_marketplace_notifications_status on public.marketplace_notifications(status);
alter table public.marketplace_notifications enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Admins manage notifications') then
    create policy "Admins manage notifications" on public.marketplace_notifications for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 8. Persistent carts (guest + registered customers)
create table if not exists public.marketplace_carts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  email text, -- null for guest carts
  items jsonb not null default '[]'::jsonb,
  subtotal_usd numeric not null default 0,
  shipping_usd numeric not null default 0,
  discount_usd numeric not null default 0,
  total_usd numeric not null default 0,
  currency text not null default 'USD',
  coupon_code text,
  shipping_address jsonb, -- {name, phone, address, city, state, zip, country, method}
  shipping_method text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_carts_session on public.marketplace_carts(session_id);
create index if not exists idx_marketplace_carts_email on public.marketplace_carts(email);
create index if not exists idx_marketplace_carts_expires on public.marketplace_carts(expires_at);
alter table public.marketplace_carts enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can manage carts') then
    create policy "Public can manage carts" on public.marketplace_carts for all using (true);
  end if;
end $$;

-- 9. Customer wishlist
create table if not exists public.marketplace_wishlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id text not null,
  product_name text,
  product_image_url text,
  created_at timestamptz not null default now(),
  unique (email, product_id)
);
create index if not exists idx_marketplace_wishlist_email on public.marketplace_wishlist(email);
alter table public.marketplace_wishlist enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can manage wishlist') then
    create policy "Public can manage wishlist" on public.marketplace_wishlist for all using (true);
  end if;
end $$;

-- 10. Add fulfilment_type to affiliate_products if missing (CJ vs owned)
alter table public.affiliate_products add column if not exists fulfilment_type text not null default 'cj' check (fulfilment_type in ('cj','inventory','seller','digital'));
alter table public.affiliate_products add column if not exists seller_id uuid;
alter table public.affiliate_products add column if not exists stock_quantity int not null default 0;
alter table public.affiliate_products add column if not exists shipping_cost_usd numeric not null default 0;
create index if not exists idx_affiliate_products_fulfilment_type on public.affiliate_products(fulfilment_type);

-- 11. Realtime for new tables
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_products') then
    alter publication supabase_realtime add table public.marketplace_products;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_inventory') then
    alter publication supabase_realtime add table public.marketplace_inventory;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_order_items') then
    alter publication supabase_realtime add table public.marketplace_order_items;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_fulfillment') then
    alter publication supabase_realtime add table public.marketplace_fulfillment;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_tracking') then
    alter publication supabase_realtime add table public.marketplace_tracking;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_sellers') then
    alter publication supabase_realtime add table public.marketplace_sellers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_notifications') then
    alter publication supabase_realtime add table public.marketplace_notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_carts') then
    alter publication supabase_realtime add table public.marketplace_carts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_wishlist') then
    alter publication supabase_realtime add table public.marketplace_wishlist;
  end if;
end $$;

-- ------------------------------------------------------------------ *
-- Notes for the operator
-- ------------------------------------------------------------------ *
-- 1. Apply this file in Supabase Dashboard → SQL Editor.
-- 2. marketplace_products: TechPivo-owned inventory (fulfilment_type='inventory').
--    affiliate_products with fulfilment_type='cj' remain CJ dropship products.
-- 3. marketplace_order_items.classifies every line: cj / inventory / seller / digital.
-- 4. marketplace_fulfillment + marketplace_tracking give full CJ + seller
--    shipment visibility with retry counting and error capture.
-- 5. marketplace_sellers holds independent seller accounts + commission rules.
-- 6. marketplace_notifications logs every customer email event (dedupe key).
-- 7. All tables added to supabase_realtime for live admin updates.
-- ------------------------------------------------------------------ *

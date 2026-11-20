-- 105 — TechPivo Marketplace — CJ Import History & Retry
--
-- Tracks every CJ bulk import batch so the admin can see:
--   * What was imported, when, and from which category
--   * Which products failed / were skipped / deferred
--   * Retry failed imports from a previous batch
--
-- Idempotent: every statement is guarded so the whole file is re-runnable
-- via Supabase Dashboard → SQL Editor (or Management API).
-- ------------------------------------------------------------------ *

-- 1. Import batches (one row per bulk import action)
create table if not exists public.marketplace_cj_import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid, -- references public.profiles(id)
  category_slug text references public.marketplace_categories(slug) on delete set null,
  subcategory_slug text references public.marketplace_categories(slug) on delete set null,
  requested int not null default 0, -- how many were selected
  imported int not null default 0, -- how many were inserted
  skipped int not null default 0, -- duplicates
  variants_filled int not null default 0,
  pushed_to_cj int not null default 0,
  deferred int not null default 0, -- beyond CJ budget, still need variants
  status text not null default 'completed', -- completed | partial | failed
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_cj_import_batches_created on public.marketplace_cj_import_batches(created_at desc);
create index if not exists idx_marketplace_cj_import_batches_status on public.marketplace_cj_import_batches(status);

-- 2. Imported product rows (one row per product in a batch)
create table if not exists public.marketplace_cj_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.marketplace_cj_import_batches(id) on delete cascade,
  cj_pid text not null,
  cj_sku text,
  product_name text not null,
  product_image_url text,
  sell_price_usd numeric,
  category_slug text references public.marketplace_categories(slug) on delete set null,
  subcategory_slug text references public.marketplace_categories(slug) on delete set null,
  cj_vid text,
  status text not null default 'imported', -- imported | duplicate_skipped | deferred_variant | failed
  created_at timestamptz not null default now()
);
create index if not exists idx_marketplace_cj_import_items_batch on public.marketplace_cj_import_items(batch_id);
create index if not exists idx_marketplace_cj_import_items_cj_pid on public.marketplace_cj_import_items(cj_pid);
create index if not exists idx_marketplace_cj_import_items_status on public.marketplace_cj_import_items(status);

-- 3. RLS
alter table public.marketplace_cj_import_batches enable row level security;
alter table public.marketplace_cj_import_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view import batches') then
    create policy "Public can view import batches" on public.marketplace_cj_import_batches for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage import batches') then
    create policy "Admins manage import batches" on public.marketplace_cj_import_batches for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public can view import items') then
    create policy "Public can view import items" on public.marketplace_cj_import_items for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins manage import items') then
    create policy "Admins manage import items" on public.marketplace_cj_import_items for all
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','editor')));
  end if;
end $$;

-- 4. Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_cj_import_batches') then
    alter publication supabase_realtime add table public.marketplace_cj_import_batches;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'marketplace_cj_import_items') then
    alter publication supabase_realtime add table public.marketplace_cj_import_items;
  end if;
end $$;

-- ------------------------------------------------------------------ *
-- Notes for the operator
-- ------------------------------------------------------------------ *
-- 1. Apply this file in Supabase Dashboard → SQL Editor.
-- 2. The `cj-import` API action now records a batch + items automatically.
-- 3. The admin UI shows history with retry-failed capability.
-- ------------------------------------------------------------------ *

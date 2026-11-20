-- 106 — Marketplace category descriptions + SEO metadata
--
-- Adds description, meta_title and meta_description to marketplace_categories
-- so the admin Categories editor can store rich per-category copy that the
-- storefront category pages can render (unique H1 intro, meta tags, etc).
--
-- Idempotent: every statement is guarded so the whole file is re-runnable
-- via Supabase Dashboard → SQL Editor (or Management API).
-- ------------------------------------------------------------------ *

alter table public.marketplace_categories add column if not exists description text;
alter table public.marketplace_categories add column if not exists meta_title text;
alter table public.marketplace_categories add column if not exists meta_description text;

-- Realtime publication already includes marketplace_categories (applied in
-- earlier migrations), so no change needed here.

-- 4. Allow 'bundle' promotion type in marketplace_promotions (the admin
--    Promotions tab creates bundle discounts with type='bundle', but migration
--    103's check constraint only lists coupon/storewide/flash_sale/category/etc).
--    Idempotent: finds the existing check constraint on type and recreates it
--    with 'bundle' added only when it is not already present.
do $$
declare
  conname text;
begin
  select con.conname into conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'marketplace_promotions'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%type%'
    and pg_get_constraintdef(con.oid) not like '%bundle%'
  limit 1;

  if conname is not null then
    execute format('alter table public.marketplace_promotions drop constraint %I', conname);
    execute 'alter table public.marketplace_promotions add constraint marketplace_promotions_type_check check (type in (''storewide'',''category'',''subcategory'',''product'',''seller'',''flash_sale'',''black_friday'',''coupon'',''bundle''))';
  end if;
end $$;

-- Notes for the operator
-- ------------------------------------------------------------------ *
-- 1. Apply this file in Supabase Dashboard → SQL Editor.
-- 2. The Categories admin editor (Add/Edit category) now shows Description,
--    SEO Title and SEO Description fields. They are optional; when empty the
--    storefront falls back to the category name.
-- ------------------------------------------------------------------ *

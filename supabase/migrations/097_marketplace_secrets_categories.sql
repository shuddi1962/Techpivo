-- 097 — Marketplace security hardening + DB-backed editable categories
-- 1. site_secrets: server-only credential store (RLS on, NO public policies)
-- 2. Move every secret OUT of the public site_settings table and lock the
--    public read policy down to non-secret keys
-- 3. marketplace_categories: editable category tree (admin CRUD, live sync)
-- 4. marketplace_orders.fulfill_lock_at: idempotent CJ fulfillment guard

/* ------------------------------------------------------------------ *
 * 1. Dedicated secret store — service role only
 * ------------------------------------------------------------------ */
create table if not exists public.site_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_secrets enable row level security;

-- Deliberately NO policies: anon/authenticated get nothing, service_role
-- bypasses RLS so server code can read it.

/* ------------------------------------------------------------------ *
 * 2. Move secrets out of the world-readable site_settings table
 * ------------------------------------------------------------------ */
insert into public.site_secrets (key, value)
select s.key, s.value::text
from public.site_settings s
where s.key in (
  'flutterwave_secret_key','flutterwave_encryption_key','flutterwave_secret_hash',
  'flutterwave_public_key','cj_api_key','korapay_secret_key','korapay_encryption_key',
  'korapay_public_key','dataforseo_api_key','cron_secret','openrouter_api_key',
  'resend_api_key','vapid_private_key','vapid_public_key','gemini_api_key'
)
  and s.value is not null
  and s.value::text <> ''
on conflict (key) do update
  set value = excluded.value, updated_at = now();

delete from public.site_settings
where key in (
  'flutterwave_secret_key','flutterwave_encryption_key','flutterwave_secret_hash',
  'flutterwave_public_key','cj_api_key','korapay_secret_key','korapay_encryption_key',
  'korapay_public_key','dataforseo_api_key','cron_secret','openrouter_api_key',
  'resend_api_key','vapid_private_key','vapid_public_key','gemini_api_key'
);

-- Public reads may never see secret-looking keys (defence in depth: a
-- future accidental write to site_settings stays private).
drop policy if exists "Public can view site settings" on public.site_settings;
create policy "Public can view non-secret site settings"
  on public.site_settings for select
  to anon, authenticated
  using (
    key not in (
      'flutterwave_secret_key','flutterwave_encryption_key','flutterwave_secret_hash',
      'cj_api_key','korapay_secret_key','korapay_encryption_key','dataforseo_api_key',
      'cron_secret','openrouter_api_key','resend_api_key','vapid_private_key','gemini_api_key'
    )
    and key not like '%secret%'
    and key not like '%password%'
    and key not like '%api_key%'
    and key not like '%private_key%'
  );

/* ------------------------------------------------------------------ *
 * 3. Editable category tree
 *
 * The live table already exists (slug PK, depth 0/1/2, image_url). This
 * block makes the migration safe on a fresh database and adds the columns
 * an older install may be missing.
 * ------------------------------------------------------------------ */
create table if not exists public.marketplace_categories (
  slug text primary key,
  name text not null,
  parent_slug text references public.marketplace_categories(slug) on delete set null,
  depth integer not null default 0,
  icon text,
  image_url text,
  cj_category_id text,
  is_active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.marketplace_categories add column if not exists depth integer not null default 0;
alter table public.marketplace_categories add column if not exists image_url text;
alter table public.marketplace_categories add column if not exists cj_category_id text;
alter table public.marketplace_categories add column if not exists is_active boolean not null default true;
alter table public.marketplace_categories add column if not exists sort integer not null default 0;
alter table public.marketplace_categories add column if not exists icon text;

create index if not exists idx_marketplace_categories_parent
  on public.marketplace_categories (parent_slug, sort);

alter table public.marketplace_categories enable row level security;

drop policy if exists "Public can view active marketplace categories"
  on public.marketplace_categories;
create policy "Public can view active marketplace categories"
  on public.marketplace_categories for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins manage marketplace categories"
  on public.marketplace_categories;
create policy "Admins manage marketplace categories"
  on public.marketplace_categories for all
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

-- realtime (idempotent — ALTER PUBLICATION has no IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketplace_categories'
  ) then
    alter publication supabase_realtime add table public.marketplace_categories;
  end if;
end $$;

/* ------------------------------------------------------------------ *
 * 4. Fulfillment lock — one CJ order per marketplace order, ever
 * ------------------------------------------------------------------ */
alter table public.marketplace_orders add column if not exists fulfill_lock_at timestamptz;

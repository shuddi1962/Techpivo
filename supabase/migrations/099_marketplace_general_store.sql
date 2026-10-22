-- 099 — General store: leaf categories + catalogue integrity
--
-- 1. affiliate_products.leaf_slug — the CJ third-level (leaf) category a
--    product belongs to. The store now mirrors CJ's own three-level tree,
--    so a leaf page can show exactly the products of that leaf.
-- 2. A UNIQUE index on cj_pid — one CJ product can only be in the store
--    once. The bulk importer upserts on this column, which makes a double
--    import impossible instead of merely unlikely.
-- 3. marketplace_categories.cj_category_id is now filled for every node of
--    the tree (first/second/third level) so the store can scope supplier
--    searches to the exact CJ category.

alter table public.affiliate_products add column if not exists leaf_slug text;

create index if not exists idx_affiliate_products_leaf_slug
  on public.affiliate_products (leaf_slug);

create index if not exists idx_affiliate_products_category_pair
  on public.affiliate_products (category_slug, subcategory_slug);

-- the storefront sorts the catalogue by newest
create index if not exists idx_affiliate_products_created_at
  on public.affiliate_products (created_at desc);

-- one CJ product = one store product
create unique index if not exists idx_affiliate_products_cj_pid_unique
  on public.affiliate_products (cj_pid)
  where cj_pid is not null;

-- Migration 091: TechPivo Market — category tree + CJDropshipping columns
-- Idempotent: safe to re-run via Supabase dashboard SQL editor.

-- 1. Marketplace categories (5 departments, subs, leaves)
CREATE TABLE IF NOT EXISTS marketplace_categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_slug TEXT REFERENCES marketplace_categories(slug) ON DELETE SET NULL,
  depth INT NOT NULL DEFAULT 0,
  icon TEXT,
  image_url TEXT,
  cj_category_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view marketplace categories') THEN
    CREATE POLICY "Public can view marketplace categories" ON marketplace_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage marketplace categories') THEN
    CREATE POLICY "Admins manage marketplace categories" ON marketplace_categories FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
    );
  END IF;
END $$;

-- 2. CJ columns on affiliate_products
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS category_slug TEXT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS subcategory_slug TEXT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS cj_pid TEXT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS cj_vid TEXT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS stock INT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS cj_data JSONB;

CREATE INDEX IF NOT EXISTS idx_affiliate_products_category_slug ON affiliate_products(category_slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_cj_pid ON affiliate_products(cj_pid);

-- 3. Seed departments (depth 0) + subs (depth 1)
INSERT INTO marketplace_categories (slug, name, parent_slug, depth, icon, sort) VALUES
  ('consumer-electronics', 'Consumer Electronics', NULL, 0, 'Cpu', 10),
  ('phones-accessories', 'Phones & Accessories', NULL, 0, 'Smartphone', 20),
  ('computer-office', 'Computer & Office', NULL, 0, 'Laptop', 30),
  ('automobiles-motorcycles', 'Automobiles & Motorcycles', NULL, 0, 'Car', 40),
  ('home-improvement', 'Home Improvement', NULL, 0, 'Wrench', 50)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort = EXCLUDED.sort;

INSERT INTO marketplace_categories (slug, name, parent_slug, depth, sort) VALUES
  ('smart-electronics', 'Smart Electronics', 'consumer-electronics', 1, 11),
  ('camera-photo', 'Camera & Photo', 'consumer-electronics', 1, 12),
  ('accessories-parts', 'Accessories & Parts', 'consumer-electronics', 1, 13),
  ('video-games', 'Video Games', 'consumer-electronics', 1, 14),
  ('home-audio-video', 'Home Audio & Video', 'consumer-electronics', 1, 15),
  ('portable-audio-video', 'Portable Audio & Video', 'consumer-electronics', 1, 16),
  ('mobile-phone-parts', 'Mobile Phone Parts', 'phones-accessories', 1, 21),
  ('mobile-phones', 'Mobile Phones', 'phones-accessories', 1, 22),
  ('mobile-phone-accessories', 'Mobile Phone Accessories', 'phones-accessories', 1, 23),
  ('storage-devices', 'Storage Devices', 'computer-office', 1, 31),
  ('tablet-laptop-accessories', 'Tablet & Laptop Accessories', 'computer-office', 1, 32),
  ('security-protection', 'Security & Protection', 'computer-office', 1, 33),
  ('laptops-tablets', 'Laptops & Tablets', 'computer-office', 1, 34),
  ('office-electronics', 'Office Electronics', 'computer-office', 1, 35),
  ('networking', 'Networking', 'computer-office', 1, 36),
  ('interior-accessories', 'Interior Accessories', 'automobiles-motorcycles', 1, 41),
  ('motorcycle-accessories-parts', 'Motorcycle Accessories & Parts', 'automobiles-motorcycles', 1, 42),
  ('auto-replacement-parts', 'Auto Replacement Parts', 'automobiles-motorcycles', 1, 43),
  ('tools-maintenance-care', 'Tools, Maintenance & Care', 'automobiles-motorcycles', 1, 44),
  ('car-electronics', 'Car Electronics', 'automobiles-motorcycles', 1, 45),
  ('exterior-accessories', 'Exterior Accessories', 'automobiles-motorcycles', 1, 46),
  ('outdoor-lighting', 'Outdoor Lighting', 'home-improvement', 1, 51),
  ('home-appliances', 'Home Appliances', 'home-improvement', 1, 52),
  ('indoor-lighting', 'Indoor Lighting', 'home-improvement', 1, 53),
  ('led-lighting', 'LED Lighting', 'home-improvement', 1, 54),
  ('tools', 'Tools', 'home-improvement', 1, 55)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_slug = EXCLUDED.parent_slug, depth = EXCLUDED.depth, sort = EXCLUDED.sort;

-- 4. Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_categories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_categories;
  END IF;
END $$;

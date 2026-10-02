-- Migration 092: TechPivo Market — orders + reviews (full dropship checkout)
-- Idempotent: safe to re-run via Supabase dashboard SQL editor.

-- 1. Orders (guest checkout supported: email identifies owner)
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_usd NUMERIC NOT NULL DEFAULT 0,
  shipping_usd NUMERIC NOT NULL DEFAULT 0,
  total_usd NUMERIC NOT NULL DEFAULT 0,
  total_ngn NUMERIC,
  currency TEXT NOT NULL DEFAULT 'NGN',
  paystack_reference TEXT UNIQUE,
  paystack_status TEXT NOT NULL DEFAULT 'pending',
  cj_order_id TEXT,
  cj_status TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ship_name TEXT,
  ship_phone TEXT,
  ship_address TEXT,
  ship_city TEXT,
  ship_state TEXT,
  ship_zip TEXT,
  ship_country TEXT NOT NULL DEFAULT 'NG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_email ON marketplace_orders(email);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_paystack_ref ON marketplace_orders(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);

ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can create marketplace orders') THEN
    CREATE POLICY "Public can create marketplace orders" ON marketplace_orders FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage marketplace orders') THEN
    CREATE POLICY "Admins manage marketplace orders" ON marketplace_orders FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
    );
  END IF;
END $$;

-- 2. Reviews (real ratings replace hardcoded demo ratings)
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Verified buyer',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_product ON marketplace_reviews(product_id);

ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view marketplace reviews') THEN
    CREATE POLICY "Public can view marketplace reviews" ON marketplace_reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can create marketplace reviews') THEN
    CREATE POLICY "Public can create marketplace reviews" ON marketplace_reviews FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Admins full access to reviews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage marketplace reviews') THEN
    CREATE POLICY "Admins manage marketplace reviews" ON marketplace_reviews FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','editor'))
    );
  END IF;
END $$;

-- 3. Realtime (orders feed admin dashboard live; reviews + products update storefront live)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_reviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_reviews;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'affiliate_products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE affiliate_products;
  END IF;
END $$;

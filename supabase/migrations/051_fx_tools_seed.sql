-- 051_fx_tools_seed.sql
-- Reactivate currency-converter (was deactivated in 050) + seed 3 new tools.
-- Creates fx_rates table for DB-persistent FX rates (fallback for /api/tools/fx).
-- Idempotent: safe to re-run.

-- 1. fx_rates table (rates per 1 unit of base currency)
CREATE TABLE IF NOT EXISTS fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (base_currency, quote_currency)
);
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fx_rates' AND policyname='fx_rates public read') THEN CREATE POLICY "fx_rates public read" ON fx_rates FOR SELECT USING (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fx_rates' AND policyname='fx_rates admin write') THEN CREATE POLICY "fx_rates admin write" ON fx_rates FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')); END IF; END $$;

-- 2. Seed common rates (idempotent)
INSERT INTO fx_rates (base_currency, quote_currency, rate)
SELECT 'USD', 'NGN', 1550.0 WHERE NOT EXISTS (SELECT 1 FROM fx_rates WHERE base_currency = 'USD' AND quote_currency = 'NGN');
INSERT INTO fx_rates (base_currency, quote_currency, rate)
SELECT 'EUR', 'NGN', 1680.0 WHERE NOT EXISTS (SELECT 1 FROM fx_rates WHERE base_currency = 'EUR' AND quote_currency = 'NGN');
INSERT INTO fx_rates (base_currency, quote_currency, rate)
SELECT 'GBP', 'NGN', 1975.0 WHERE NOT EXISTS (SELECT 1 FROM fx_rates WHERE base_currency = 'GBP' AND quote_currency = 'NGN');

-- 3. Reactivate currency-converter tool
UPDATE tools
SET
  is_active = true,
  category = 'calculator',
  description = 'Convert between 100+ currencies using live exchange rates (open exchange rate API).'
WHERE slug = 'currency-converter';

-- 4. Sync category for new tools (was seeded in 050 as inactive)
UPDATE tools SET category = 'document' WHERE slug IN ('excel-to-pdf', 'pdf-to-excel');
UPDATE tools SET category = 'image' WHERE slug = 'image-upscaler';

-- 5. Seed new tools (idempotent)
INSERT INTO tools (name, slug, description, category, is_active, is_ai_tool, usage_count, meta_title, meta_description)
SELECT 'Currency Converter', 'currency-converter', 'Convert between 100+ currencies using live exchange rates.', 'calculator', true, false, 0,
       'Currency Converter — Live Exchange Rates | TechPivo Tools',
       'Free currency converter with live exchange rates. Convert USD, EUR, NGN, GBP and 100+ currencies instantly. No sign-up needed.'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'currency-converter');

INSERT INTO tools (name, slug, description, category, is_active, is_ai_tool, usage_count, meta_title, meta_description)
SELECT 'Excel to PDF', 'excel-to-pdf', 'Convert Excel spreadsheets to PDF, entirely in your browser.', 'document', true, false, 0,
       'Excel to PDF Converter — Free, Private | TechPivo Tools',
       'Convert XLSX, XLS, CSV and TSV spreadsheets to PDF for free. Files never leave your browser.'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'excel-to-pdf');

INSERT INTO tools (name, slug, description, category, is_active, is_ai_tool, usage_count, meta_title, meta_description)
SELECT 'PDF to Excel', 'pdf-to-excel', 'Extract tables from PDF files into Excel format.', 'document', true, false, 0,
       'PDF to Excel Converter — Free, Private | TechPivo Tools',
       'Turn PDF tables into editable Excel spreadsheets for free. 100% in-browser, nothing uploads.'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'pdf-to-excel');

INSERT INTO tools (name, slug, description, category, is_active, is_ai_tool, usage_count, meta_title, meta_description)
SELECT 'Image Upscaler', 'image-upscaler', 'Upscale images 2x/4x in your browser.', 'image', true, false, 0,
       'Image Upscaler — 2x/4x in Your Browser | TechPivo Tools',
       'Enlarge images 2x or 4x instantly with smart interpolation. Free, private, no upload.'
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'image-upscaler');

-- 6. Sync meta metadata for already-existing rows (idempotent)
UPDATE tools SET meta_title = 'Currency Converter — Live Exchange Rates | TechPivo Tools',
                  meta_description = 'Free currency converter with live exchange rates. Convert USD, EUR, NGN, GBP and 100+ currencies instantly. No sign-up needed.'
WHERE slug = 'currency-converter' AND meta_title IS NULL;
UPDATE tools SET meta_title = 'Excel to PDF Converter — Free, Private | TechPivo Tools',
                  meta_description = 'Convert XLSX, XLS, CSV and TSV spreadsheets to PDF for free. Files never leave your browser.'
WHERE slug = 'excel-to-pdf' AND meta_title IS NULL;
UPDATE tools SET meta_title = 'PDF to Excel Converter — Free, Private | TechPivo Tools',
                  meta_description = 'Turn PDF tables into editable Excel spreadsheets for free. 100% in-browser, nothing uploads.'
WHERE slug = 'pdf-to-excel' AND meta_title IS NULL;
UPDATE tools SET meta_title = 'Image Upscaler — 2x/4x in Your Browser | TechPivo Tools',
                  meta_description = 'Enlarge images 2x or 4x instantly with smart interpolation. Free, private, no upload.'
WHERE slug = 'image-upscaler' AND meta_title IS NULL;
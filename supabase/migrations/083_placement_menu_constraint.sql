-- Widen the site_pages placement CHECK to include 'menu'
ALTER TABLE site_pages DROP CONSTRAINT IF EXISTS site_pages_placement_check;
ALTER TABLE site_pages ADD CONSTRAINT site_pages_placement_check
  CHECK (placement IN ('header', 'footer', 'both', 'menu', 'none'));

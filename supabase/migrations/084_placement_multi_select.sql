-- Drop the single-value CHECK constraint on placement so we can store comma-separated values
-- e.g. "topbar,header,footer" or "header,menu"
ALTER TABLE site_pages DROP CONSTRAINT IF EXISTS site_pages_placement_check;

-- Convert existing single-value placements to comma-separated
-- "both"  → "topbar,header,footer"
-- "header" → "topbar,header"
-- "footer" → "footer"         (already comma-compatible)
-- "menu"  → "menu"            (already comma-compatible)
-- "none"  → ""                (empty = no placement)
UPDATE site_pages SET placement = 'topbar,header,footer' WHERE placement = 'both';
UPDATE site_pages SET placement = 'topbar,header'        WHERE placement = 'header';
UPDATE site_pages SET placement = 'footer'               WHERE placement = 'footer';
UPDATE site_pages SET placement = 'menu'                 WHERE placement = 'menu';
UPDATE site_pages SET placement = ''                     WHERE placement = 'none';

-- Update the default for new pages
ALTER TABLE site_pages ALTER COLUMN placement SET DEFAULT '';

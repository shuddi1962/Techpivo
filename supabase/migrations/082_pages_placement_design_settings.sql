-- Migration 082: Add placement + design_settings to site_pages
-- placement: where the page link appears in the public nav (header/footer/both/none)
-- design_settings: JSONB for visual customization (hero_bg, text_color, etc.)

ALTER TABLE site_pages
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS design_settings jsonb DEFAULT NULL;

-- index for nav queries (placement = 'header' or 'footer' or 'both')
CREATE INDEX IF NOT EXISTS idx_site_pages_placement ON site_pages (placement);

-- Ensure the CHECK is sane — only known values allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_pages_placement_check'
  ) THEN
    ALTER TABLE site_pages
      ADD CONSTRAINT site_pages_placement_check
      CHECK (placement IN ('header', 'footer', 'both', 'none'));
  END IF;
END $$;

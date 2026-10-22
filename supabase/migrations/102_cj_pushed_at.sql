-- 102: Track WHICH catalogue products have already been pushed to CJ "MyProducts".
-- The cron dispatcher (and the manual push button) selected the first 2000 rows
-- and subtracted a <=10-item CJ list, so the same first ~2000 rows were
-- re-probed every run ("already added") and newer products never got pushed.
-- A DB-side marker makes the selection deterministic, resumable and exact.
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS cj_pushed_at TIMESTAMPTZ;

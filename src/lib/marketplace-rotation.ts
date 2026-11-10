// Time-based rotation bucket: every ROTATION_INTERVAL_MS (10 minutes) the
// bucket increments, so every visitor sees the same category/product
// selection during a window and a fresh selection in the next window.
// No page reload, no flicker, stable within each 10-minute interval.
export const ROTATION_INTERVAL_MS = 600_000

export function rotationBucket(intervalMs = ROTATION_INTERVAL_MS): number {
  return Math.floor(Date.now() / intervalMs)
}

// Rotate a pool deterministically by time bucket, skipping IDs already in
// `used` (for cross-section dedup). All visitors see the same offset
// during a window; the offset advances every ROTATION_INTERVAL_MS so
// every eligible item gets its turn over time.
export function takeTimeRotated<T extends { id: string }>(
  pool: T[],
  bucket: number,
  n: number,
  used: Set<string> = new Set()
): T[] {
  if (pool.length === 0) return []
  const start = bucket % pool.length
  const out: T[] = []
  for (let i = 0; i < pool.length && out.length < n; i++) {
    const p = pool[(start + i) % pool.length]
    if (used.has(p.id)) continue
    out.push(p)
    used.add(p.id)
  }
  return out
}

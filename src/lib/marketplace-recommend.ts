// TechPivo Market recommendation engine (CLIENT-SAFE — pure logic, no
// server imports; imported by both the recommendations API route and
// storefront components so scoring stays identical everywhere).
//
// Priority: admin overrides > co-purchase history > explicit complement
// pairs > same-category > same-department. NEVER random cross-department
// fill: fewer than 4 honest boxes beats 4 invented ones.

import type { StoreProduct } from "./marketplace-catalog"

export interface ScoredProduct {
  product: StoreProduct
  reason: string
  rank: number
}

interface CurrentProduct {
  id: string
  category_slug: string | null
  subcategory_slug: string | null
}

// Explicit complement pairs: viewing sub -> complementary subs + reason.
// Keys/values are subcategory slugs from marketplace-categories.ts.
const COMPLEMENT: Record<string, Array<{ subs: string[]; reason: string }>> = {
  "laptops-tablets": [
    { subs: ["tablet-laptop-accessories", "storage-devices", "networking"], reason: "Pairs well with your laptop" },
    { subs: ["office-electronics"], reason: "Complete your setup" },
  ],
  "mobile-phones": [
    { subs: ["mobile-phone-accessories", "mobile-phone-parts"], reason: "Essential accessories" },
  ],
  "mobile-phone-accessories": [
    { subs: ["mobile-phones"], reason: "Made for your phone" },
  ],
  "camera-photo": [
    { subs: ["accessories-parts"], reason: "Complete your camera kit" },
    { subs: ["storage-devices"], reason: "Storage for your shoots" },
  ],
  "video-games": [
    { subs: ["home-audio-video", "portable-audio-video"], reason: "Level up your gaming setup" },
  ],
  "home-audio-video": [
    { subs: ["portable-audio-video", "accessories-parts"], reason: "Complete your home setup" },
  ],
  "portable-audio-video": [
    { subs: ["accessories-parts", "smart-electronics"], reason: "Goes well together" },
  ],
  "smart-electronics": [
    { subs: ["accessories-parts"], reason: "Accessories for your device" },
  ],
  "accessories-parts": [
    { subs: ["camera-photo", "portable-audio-video"], reason: "Frequently paired" },
  ],
  "storage-devices": [
    { subs: ["laptops-tablets", "camera-photo"], reason: "Expand your storage" },
  ],
  "networking": [
    { subs: ["laptops-tablets", "office-electronics"], reason: "Complete your network" },
  ],
  "office-electronics": [
    { subs: ["laptops-tablets", "tablet-laptop-accessories"], reason: "For your workspace" },
  ],
  "tablet-laptop-accessories": [
    { subs: ["laptops-tablets", "storage-devices"], reason: "Made for your laptop" },
  ],
  "car-electronics": [
    { subs: ["interior-accessories", "exterior-accessories"], reason: "Complete your car setup" },
  ],
  "security-protection": [
    { subs: ["networking", "storage-devices"], reason: "Complete your security setup" },
  ],
  "outdoor-lighting": [
    { subs: ["tools", "home-appliances"], reason: "For your home project" },
  ],
  "indoor-lighting": [
    { subs: ["home-appliances"], reason: "Complete the room" },
  ],
}

function complementSubs(slug: string | null): Array<{ subs: string[]; reason: string }> {
  if (!slug) return []
  return COMPLEMENT[slug] || []
}

function reasonForSub(slug: string | null, current: CurrentProduct): string | null {
  for (const group of complementSubs(current.subcategory_slug || current.category_slug)) {
    if (slug && group.subs.includes(slug)) return group.reason
  }
  return null
}

/**
 * Score + rank candidates for the "Complete Your Purchase" section.
 * - overrides: admin-configured product ids in display order (rank 0).
 * - coCounts: product id -> times bought in the same paid order (rank 1).
 * Returns at most `limit` items; may return fewer when nothing relevant exists.
 */
export function scoreComplementary(
  current: CurrentProduct,
  candidates: StoreProduct[],
  opts?: { overrides?: string[]; coCounts?: Map<string, number>; limit?: number }
): ScoredProduct[] {
  const limit = Math.max(1, Math.min(opts?.limit ?? 4, 8))
  const overrides = opts?.overrides || []
  const coCounts = opts?.coCounts || new Map<string, number>()
  const seen = new Set<string>([current.id])
  const out: ScoredProduct[] = []

  const push = (p: StoreProduct, reason: string, rank: number) => {
    if (seen.has(p.id) || out.length >= limit) return
    seen.add(p.id)
    out.push({ product: p, reason, rank })
  }

  const byId = new Map(candidates.map((c) => [c.id, c]))
  // 0 — admin overrides first, in configured order.
  for (const id of overrides) {
    const p = byId.get(id)
    if (p) push(p, "Recommended for this product", 0)
  }
  // 1 — co-purchased in real paid orders.
  const co = candidates
    .filter((c) => !seen.has(c.id) && (coCounts.get(c.id) || 0) > 0)
    .sort((a, b) => (coCounts.get(b.id) || 0) - (coCounts.get(a.id) || 0))
  for (const p of co) push(p, "Frequently bought together", 1)
  // 2 — explicit complement subs.
  for (const p of candidates) {
    if (seen.has(p.id)) continue
    const r = reasonForSub(p.subcategory_slug || p.category_slug, current)
    if (r) push(p, r, 2)
  }
  // 3 — same exact category.
  for (const p of candidates) {
    if (seen.has(p.id)) continue
    const slug = p.subcategory_slug || p.category_slug
    const cur = current.subcategory_slug || current.category_slug
    if (slug && cur && slug === cur) push(p, "More in this category", 3)
  }
  // 4 — same department (category_slug match covers dept-level rows).
  for (const p of candidates) {
    if (seen.has(p.id)) continue
    if (
      current.category_slug &&
      (p.category_slug === current.category_slug || p.subcategory_slug === current.category_slug)
    ) {
      push(p, "Pairs well with your pick", 4)
    }
  }
  return out.slice(0, limit)
}

/** Compact "complete your setup" picks for the cart mini-popup (max 2, rank 0-2 only — never filler). */
export function scoreMiniAddons(
  cartIds: string[],
  candidates: StoreProduct[],
  current?: CurrentProduct | null
): ScoredProduct[] {
  const inCart = new Set(cartIds)
  const pool = candidates.filter((c) => !inCart.has(c.id))
  if (current) {
    return scoreComplementary(current, pool, { limit: 2 }).filter((s) => s.rank <= 2)
  }
  return pool.slice(0, 2).map((product) => ({ product, reason: "You may also need", rank: 4 }))
}

// TechPivo Market — category tree reader (server-side only).
//
// The category tree lives in `marketplace_categories` so admins can add,
// rename, hide and delete departments / subcategories / leaves from
// Admin → Marketplace → Categories. The bundled code tree
// (src/lib/marketplace-categories.ts) is the seed + fallback: it is used
// until the admin syncs the tree into the database, and whenever the table
// is empty (e.g. the migration has not been applied yet).
//
// Schema (live): slug (pk) · name · parent_slug · depth (0 dept, 1 sub,
// 2 leaf) · icon · image_url · cj_category_id · is_active · sort.

import { createClient } from "@/lib/supabase/admin"
import { MARKET_DEPARTMENTS, type MarketDepartment } from "@/lib/marketplace-categories"

export type MarketCategoryLevel = "dept" | "sub" | "leaf"

export interface MarketCategoryRow {
  slug: string
  name: string
  parent_slug: string | null
  /** 0 = department, 1 = subcategory, 2 = leaf. */
  depth: number
  icon: string | null
  image_url: string | null
  cj_category_id: string | null
  is_active: boolean
  sort: number
}

export const levelOfDepth = (depth: number): MarketCategoryLevel =>
  depth === 0 ? "dept" : depth === 1 ? "sub" : "leaf"

export const depthOfLevel = (level: MarketCategoryLevel): number =>
  level === "dept" ? 0 : level === "sub" ? 1 : 2

const CACHE_MS = 15_000
let cached: { tree: MarketDepartment[]; at: number } | null = null

export function clearMarketplaceTreeCache() {
  cached = null
}

/** Raw rows (active only by default) — admin screens use includeInactive. */
export async function fetchMarketplaceCategoryRows(includeInactive = false): Promise<MarketCategoryRow[]> {
  try {
    const supabase = createClient()
    let q = supabase
      .from("marketplace_categories")
      .select("slug,name,parent_slug,depth,icon,image_url,cj_category_id,is_active,sort")
      .order("sort", { ascending: true })
      .limit(2000)
    if (!includeInactive) q = q.eq("is_active", true)
    const { data, error } = await q
    if (error) return []
    return (data || []) as MarketCategoryRow[]
  } catch {
    return []
  }
}

/** Build the nested tree shape the storefront expects from flat rows. */
export function buildMarketplaceTree(rows: MarketCategoryRow[]): MarketDepartment[] {
  const depts = rows.filter((r) => r.depth === 0)
  if (depts.length === 0) return []
  const subsOf = (parent: string) => rows.filter((r) => r.depth === 1 && r.parent_slug === parent)
  const leavesOf = (parent: string) => rows.filter((r) => r.depth === 2 && r.parent_slug === parent)
  return depts.map((d) => ({
    name: d.name,
    slug: d.slug,
    icon: d.icon || "LayoutGrid",
    image: d.image_url || "",
    subs: subsOf(d.slug).map((s) => ({
      name: s.name,
      slug: s.slug,
      items: leavesOf(s.slug).map((l) => ({ name: l.name, slug: l.slug })),
    })),
  }))
}

/**
 * The live category tree. DB rows win; the bundled code tree is the
 * fallback so the storefront always has departments.
 */
export async function fetchMarketplaceTree(): Promise<MarketDepartment[]> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_MS) return cached.tree
  const rows = await fetchMarketplaceCategoryRows(false)
  const tree = buildMarketplaceTree(rows)
  const out = tree.length > 0 ? tree : MARKET_DEPARTMENTS
  cached = { tree: out, at: now }
  return out
}

/** Flat rows for the code tree — used to seed the database. */
export function codeTreeRows(): Array<Omit<MarketCategoryRow, "cj_category_id">> {
  const rows: Array<Omit<MarketCategoryRow, "cj_category_id">> = []
  let sort = 0
  for (const d of MARKET_DEPARTMENTS) {
    rows.push({
      slug: d.slug,
      name: d.name,
      parent_slug: null,
      depth: 0,
      icon: d.icon,
      image_url: d.image,
      is_active: true,
      sort: sort++,
    })
    for (const s of d.subs) {
      rows.push({
        slug: s.slug,
        name: s.name,
        parent_slug: d.slug,
        depth: 1,
        icon: null,
        image_url: null,
        is_active: true,
        sort: sort++,
      })
      for (const item of s.items) {
        rows.push({
          slug: item.slug,
          name: item.name,
          parent_slug: s.slug,
          depth: 2,
          icon: null,
          image_url: null,
          is_active: true,
          sort: sort++,
        })
      }
    }
  }
  return rows
}

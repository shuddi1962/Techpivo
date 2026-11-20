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
import { MARKET_DEPARTMENTS, px, type MarketDepartment } from "@/lib/marketplace-categories"

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
  /** Optional category description rendered on the storefront category page. */
  description: string | null
  /** Optional SEO title for the category page. */
  meta_title: string | null
  /** Optional SEO meta description for the category page. */
  meta_description: string | null
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
      .select(
        "slug,name,parent_slug,depth,icon,image_url,cj_category_id,is_active,sort,description,meta_title,meta_description"
      )
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

/** Bundled code-tree sub images used as fallback when a DB row has no image_url,
 *  so category tiles never fall back to a letter chip just because the admin
 *  hasn't uploaded a subcategory photo yet. */
const bundledSubImage = new Map<string, string>()
for (const d of MARKET_DEPARTMENTS) {
  for (const s of d.subs || []) {
    if (s.image) bundledSubImage.set(s.slug, s.image)
  }
}
// Men's and Women's Clothing store their leaves as `items` rather than `subs`,
// so they are not collected above. Map their subcategory slugs to real photos
// so category tiles never show a blank letter chip for them.
for (const slug of [
  "tshirts",
  "shirts",
  "jackets-coats",
  "jeans",
  "trousers",
  "suits-blazers",
]) {
  bundledSubImage.set(slug, px(3184465, 600))
}
for (const slug of ["dresses", "tops-blouses", "jeans-denim", "jackets", "skirts", "lingerie"]) {
  bundledSubImage.set(slug, px(3184291, 600))
}

export { bundledSubImage }

export function buildMarketplaceTree(rows: MarketCategoryRow[]): MarketDepartment[] {
  const depts = rows.filter((r) => r.depth === 0)
  if (depts.length === 0) return []
  const subsOf = (parent: string) => rows.filter((r) => r.depth === 1 && r.parent_slug === parent)
  const leavesOf = (parent: string) => rows.filter((r) => r.depth === 2 && r.parent_slug === parent)
  return depts.map((d) => ({
    name: d.name,
    slug: d.slug,
    icon: d.icon || "",
    image: d.image_url || "",
    description: d.description ?? null,
    meta_title: d.meta_title ?? null,
    meta_description: d.meta_description ?? null,
    subs: subsOf(d.slug).map((s) => ({
      name: s.name,
      slug: s.slug,
      image: s.image_url || bundledSubImage.get(s.slug) || "",
      description: s.description ?? null,
      meta_title: s.meta_title ?? null,
      meta_description: s.meta_description ?? null,
      items: leavesOf(s.slug).map((l) => ({
        name: l.name,
        slug: l.slug,
        description: l.description ?? null,
        meta_title: l.meta_title ?? null,
        meta_description: l.meta_description ?? null,
      })),
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
      description: d.description ?? null,
      meta_title: d.meta_title ?? null,
      meta_description: d.meta_description ?? null,
    })
    for (const s of d.subs || []) {
      rows.push({
        slug: s.slug,
        name: s.name,
        parent_slug: d.slug,
        depth: 1,
        icon: null,
        image_url: null,
        is_active: true,
        sort: sort++,
        description: s.description ?? null,
        meta_title: s.meta_title ?? null,
        meta_description: s.meta_description ?? null,
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
          description: item.description ?? null,
          meta_title: item.meta_title ?? null,
          meta_description: item.meta_description ?? null,
        })
      }
    }
  }
  return rows
}

/**
 * Translate one of OUR categories into the equivalent CJ categories so a
 * supplier search inside a department can never return a product from a
 * different department.
 *
 * Our taxonomy was modelled on CJ's, so the mapping is by name: a
 * department is a CJ first-level category, a subcategory is a CJ
 * second-level category. The names returned are CJ's OWN names — the
 * product filter compares them against what CJ sends back, so they must
 * match exactly (CJ says "Laptop & Tablets", we say "Laptops & Tablets").
 */
export interface CjCategoryFilter {
  /** CJ category names the product path must contain (ALL of them). */
  names: string[]
  /** CJ second-level category ids to narrow the supplier query. */
  lv2: string[]
  /** CJ third-level category ids (when we know the leaf). */
  lv3: string[]
  /** True when the mapping actually matched something on CJ's side. */
  matched: boolean
}

export async function resolveCjCategoryFilter(
  categorySlug?: string | null,
  subcategorySlug?: string | null
): Promise<CjCategoryFilter | null> {
  if (!categorySlug && !subcategorySlug) return null
  const rows = await fetchMarketplaceCategoryRows(true)
  const dept = rows.find((r) => r.slug === categorySlug && r.depth === 0)
  const sub = rows.find((r) => r.slug === subcategorySlug && r.depth === 1)
  if (!dept && !sub) return null

  const { cjGetCategoryIndex, matchCjFirstLevel, matchCjSecondLevel } = await import("@/lib/cj")
  let index
  try {
    index = await cjGetCategoryIndex()
  } catch {
    // CJ unreachable — do not scope the search (an unreachable category
    // tree must never make the admin see an empty catalogue).
    return null
  }

  const names: string[] = []
  const lv2: string[] = []
  const lv3: string[] = []
  let matched = false

  // The department (CJ first level).
  const deptRows = dept ? matchCjFirstLevel(index, dept.name) : []
  if (deptRows.length > 0) {
    matched = true
    const firstName = deptRows[0].firstName
    if (firstName && !names.includes(firstName)) names.push(firstName)
    for (const r of deptRows) {
      if (r.secondId && !lv2.includes(r.secondId)) lv2.push(r.secondId)
      if (r.thirdId && !lv3.includes(r.thirdId)) lv3.push(r.thirdId)
    }
    // A subcategory narrows the department to one CJ second level.
    if (sub) {
      const subRows = matchCjSecondLevel(index, sub.name, firstName)
      if (subRows.length > 0) {
        const secondName = subRows[0].secondName
        if (secondName && !names.includes(secondName)) names.push(secondName)
        lv2.length = 0
        lv3.length = 0
        for (const r of subRows) {
          if (r.secondId && !lv2.includes(r.secondId)) lv2.push(r.secondId)
          if (r.thirdId && !lv3.includes(r.thirdId)) lv3.push(r.thirdId)
        }
      }
    }
  } else if (sub) {
    // No department row (or it does not exist on CJ) — try the subcategory
    // on its own.
    const subRows = matchCjSecondLevel(index, sub.name)
    if (subRows.length > 0) {
      matched = true
      const firstName = subRows[0].firstName
      const secondName = subRows[0].secondName
      if (firstName && !names.includes(firstName)) names.push(firstName)
      if (secondName && !names.includes(secondName)) names.push(secondName)
      for (const r of subRows) {
        if (r.secondId && !lv2.includes(r.secondId)) lv2.push(r.secondId)
        if (r.thirdId && !lv3.includes(r.thirdId)) lv3.push(r.thirdId)
      }
    }
  }

  if (!matched) return null
  return { names, lv2, lv3, matched }
}

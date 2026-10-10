"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftRight, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, Flame,
  Heart, Package, ShoppingCart, ShieldCheck, X, Zap,
  BadgeCheck, Truck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart as addLine, cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import { openCartPopup, openQuickView } from "@/lib/marketplace-events"
import {
  MARKETPLACE_BRAND, MARKETPLACE_HERO, supplierDisplayName, type DemoProduct,
} from "@/lib/marketplace"
import { EMPTY_BANNERS, parseBanners, type MarketBanners } from "@/lib/marketplace-banners"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { MarketplaceHeader, MarketplaceFooter } from "./marketplace-header"
import { FeaturePanels } from "./feature-panels"
import { CategoryShowcase } from "./category-showcase"
import { ShopCollections, type CollectionItem } from "./shop-collections"
import { BrandRail } from "./brand-rail"
import { MarketPrice } from "./market-price"

interface DbProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  affiliate_link: string
  original_price: number | null
  sale_price: number | null
  program_key: string | null
  is_featured: boolean
  stock?: number | null
  clicks?: number | null
  category_slug?: string | null
  subcategory_slug?: string | null
}

// Calm-at-rest storefront card: image, short title, price.
// Cart / wishlist / quick-view / compare icons reveal on hover
// (always visible on touch screens where hover doesn't exist).
function ProductCard({ p, onAdd, wished, onWish, added, href }: { p: DemoProduct; onAdd: () => void; wished: boolean; onWish: () => void; added: boolean; href?: string }) {
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  const [compared, setCompared] = useState(() => !!readCompare()[p.id])
  const toggleCompare = () => setCompared(toggleCompareStored(p.id))
  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.15)] backdrop-blur-sm transition-all hover:scale-105 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B] active:scale-95"
  const rail = (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-md:translate-y-0 max-md:opacity-100">
      <button
        type="button"
        onClick={onWish}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
        title="Wishlist"
        className={`${iconBtn} ${wished ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
      >
        <Heart className={`h-[18px] w-[18px] ${wished ? "fill-current" : ""}`} />
      </button>
      {href ? (
        <button
          type="button"
          onClick={() => openQuickView(p.id)}
          aria-label={`Quick view ${p.name}`}
          title="Quick view"
          className={iconBtn}
        >
          <Eye className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <span className={`${iconBtn} opacity-50`} aria-hidden>
          <Eye className="h-[18px] w-[18px]" />
        </span>
      )}
      <button
        type="button"
        onClick={toggleCompare}
        aria-label={compared ? "Remove from compare" : "Add to compare"}
        aria-pressed={compared}
        title="Compare"
        className={`${iconBtn} ${compared ? "!bg-[#0F172A] !text-white" : ""}`}
      >
        <ArrowLeftRight className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
  const slideUpAdd = (
    <div className="absolute inset-x-3 bottom-3 z-10 translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 max-md:hidden">
      <button
        type="button"
        onClick={onAdd}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-[0_8px_24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-colors active:scale-[0.99] ${added ? "bg-[#0B0F19]/95 text-white" : "bg-white/95 text-[#0F172A] hover:bg-[#F59E0B]"}`}
      >
        {added ? <><Check className="h-4 w-4" strokeWidth={3} /> Added to bag</> : <><ShoppingCart className="h-4 w-4" /> Add to Bag</>}
      </button>
    </div>
  )
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)]">
      <div className="relative aspect-square w-full overflow-hidden bg-[#F8FAFC]">
        {href ? (
          <Link href={href} aria-label={p.name} className="block h-full w-full">
            {p.image ? (
              <img src={marketImage(p.image)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="flex h-full w-full items-center justify-center" aria-hidden>
                <Package className="h-12 w-12 text-slate-200" />
              </span>
            )}
          </Link>
        ) : (
          <div className="h-full w-full">
            {p.image ? (
              <img src={marketImage(p.image)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="flex h-full w-full items-center justify-center" aria-hidden>
                <Package className="h-12 w-12 text-slate-200" />
              </span>
            )}
          </div>
        )}
        {discount > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#DC2626] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm">-{discount}%</span>
        )}
        {rail}
        {slideUpAdd}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {href ? (
          <Link href={href} title={p.name} className="block min-w-0">
            <h5 className="truncate text-[13px] font-semibold leading-snug text-[#0F172A] transition-colors group-hover:text-[#B45309]">{p.name}</h5>
          </Link>
        ) : (
          <h5 title={p.name} className="truncate text-[13px] font-semibold leading-snug text-[#0F172A]">{p.name}</h5>
        )}
        <div className="flex items-baseline gap-1.5">
          <MarketPrice usd={p.price} className={`text-[15px] font-extrabold tabular-nums ${discount > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`} />
          {p.oldPrice && <MarketPrice usd={p.oldPrice} className="text-[11px] tabular-nums text-slate-400 line-through" />}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-colors active:scale-[0.99] md:hidden ${added ? "bg-[#0B0F19] text-white" : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"}`}
        >
          {added ? <><Check className="h-4 w-4" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-4 w-4" /> Add</>}
        </button>
      </div>
    </div>
  )
}

function useCountdown() {
  // Single countdown value — never call setState inside another setState
  // updater (impure updaters cascade extra renders under StrictMode).
  const [left, setLeft] = useState(9 * 3600 + 52 * 60 + 59)
  useEffect(() => {
    const t = setInterval(() => {
      setLeft((v) => (v > 0 ? v - 1 : 9 * 3600 + 52 * 60 + 59))
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, "0")
  return { days: "02", hrs: pad(Math.floor(left / 3600)), mins: pad(Math.floor((left % 3600) / 60)), secs: pad(left % 60) }
}

const WISH_KEY = "tp_market_wish_v1"
const RECENT_KEY = "tp_market_recent_v1"

function readWish(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(WISH_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Object.fromEntries((Array.isArray(arr) ? arr : []).map((id) => [id, true]))
  } catch {
    return {}
  }
}

function readRecentIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

function discountRateOf(p: { price: number; oldPrice?: number }): number {
  return p.oldPrice && p.oldPrice > p.price ? 1 - p.price / p.oldPrice : 0
}

// Take up to n items from pool, skipping (and recording) IDs already used
// by an earlier homepage section. Mutates `used`.
function takeFresh<T extends { id: string }>(pool: T[], used: Set<string>, n: number): T[] {
  const out: T[] = []
  for (const p of pool) {
    if (out.length >= n) break
    if (!used.has(p.id)) {
      out.push(p)
      used.add(p.id)
    }
  }
  return out
}

interface RevStat { sum: number; n: number }

export function MarketplaceHome() {
  const router = useRouter()
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([])
  const [revStats, setRevStats] = useState<Record<string, RevStat>>({})
  const [tab, setTab] = useState<"new" | "featured" | "best">("new")
  const cart = useMarketCart()
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({})
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({})
  const trendRailRef = useRef<HTMLDivElement>(null)
  const storesRailRef = useRef<HTMLDivElement>(null)
  const trendPauseRef = useRef(false)
  const storesPauseRef = useRef(false)

  // Auto-moving rails — glide on their own, pause while touched, wrap
  // around at the end for a non-stop loop feel.
  useEffect(() => {
    const glide = (el: HTMLDivElement | null) => {
      if (!el || document.hidden) return
      const max = el.scrollWidth - el.clientWidth - 8
      if (max <= 0) return
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: "smooth" })
      else el.scrollBy({ left: 240, behavior: "smooth" })
    }
    const t = setInterval(() => {
      if (!trendPauseRef.current) glide(trendRailRef.current)
      if (!storesPauseRef.current) glide(storesRailRef.current)
    }, 2800)
    return () => clearInterval(t)
  }, [])
  const [query, setQuery] = useState("")
  // Per-visit welcome popup — shows on every visit (dismissal is
  // intentionally not persisted). Closable via X, backdrop or Escape.
  const [showNotice, setShowNotice] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowNotice(true), 1000)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!showNotice) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNotice(false)
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [showNotice])
  const [banners, setBanners] = useState<MarketBanners>({ ...EMPTY_BANNERS, departments: {} })
  // First-paint gate: while the live catalog hasn't arrived yet, render
  // neutral skeletons instead of fallback/empty designs — so visitors
  // never see a previous design flash before the current one paints.
  const [loaded, setLoaded] = useState(false)
  // Collection-cover rotation: every 30s the tiles re-deal from each
  // node's own live photos, so covers change on their own over time.
  const [rot, setRot] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) setRot((r) => r + 1)
    }, 30000)
    return () => clearInterval(t)
  }, [])
  const t = useCountdown()

  useEffect(() => {
    setWishlist(readWish())
    setRecentIds(readRecentIds())
    // Header search on other store pages lands here as /marketplace?q=...
    try {
      const q = new URLSearchParams(window.location.search).get("q")
      if (q) {
        setQuery(q)
        setTimeout(() => document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400)
      }
    } catch {
      // ignore malformed query strings
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let alive = true
    const load = () => {
      supabase
        .from("affiliate_products")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(120)
        .then(({ data }) => {
          if (!alive) return
          if (data) setDbProducts(data as DbProduct[])
          setLoaded(true)
        })
      // Real review aggregates for honest ratings (public read policy).
      supabase
        .from("marketplace_reviews")
        .select("product_id,rating")
        .limit(500)
        .then(({ data }) => {
          if (!alive || !data) return
          const m: Record<string, RevStat> = {}
          for (const r of data as Array<{ product_id: string; rating: number }>) {
            const cur = m[r.product_id] || { sum: 0, n: 0 }
            cur.sum += Number(r.rating) || 0
            cur.n += 1
            m[r.product_id] = cur
          }
          setRevStats(m)
        })
      // Admin-custom storefront banners (public site_settings read).
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketplace_banners")
        .maybeSingle()
        .then(({ data }) => {
          if (alive && data) setBanners(parseBanners((data as { value?: unknown }).value))
        })
    }
    load()
    const ch = supabase
      .channel(`market_home_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .subscribe()
    const poll = setInterval(load, 30000)
    const onFocus = () => {
      load()
      setRecentIds(readRecentIds())
    }
    window.addEventListener("focus", onFocus)
    return () => {
      alive = false
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
    }
  }, [])

  // Live catalog only — no demo products. Ratings/reviews come from real
  // marketplace_reviews rows; unrated products show as New.
  const liveProducts: DemoProduct[] = useMemo(
    () =>
      dbProducts.map((d) => {
        const st = revStats[d.id]
        return {
          id: d.id,
          name: cleanSupplierText(d.product_name) || d.product_name,
          category: supplierDisplayName(d.program_key),
          price: Number(d.sale_price ?? d.original_price ?? 0),
          oldPrice: d.original_price && Number(d.original_price) > Number(d.sale_price ?? d.original_price ?? 0)
            ? Number(d.original_price)
            : undefined,
          rating: st && st.n > 0 ? st.sum / st.n : 0,
          reviews: st?.n ?? 0,
          image: d.product_image_url || "",
          badge: d.is_featured ? "Featured" : undefined,
        }
      }),
    [dbProducts, revStats]
  )

  const grid: DemoProduct[] = liveProducts
  // Homepage allocation — every product appears in ONE section only.
  // Order: flash → featured → new → best → trending, each skipping IDs
  // already taken, so rails never repeat each other. (The tabbed grid
  // re-uses these same lists as alternative catalog views — that overlap
  // is intentional.) Best sellers fall back to most-clicked / biggest
  // discount while no reviews exist yet, so all three panels always show.
  const clicksById = new Map<string, number>(
    dbProducts.map((d) => [d.id, Number(d.clicks) || 0])
  )
  const usedIds = new Set<string>()
  const flashItems = takeFresh(
    [...grid].sort((a, b) => discountRateOf(b) - discountRateOf(a)),
    usedIds,
    4
  )
  const featured = takeFresh(
    grid.filter((p) => p.badge === "Featured"),
    usedIds,
    6
  )
  const newArrivals = takeFresh(grid, usedIds, 6)
  const bestPool = [...grid].sort(
    (a, b) =>
      b.reviews - a.reviews ||
      (clicksById.get(b.id) || 0) - (clicksById.get(a.id) || 0) ||
      discountRateOf(b) - discountRateOf(a) ||
      b.rating - a.rating
  )
  const best = takeFresh(bestPool, usedIds, 6)
  const trending = [...grid]
    .filter((p) => !usedIds.has(p.id))
    .sort(
      (a, b) =>
        (clicksById.get(b.id) || 0) - (clicksById.get(a.id) || 0) ||
        discountRateOf(b) - discountRateOf(a)
    )
    .slice(0, 12)
  trending.forEach((p) => usedIds.add(p.id))
  const tabShown = tab === "new" ? newArrivals : tab === "featured" ? featured : best

  const q = query.trim().toLowerCase()
  const descById = useMemo(
    () => new Map(dbProducts.map((d) => [d.id, `${d.product_name} ${d.product_description || ""}`.toLowerCase()])),
    [dbProducts]
  )
  const matchQuery = (p: DemoProduct) =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (descById.get(p.id) || "").includes(q)
  const deptOf = useMemo(() => {
    const m = new Map<string, string>()
    dbProducts.forEach((d) => {
      const slug = d.category_slug || d.subcategory_slug
      if (!slug) return
      const dept = MARKET_DEPARTMENTS.find((dep) => dep.slug === slug || dep.subs.some((s) => s.slug === slug))
      if (dept) m.set(d.id, dept.slug)
    })
    return m
  }, [dbProducts])
  const shown = tabShown.filter((p) => matchQuery(p))
  const filtering = q.length > 0
  const tabEmpty = !filtering && tab !== "new" && tabShown.length === 0
  const wishCount = Object.values(wishlist).filter(Boolean).length

  // Top stores: one tile per stocked subcategory (not per department),
  // so the rail has ~25 distinct tiles and scrolls well. Cover = that
  // subcategory's first live product photo — never a repeated generic.
  const vendors = useMemo(() => {
    const bySub = new Map<string, DbProduct[]>()
    dbProducts.forEach((d) => {
      const key = d.subcategory_slug || d.category_slug
      if (!key) return
      const list = bySub.get(key) || []
      list.push(d)
      bySub.set(key, list)
    })
    const out: Array<{ name: string; short: string; dept: string; slug: string; icon: string; cover: string }> = []
    MARKET_DEPARTMENTS.forEach((dep) => {
      dep.subs.forEach((s) => {
        const items = bySub.get(s.slug) || []
        if (items.length === 0) return
        out.push({
          name: s.name,
          short: s.name,
          dept: dep.name,
          slug: s.slug,
          icon: dep.icon,
          cover: items.find((d) => d.product_image_url)?.product_image_url || dep.image,
        })
      })
    })
    return out
  }, [dbProducts])

  // Real product photo per department for Shop-by-Department tiles
  // (CJ-style: actual catalog photos, not generic stock).
  const deptCover = useMemo(() => {
    const m = new Map<string, string>()
    dbProducts.forEach((d) => {
      const slug = deptOf.get(d.id)
      if (!slug || m.has(slug) || !d.product_image_url) return
      m.set(slug, d.product_image_url)
    })
    return m
  }, [dbProducts, deptOf])

  const heroImg = banners.hero_image || MARKETPLACE_HERO.image
  const promoImg = banners.promo_image || ""

  // Shop By Collections: a curated 12 — the 5 departments plus the 7
  // subcategories closest to a classic marketplace mix. Real nodes only.
  const COLLECTION_SLUGS = useMemo(
    () => [
      "consumer-electronics",
      "phones-accessories",
      "computer-office",
      "automobiles-motorcycles",
      "home-improvement",
      "smart-electronics",
      "camera-photo",
      "video-games",
      "mobile-phones",
      "portable-audio-video",
      "home-audio-video",
      "laptops-tablets",
    ],
    []
  )
  const collections = useMemo<CollectionItem[]>(() => {
    // Candidate product images per node, in preference order.
    const subImgs = new Map<string, string[]>()
    dbProducts.forEach((d) => {
      const key = d.subcategory_slug || d.category_slug
      if (key && d.product_image_url) {
        const list = subImgs.get(key) || []
        if (!list.includes(d.product_image_url)) list.push(d.product_image_url)
        subImgs.set(key, list)
      }
    })
    const deptImgs = new Map<string, string[]>()
    dbProducts.forEach((d) => {
      const slug = deptOf.get(d.id)
      if (slug && d.product_image_url) {
        const list = deptImgs.get(slug) || []
        if (!list.includes(d.product_image_url)) list.push(d.product_image_url)
        deptImgs.set(slug, list)
      }
    })
    const allImgs: string[] = []
    dbProducts.forEach((d) => {
      if (d.product_image_url && !allImgs.includes(d.product_image_url)) allImgs.push(d.product_image_url)
    })
    // Globally unique tile images: walk the 12 tiles in order, each takes
    // the first candidate no other tile has used yet — so two different
    // categories can never show the same photo. Candidate pools rotate
    // with `rot`, so every 30s each tile re-deals a (possibly) new photo
    // from its own node's live stock.
    const used = new Set<string>()
    const spin = (list: string[]): string[] => {
      if (list.length < 2 || rot === 0) return list
      const k = rot % list.length
      return [...list.slice(k), ...list.slice(0, k)]
    }
    const claim = (cands: string[], fallback: string): string => {
      const pool = spin(cands)
      const img = pool.find((c) => !used.has(c)) || spin(allImgs).find((c) => !used.has(c)) || cands[0] || fallback
      used.add(img)
      return img
    }
    const bySlug = new Map<string, CollectionItem>()
    MARKET_DEPARTMENTS.forEach((dep) => {
      const stock = banners.departments[dep.slug] || dep.image
      bySlug.set(dep.slug, {
        name: dep.name,
        slug: dep.slug,
        href: `/marketplace/category/${dep.slug}`,
        image: claim(deptImgs.get(dep.slug) || [], stock),
      })
      dep.subs.forEach((s) => {
        bySlug.set(s.slug, {
          name: s.name,
          slug: s.slug,
          href: `/marketplace/category/${s.slug}`,
          image: claim([...(subImgs.get(s.slug) || []), ...(deptImgs.get(dep.slug) || [])], stock),
        })
      })
    })
    return COLLECTION_SLUGS.map((slug) => bySlug.get(slug)).filter((c): c is CollectionItem => !!c)
  }, [dbProducts, banners, deptOf, COLLECTION_SLUGS, rot])

  // Showcase sections: the 4 departments with the most live stock. Each
  // gets the showcase treatment with its stocked subcategories as pills.
  // Items are drawn from products not shown in any rail
  // above — distinct everywhere — topped up from the department shelf so
  // no section looks thin. Strict stored-category match only: a product
  // lives in exactly one department, so it can never appear under a
  // department it doesn't belong to.
  const dbById = new Map(dbProducts.map((d) => [d.id, d]))
  // Showcase order: Phones always leads (the store's signature section),
  // followed by the 3 departments with the most live stock.
  const rankedDepts = MARKET_DEPARTMENTS.map((dep) => ({
    dep,
    count: grid.filter((p) => deptOf.get(p.id) === dep.slug).length,
  })).sort((a, b) => b.count - a.count)
  const showcaseOrder = [
    ...rankedDepts.filter((r) => r.dep.slug === "phones-accessories"),
    ...rankedDepts.filter((r) => r.dep.slug !== "phones-accessories").slice(0, 3),
  ].map((r) => r.dep)
  const showcases = showcaseOrder
    .map((dep) => {
      const shelf = grid
        .filter((p) => deptOf.get(p.id) === dep.slug)
        .map((p) => {
          const d = dbById.get(p.id)
          return { ...p, subSlug: d?.subcategory_slug || d?.category_slug || null }
        })
      const counts = new Map<string, number>()
      shelf.forEach((p) => {
        if (p.subSlug) counts.set(p.subSlug, (counts.get(p.subSlug) || 0) + 1)
      })
      const nav = dep.subs
        .filter((s) => (counts.get(s.slug) || 0) > 0)
        .map((s) => ({ name: s.name, slug: s.slug }))
      let items = shelf.filter((p) => !usedIds.has(p.id))
      if (items.length < 4) {
        const have = new Set(items.map((p) => p.id))
        for (const p of shelf) {
          if (items.length >= 10) break
          if (!have.has(p.id)) {
            items.push(p)
            have.add(p.id)
          }
        }
      } else {
        items = items.slice(0, 10)
      }
      items.forEach((p) => usedIds.add(p.id))
      return { dep, nav, items }
    })
    .filter((x) => x.items.length > 0)

  // Real recently-viewed products (recorded by product pages locally).
  const recentRows = useMemo(
    () =>
      recentIds
        .map((id) => dbProducts.find((d) => d.id === id))
        .filter((d): d is DbProduct => !!d)
        .slice(0, 4),
    [recentIds, dbProducts]
  )

  const cartCount = countLines(cart)
  const cartTotal = cart.reduce((sum, l) => {
    const found = dbProducts.find((d) => d.id === l.id)
    const unit = found ? Number(found.sale_price ?? found.original_price ?? 0) : 0
    return Math.round((sum + unit * l.qty) * 100) / 100
  }, 0)

  const addToCart = (p: DemoProduct) => {
    if (!/^[0-9a-f-]{36}$/i.test(p.id)) return
    addLine(p.id, 1)
    setJustAdded((m) => ({ ...m, [p.id]: true }))
    setTimeout(() => setJustAdded((m) => ({ ...m, [p.id]: false })), 1600)
    openCartPopup(p.id)
  }
  const toggleWish = (id: string) =>
    setWishlist((m) => {
      const next = { ...m, [id]: !m[id] }
      if (!next[id]) delete next[id]
      try {
        window.localStorage.setItem(WISH_KEY, JSON.stringify(Object.keys(next)))
      } catch {
        // ignore
      }
      return next
    })
  const liveHref = (p: DemoProduct) =>
    /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const cardProps = (p: DemoProduct) => ({
    p,
    onAdd: () => addToCart(p),
    wished: !!wishlist[p.id],
    onWish: () => toggleWish(p.id),
    added: !!justAdded[p.id],
    href: liveHref(p),
  })

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen overflow-x-clip">
      <MarketplaceHeader
        cartCount={cartCount}
        cartTotal={`$${cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        wishCount={wishCount}
        onSearch={(v) => {
          setQuery(v)
          if (v.trim()) document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        onShopDept={(slug) => {
          if (slug) router.push(`/marketplace/category/${slug}`)
          else router.push("/marketplace")
        }}
      />
      <main className="mx-auto w-full max-w-[1480px] px-3 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* welcome popup — shows on every visit, closable */}
        {showNotice && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome offer">
            <button
              type="button"
              aria-label="Dismiss notice"
              onClick={() => setShowNotice(false)}
              className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-[2px]"
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="relative p-6 text-white" style={{ background: "linear-gradient(140deg, #0F172A 0%, #7F1D1D 100%)" }}>
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-2xl" />
                <button
                  type="button"
                  onClick={() => setShowNotice(false)}
                  aria-label="Close popup"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="inline-block bg-[#DC2626] text-white text-[11px] font-bold uppercase px-2.5 py-1 rounded-md">
                  Welcome Offer
                </span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                  Welcome to <span className="text-[#F59E0B]">TechPivo Market</span>
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  Quality-checked products, secure payment and tracked delivery.
                </p>
              </div>
              <div className="space-y-2 p-6">
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#10B981]" /> Secure payment on every order
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[#F59E0B]" /> Quality-checked products
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Truck className="h-4 w-4 shrink-0 text-[#0F172A]" /> Tracked 7–12 day delivery
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <Link
                    href="#flash-deals"
                    onClick={() => setShowNotice(false)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
                  >
                    Explore Now <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowNotice(false)}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0F172A]"
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* hero — roomy landscape strip: full-width presence at ~180px
            so Shop By Collections follows right below. Side promos always
            show as rows; your uploaded banner replaces ONLY the main card. */}
        <section className="-mt-6 sm:-mt-8 w-[100vw] ml-[calc(50%-50vw)] pl-3 sm:pl-5">
        <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {!loaded ? (
          <div className="lg:col-span-8 rounded-none bg-white shadow-sm h-[340px] animate-pulse" aria-hidden>
            <div className="h-full w-full bg-slate-100" />
          </div>
        ) : banners.hero_image ? (
          <div className="lg:col-span-8 overflow-hidden rounded-none bg-white shadow-sm">
            <Link href="#trending" aria-label="Shop TechPivo Market" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={marketImage(banners.hero_image)}
                alt="TechPivo Market — shop the collection"
                className="block h-[340px] w-full object-cover object-center"
                loading="eager"
                decoding="async"
              />
            </Link>
          </div>
        ) : (
          <div className="lg:col-span-8 rounded-none relative overflow-hidden text-white min-h-[340px] flex items-center" style={{ background: MARKETPLACE_BRAND.navy }}>
            <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex w-full flex-wrap items-center gap-x-6 gap-y-3 px-5 md:px-8 py-6">
              <div className="hidden sm:block h-40 w-40 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                <img src={heroImg} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                {banners.promo_enabled !== false && (
                  <span className="text-[#EF4444] text-xs font-bold tracking-wide uppercase">{MARKETPLACE_HERO.kicker}</span>
                )}
                <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">
                  {MARKETPLACE_HERO.titleA} <span className="text-[#F59E0B]">{MARKETPLACE_HERO.titleB}</span>
                </h1>
                <p className="mt-0.5 text-[13px] text-slate-300 line-clamp-1">{MARKETPLACE_HERO.copy}</p>
              </div>
              <span className="text-2xl font-extrabold whitespace-nowrap">{MARKETPLACE_HERO.price}</span>
              <Link href="#trending" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-3 rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0">
                Shop the Drop <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

          {/* hero side promos — rows, always shown */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Link
              href="/marketplace/deals"
              className="group relative flex-1 overflow-hidden rounded-none p-4 text-white shadow-sm transition-shadow hover:shadow-md min-h-\[162px\] flex items-center gap-3"
              style={{ background: "linear-gradient(150deg, #DC2626 0%, #991B1B 100%)" }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Flame className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold leading-tight">Mega Deal — Up to 50% Off</span>
                <span className="block text-xs text-white/80">Today only — biggest price drops</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/marketplace/new-arrivals"
              className="group relative flex-1 overflow-hidden rounded-none p-4 text-white shadow-sm transition-shadow hover:shadow-md min-h-\[162px\] flex items-center gap-3"
              style={{ background: "linear-gradient(150deg, #F59E0B 0%, #F97316 100%)" }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/20">
                <Zap className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold leading-tight">New Season Tech Drop</span>
                <span className="block text-xs text-white/85">Fresh stock, first to own</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
        </section>
        {/* shop by collections — every real category node */}
        {!loaded ? (
          <section aria-label="Loading collections" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] animate-pulse" aria-hidden>
            <div className="mb-4 h-6 w-48 rounded bg-slate-100" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[5/4] w-full rounded-xl bg-slate-100" />
                  <div className="mx-auto mt-2 h-4 w-3/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <ShopCollections collections={collections} />
        )}

        {/* flash deals — 4 live discounted products under a countdown banner */}
        {flashItems.length > 0 && (
          <section id="flash-deals" className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm scroll-mt-4">
            <div
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6"
              style={{ background: "linear-gradient(100deg, #DC2626 0%, #991B1B 100%)" }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-[#991B1B]">
                  <Flame className="h-3.5 w-3.5" /> Flash Sale
                </span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Special Offer — Up to 50% Off</h3>
                  <p className="text-xs text-white/80">Hurry — discounted stock goes fast</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5" aria-label="Offer countdown">
                {[
                  { v: t.days, l: "Days" },
                  { v: t.hrs, l: "Hrs" },
                  { v: t.mins, l: "Min" },
                  { v: t.secs, l: "Sec" },
                ].map((x, i, arr) => (
                  <span key={x.l} className="flex items-center gap-1.5">
                    <span className="min-w-12 rounded-lg bg-white/15 px-2 py-1.5 text-center backdrop-blur-sm">
                      <span className="block text-lg font-extrabold tabular-nums text-white">{x.v}</span>
                      <span className="block text-[9px] font-bold uppercase text-white/75">{x.l}</span>
                    </span>
                    {i < arr.length - 1 && <span className="font-bold text-white/60">:</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-4">
              {flashItems.map((p) => (
                <ProductCard key={p.id} {...cardProps(p)} />
              ))}
            </div>
          </section>
        )}

        {/* tabbed products — live catalog */}
        <section id="trending" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] scroll-mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl overflow-x-auto">
              {([
                { id: "new", label: "New Arrivals" },
                { id: "featured", label: "Featured Products" },
                { id: "best", label: "Best Selling" },
              ] as const).map((b) => (
                <button
                  key={b.id}
                  onClick={() => setTab(b.id)}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${tab === b.id ? "text-white bg-[#DC2626]" : "text-slate-500 hover:text-[#0F172A]"}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">
              Shop the collection
            </span>
          </div>
          {filtering && (
            <div className="flex flex-wrap items-center gap-2 pb-3">
              {q && (
                <button
                  onClick={() => setQuery("")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 hover:bg-slate-200"
                >
                  “{query.trim()}” <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {!loaded ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 animate-pulse" aria-hidden aria-label="Loading products">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-3">
                  <div className="aspect-square w-full rounded-lg bg-slate-100" />
                  <div className="mt-3 h-4 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : shown.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              {shown.map((p) => (
                <ProductCard key={p.id} {...cardProps(p)} />
              ))}
            </div>
          ) : liveProducts.length === 0 ? (
            <div className="text-center py-10">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-[#0F172A]">Fresh stock is on the way</p>
              <p className="text-sm text-slate-500 mt-1">New picks land here as soon as they sync — browse the departments meanwhile.</p>
              <Link
                href={`/marketplace/category/${MARKET_DEPARTMENTS[0].slug}`}
                className="inline-block mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Browse departments
              </Link>
            </div>
          ) : tabEmpty ? (
            <div className="text-center py-10">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-[#0F172A]">
                {tab === "featured" ? "No featured products yet" : "No best sellers yet"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {tab === "featured"
                  ? "Hand-picked highlights land here — browse the latest arrivals meanwhile."
                  : "Top-rated picks appear here as soon as customers start reviewing."}
              </p>
              <button
                onClick={() => setTab("new")}
                className="mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Shop new arrivals
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="font-bold text-[#0F172A]">No products match your search</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search.</p>
              <button
                onClick={() => setQuery("")}
                className="mt-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* feature panels — new arrivals / featured / best selling */}
        {loaded ? (
        <FeaturePanels
          groups={[
            { title: "New Arrivals", items: newArrivals },
            { title: "Featured Products", items: featured },
            { title: "Best Selling", items: best },
          ]}
          onAdd={addToCart}
          added={justAdded}
          wished={wishlist}
          onWish={toggleWish}
        />
        ) : null}

        {/* trending slider — products not shown in any rail above */}
        {(() => {
          if (trending.length < 2) return null
          return (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
            <style>{`.trend-rail{scrollbar-width:none;-ms-overflow-style:none}.trend-rail::-webkit-scrollbar{display:none}`}</style>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[#DC2626] text-[11px] font-bold uppercase tracking-wider block">Most viewed right now</span>
                <h2 className="text-lg font-bold text-[#0F172A]">Trending Now</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById("trend-rail")?.scrollBy({ left: -320, behavior: "smooth" })}
                  aria-label="Scroll trending products left"
                  className="w-9 h-9 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center text-[#0F172A] hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("trend-rail")?.scrollBy({ left: 320, behavior: "smooth" })}
                  aria-label="Scroll trending products right"
                  className="w-9 h-9 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center text-[#0F172A] hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              id="trend-rail"
              className="trend-rail flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
              ref={trendRailRef}
              onMouseEnter={() => { trendPauseRef.current = true }}
              onMouseLeave={() => { trendPauseRef.current = false }}
              onTouchStart={() => { trendPauseRef.current = true }}
              onTouchEnd={() => { trendPauseRef.current = false }}
            >
              {trending.map((p) => (
                <div key={p.id} className="w-44 sm:w-52 shrink-0 snap-start">
                  <ProductCard {...cardProps(p)} />
                </div>
              ))}
            </div>
          </section>
          )
        })()}

        {/* department showcases — top departments by live stock, each with
            subcategory pills, a photo promo banner, and its own distinct products */}
        {loaded ? showcases.map(({ dep, nav, items }) => (
          <CategoryShowcase
            key={dep.slug}
            title={dep.name}
            deptSlug={dep.slug}
            nav={nav}
            items={items}
            promoImage={banners.departments[dep.slug] || deptCover.get(dep.slug) || dep.image}
            onAdd={addToCart}
            added={justAdded}
            wished={wishlist}
            onWish={toggleWish}
          />
        )) : null}

        {/* top stores — same card style as collections, as a slider */}
        {vendors.length > 0 && (
          <section id="vendors" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] scroll-mt-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[#DC2626] text-[11px] font-bold uppercase tracking-wider block">Top rated this week</span>
                <h2 className="text-lg font-bold text-[#0F172A]">Top Stores</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => storesRailRef.current?.scrollBy({ left: -480, behavior: "smooth" })}
                  aria-label="Scroll top stores left"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] transition-colors hover:border-[#F59E0B]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => storesRailRef.current?.scrollBy({ left: 480, behavior: "smooth" })}
                  aria-label="Scroll top stores right"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] transition-colors hover:border-[#F59E0B]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={storesRailRef}
              className="flex gap-3 overflow-x-auto pb-1 snap-x"
              style={{ scrollbarWidth: "thin" }}
              onMouseEnter={() => { storesPauseRef.current = true }}
              onMouseLeave={() => { storesPauseRef.current = false }}
              onTouchStart={() => { storesPauseRef.current = true }}
              onTouchEnd={() => { storesPauseRef.current = false }}
            >
              {vendors.map((v) => (
                <Link
                  key={v.slug}
                  href={`/marketplace/category/${v.slug}`}
                  title={v.name}
                  aria-label={`${v.name} store`}
                  className="group block w-40 shrink-0 snap-start sm:w-48"
                >
                  <span className="block aspect-[5/4] w-full overflow-hidden rounded-xl bg-[#F1F5F9] transition-colors group-hover:bg-[#E8EEF4]">
                    {v.cover ? (
                      <img src={marketImage(v.cover)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : null}
                  </span>
                  <span className="mt-2 block truncate text-center text-[13px] font-medium text-slate-700 transition-colors group-hover:text-[#B45309]">
                    {v.short}
                  </span>
                  <span className="block truncate text-center text-[11px] text-slate-400">
                    {v.dept}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* promo banner — admin-custom image or default gradient.
            Hidden publicly while the admin's Black Friday promo toggle is OFF. */}
        {banners.promo_enabled !== false && (
        <section
          className="rounded-2xl overflow-hidden p-6 md:p-8 text-[#0F172A] relative"
          style={promoImg
            ? { background: `linear-gradient(100deg, rgba(15,23,42,0.88) 20%, rgba(15,23,42,0.45) 60%, rgba(15,23,42,0.15) 100%), url(${promoImg}) center/cover no-repeat` }
            : { background: "linear-gradient(120deg, #F59E0B 0%, #F97316 55%, #EF4444 100%)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-3 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-white flex flex-col items-center justify-center bg-black/15 text-white">
                <span className="text-3xl font-extrabold leading-none">50%</span>
                <span className="text-[11px] font-bold uppercase">OFF PROMO</span>
              </div>
            </div>
            <div className="md:col-span-6 text-center md:text-left space-y-1.5">
              <span className="bg-[#0F172A] text-white text-[11px] font-bold uppercase px-2 py-0.5 rounded">Major Appliance Drop</span>
              <h3 className="text-2xl font-bold tracking-tight text-white">TechPivo Home Essentials — Washer & Smart Devices</h3>
              <p className="text-white/85">Top-brand high-efficiency smart home devices at seasonal prices.</p>
            </div>
            <div className="md:col-span-3 flex items-center justify-center md:justify-end">
              <Link
                href="/marketplace/category/home-appliances"
                className="bg-[#0F172A] hover:bg-black text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                Shop Appliances
              </Link>
            </div>
          </div>
        </section>
        )}

        {/* brands — live catalog brands only, with loading skeleton */}
        {!loaded ? (
          <section aria-label="Loading brands" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] animate-pulse" aria-hidden>
            <div className="mb-4 h-6 w-40 rounded bg-slate-100" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-[92px] w-36 shrink-0 rounded-xl bg-slate-100" />
              ))}
            </div>
          </section>
        ) : (
          <BrandRail products={dbProducts} />
        )}

        {/* recently viewed — real local history */}
        {recentRows.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">Recently Viewed Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentRows.map((d) => {
                const price = Number(d.sale_price ?? d.original_price ?? 0)
                return (
                  <Link key={d.id} href={`/marketplace/product/${d.id}`} className="flex items-center gap-3 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 transition-colors">
                    <div className="w-16 h-16 rounded-lg bg-white p-1.5 shrink-0 flex items-center justify-center border border-[#E2E8F0]">
                      {d.product_image_url ? (
                        <img src={marketImage(d.product_image_url)} alt={d.product_name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded" />
                      ) : (
                        <Package className="h-7 w-7 text-slate-200" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-sm font-semibold text-[#0F172A] line-clamp-1">{d.product_name}</h5>
                      <MarketPrice usd={price} className="text-sm font-bold text-[#EF4444]" />
                      <span className="block text-[10px] text-[#10B981] font-medium">Tracked delivery</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* store promise */}
        <p className="text-center text-[11px] text-slate-400 px-4">
          Every order is quality-checked, securely paid and delivered with tracking — shop with confidence on TechPivo Market.
        </p>
      </main>
      <MarketplaceFooter />
    </div>
  )
}

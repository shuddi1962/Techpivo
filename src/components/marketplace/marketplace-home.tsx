"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftRight, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, Flame,
  Heart, Package, ShoppingCart, ShieldCheck, X, Zap,
  BadgeCheck, Truck, Cpu, Smartphone, Laptop, Car, Wrench,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart as addLine, cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import {
  MARKETPLACE_BRAND, MARKETPLACE_HERO, supplierDisplayName, type DemoProduct,
} from "@/lib/marketplace"
import { EMPTY_BANNERS, parseBanners, type MarketBanners } from "@/lib/marketplace-banners"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import { MarketplaceHeader, MarketplaceFooter } from "./marketplace-header"
import { FeaturePanels } from "./feature-panels"
import { CategoryShowcase } from "./category-showcase"
import { ShopCollections, type CollectionItem } from "./shop-collections"

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
  category_slug?: string | null
  subcategory_slug?: string | null
}

const COMPARE_KEY = "tp_market_compare_v1"

function readCompare(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Object.fromEntries((Array.isArray(arr) ? arr : []).map((id) => [id, true]))
  } catch {
    return {}
  }
}

// Calm-at-rest storefront card: image, short title, price.
// Cart / wishlist / quick-view / compare icons reveal on hover
// (always visible on touch screens where hover doesn't exist).
function ProductCard({ p, onAdd, wished, onWish, added, href }: { p: DemoProduct; onAdd: () => void; wished: boolean; onWish: () => void; added: boolean; href?: string }) {
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  const [compared, setCompared] = useState(() => !!readCompare()[p.id])
  const toggleCompare = () => {
    setCompared((v) => {
      const next = !v
      try {
        const cur = readCompare()
        if (next) cur[p.id] = true
        else delete cur[p.id]
        window.localStorage.setItem(COMPARE_KEY, JSON.stringify(Object.keys(cur)))
      } catch {
        // storage blocked — visual state still toggles
      }
      return next
    })
  }
  const railBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B]"
  const rail = (
    <div className="absolute right-2.5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 opacity-0 translate-x-3 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 max-md:translate-x-0 max-md:opacity-100">
      <button
        type="button"
        onClick={onAdd}
        aria-label={added ? "Added to cart" : `Add ${p.name} to cart`}
        title={added ? "Added to cart" : "Add to cart"}
        className={`${railBtn} ${added ? "!bg-[#10B981] !text-white" : "hover:!bg-[#F59E0B]"}`}
      >
        {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onWish}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
        title="Wishlist"
        className={`${railBtn} ${wished ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
      </button>
      {href ? (
        <Link href={href} aria-label={`Quick view ${p.name}`} title="Quick view" className={railBtn}>
          <Eye className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${railBtn} opacity-50`} aria-hidden>
          <Eye className="h-4 w-4" />
        </span>
      )}
      <button
        type="button"
        onClick={toggleCompare}
        aria-label={compared ? "Remove from compare" : "Add to compare"}
        aria-pressed={compared}
        title="Compare"
        className={`${railBtn} ${compared ? "!bg-[#0F172A] !text-white" : ""}`}
      >
        <ArrowLeftRight className="h-4 w-4" />
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
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#DC2626] px-2 py-1 text-[10px] font-extrabold tracking-wide text-white shadow-sm">-{discount}%</span>
        )}
        {rail}
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
          <span className={`text-[15px] font-extrabold tabular-nums ${discount > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}>${p.price.toFixed(2)}</span>
          {p.oldPrice && <span className="text-[11px] tabular-nums text-slate-400 line-through">${p.oldPrice.toFixed(2)}</span>}
        </div>
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

  // Auto-moving product rail — glides on its own, pauses while touched.
  useEffect(() => {
    const t = setInterval(() => {
      const el = trendRailRef.current
      if (!el || trendPauseRef.current || document.hidden) return
      const max = el.scrollWidth - el.clientWidth - 8
      if (max <= 0) return
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: "smooth" })
      else el.scrollBy({ left: 240, behavior: "smooth" })
    }, 2800)
    return () => clearInterval(t)
  }, [])
  const [query, setQuery] = useState("")
  const [vendorFilter, setVendorFilter] = useState<string | null>(null)
  const [banners, setBanners] = useState<MarketBanners>({ ...EMPTY_BANNERS, departments: {} })
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
        .limit(24)
        .then(({ data }) => {
          if (alive && data) setDbProducts(data as DbProduct[])
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
  // Strict per-tab lists — each tab shows genuinely different products so
  // switching tabs always changes the grid (no silent backfilling).
  const newArrivals = grid.slice(0, 6)
  const featured = grid.filter((p) => p.badge === "Featured").slice(0, 6)
  const best = [...grid]
    .filter((p) => p.reviews > 0)
    .sort((a, b) => b.reviews - a.reviews || b.rating - a.rating)
    .slice(0, 6)
  const tabShown = tab === "new" ? newArrivals : tab === "featured" ? featured : best

  const q = query.trim().toLowerCase()
  const matchQuery = (p: DemoProduct) =>
    !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  const matchVendor = (p: DemoProduct) => !vendorFilter || p.category === vendorFilter
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
  const shown = tabShown.filter((p) => matchQuery(p) && matchVendor(p))
  const filtering = q.length > 0 || vendorFilter !== null
  const tabEmpty = !filtering && tab !== "new" && tabShown.length === 0
  const wishCount = Object.values(wishlist).filter(Boolean).length

  // Top stores: icon-led department tiles (no store names, no counts).
  const vendors = useMemo(() => {
    const byDept = new Map<string, DbProduct[]>()
    dbProducts.forEach((d) => {
      const slug = deptOf.get(d.id)
      if (!slug) return
      const list = byDept.get(slug) || []
      list.push(d)
      byDept.set(slug, list)
    })
    return MARKET_DEPARTMENTS.filter((dep) => (byDept.get(dep.slug) || []).length > 0).map((dep) => {
      const items = byDept.get(dep.slug) || []
      const short = dep.name.replace(/\s*&\s*/g, " & ")
      return {
        name: dep.name,
        short,
        slug: dep.slug,
        icon: dep.icon,
        cover: items.find((d) => d.product_image_url)?.product_image_url || dep.image,
      }
    })
  }, [dbProducts, deptOf])

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
    const bySub = new Map<string, string[]>()
    dbProducts.forEach((d) => {
      const key = d.subcategory_slug || d.category_slug
      if (key && d.product_image_url) {
        const list = bySub.get(key) || []
        list.push(d.product_image_url)
        bySub.set(key, list)
      }
    })
    // Prefer an image no other card has used yet, so tiles never repeat.
    const used = new Set<string>()
    const pick = (cands: string[], fallback: string): string => {
      const fresh = cands.find((c) => !used.has(c))
      const img = fresh || cands[0] || fallback
      used.add(img)
      return img
    }
    const bySlug = new Map<string, CollectionItem>()
    MARKET_DEPARTMENTS.forEach((dep) => {
      const deptImg = banners.departments[dep.slug] || deptCover.get(dep.slug) || dep.image
      used.add(deptImg)
      bySlug.set(dep.slug, { name: dep.name, slug: dep.slug, href: `/marketplace/category/${dep.slug}`, image: deptImg })
      dep.subs.forEach((s) => {
        bySlug.set(s.slug, {
          name: s.name,
          slug: s.slug,
          href: `/marketplace/category/${s.slug}`,
          image: pick(bySub.get(s.slug) || [], deptImg),
        })
      })
    })
    return COLLECTION_SLUGS.map((slug) => bySlug.get(slug)).filter((c): c is CollectionItem => !!c)
  }, [dbProducts, banners, deptCover, COLLECTION_SLUGS])

  // Smartphone & tablet showcase: live products in the phones department,
  // each tagged with its subcategory slug for the category nav.
  const phonesDept = MARKET_DEPARTMENTS.find((d) => d.slug === "phones-accessories")
  const phonesItems = useMemo(() => {
    const byId = new Map(dbProducts.map((d) => [d.id, d]))
    return grid
      .filter((p) => deptOf.get(p.id) === "phones-accessories")
      .map((p) => {
        const d = byId.get(p.id)
        return { ...p, subSlug: d?.subcategory_slug || d?.category_slug || null }
      })
  }, [grid, dbProducts, deptOf])

  // Flash deals: live discounted products first, then the rest.
  const flashItems = useMemo(
    () =>
      [...grid]
        .sort((a, b) => {
          const da = a.oldPrice && a.oldPrice > a.price ? 1 - a.price / a.oldPrice : -1
          const db = b.oldPrice && b.oldPrice > b.price ? 1 - b.price / b.oldPrice : -1
          return db - da
        })
        .slice(0, 4),
    [grid]
  )

  // Department spotlights: STRICT stored-category match only. A product
  // lives in exactly one department (its category_slug), so it can never
  // appear under a department it doesn't belong to.
  const spotDepts = useMemo(
    () =>
      MARKET_DEPARTMENTS.slice(0, 3)
        .map((dept) => ({
          dept,
          items: grid.filter((p) => deptOf.get(p.id) === dept.slug).slice(0, 5),
        }))
        .filter((x) => x.items.length > 0),
    [grid, deptOf]
  )

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
    <div className="w-full bg-[#F8FAFC] min-h-screen">
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
      <main className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* welcome strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#FED7AA] bg-gradient-to-r from-[#FFF7ED] via-white to-[#FEF2F2] p-3 sm:p-4">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <span className="bg-[#DC2626] text-white text-[11px] font-bold uppercase px-2.5 py-1 rounded-md shrink-0">Welcome Offer</span>
            <p className="text-sm text-slate-600">
              Welcome to <strong className="text-[#0F172A]">TechPivo Market</strong> — quality-checked products, secure payment and tracked delivery.
            </p>
          </div>
          <Link href="#flash-deals" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0">
            Explore Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* hero bento — side promos always show; your uploaded banner
            replaces ONLY the main navy card, shown fully (never cropped). */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {banners.hero_image ? (
          <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <Link href="#trending" aria-label="Shop TechPivo Market" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={marketImage(banners.hero_image)}
                alt="TechPivo Market — shop the collection"
                className="block h-auto w-full"
                loading="eager"
                decoding="async"
              />
            </Link>
          </div>
        ) : (
          <div className="lg:col-span-8 rounded-2xl relative overflow-hidden flex flex-col justify-between p-5 md:p-8 text-white min-h-[420px]" style={{ background: MARKETPLACE_BRAND.navy }}>
            <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-80 h-80 rounded-full bg-[#EF4444]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                <BadgeCheck className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-[11px] tracking-widest text-slate-300 uppercase">{MARKETPLACE_HERO.pill}</span>
              </div>
              <span className="text-slate-500 text-[11px] font-bold">EST. 2025</span>
            </div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-4">
              <div className="space-y-3">
                <span className="inline-block text-[#EF4444] text-sm font-bold tracking-wide uppercase">{MARKETPLACE_HERO.kicker}</span>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none">
                  {MARKETPLACE_HERO.titleA} <span className="text-[#F59E0B]">{MARKETPLACE_HERO.titleB}</span>
                </h1>
                <p className="text-sm md:text-base text-slate-300">{MARKETPLACE_HERO.copy}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link href="#trending" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-3 rounded-lg transition-colors flex items-center gap-2">
                    Shop the Drop <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-2xl font-extrabold">{MARKETPLACE_HERO.price}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#F59E0B]" /> Secure payment</span>
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[#F59E0B]" /> Quality-checked products</span>
                  <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#F59E0B]" /> Tracked 7–12 day delivery</span>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-white/5 p-4 flex items-center justify-center">
                  <img src={heroImg} alt="TechPivo Market hero product" className="w-full h-full object-cover rounded-xl" loading="eager" decoding="async" />
                </div>
                <div className="absolute -bottom-2 -left-2 bg-white text-[#0F172A] rounded-xl p-2.5 shadow-xl flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#10B981]" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase leading-none">Tracked Delivery</p>
                    <p className="text-xs font-bold leading-tight">Ships in 7–12 Days</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2" aria-hidden>
                <span className="w-8 h-2 rounded-full bg-[#F59E0B]" />
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="w-2 h-2 rounded-full bg-white/30" />
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></span>
                <span className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ChevronRight className="h-4 w-4" /></span>
              </div>
            </div>
          </div>
        )}

          {/* hero side banners — always shown */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Link
              href="/marketplace/deals"
              className="group relative flex-1 overflow-hidden rounded-2xl p-5 text-white shadow-sm transition-shadow hover:shadow-md min-h-[200px] flex flex-col justify-between"
              style={{ background: "linear-gradient(150deg, #DC2626 0%, #991B1B 100%)" }}
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase backdrop-blur-sm">
                  <Flame className="h-3 w-3" /> Flash Sale
                </span>
                <h3 className="mt-2 text-2xl font-extrabold leading-tight">Mega Deal<br />Up to 50% Off</h3>
                <p className="mt-1 text-xs text-white/80">Today only — biggest price drops</p>
              </div>
              <span className="relative mt-3 inline-flex w-fit items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#991B1B] transition-colors group-hover:bg-[#FEF2F2]">
                Shop deals <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link
              href="/marketplace/new-arrivals"
              className="group relative flex-1 overflow-hidden rounded-2xl p-5 text-[#0F172A] shadow-sm transition-shadow hover:shadow-md min-h-[200px] flex flex-col justify-between"
              style={{ background: "linear-gradient(150deg, #F59E0B 0%, #F97316 100%)" }}
            >
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1 rounded bg-black/20 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                  <Zap className="h-3 w-3" /> Just landed
                </span>
                <h3 className="mt-2 text-2xl font-extrabold leading-tight text-white">New Season<br />Tech Drop</h3>
                <p className="mt-1 text-xs text-white/85">Fresh stock, first to own</p>
              </div>
              <span className="relative mt-3 inline-flex w-fit items-center gap-1 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-bold text-white transition-colors group-hover:bg-black">
                Shop new <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
        {/* categories — real department tree, all linked to category pages */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Shop by Department</h2>
              <p className="text-sm text-slate-500">Every aisle, curated — pick a department to explore</p>
            </div>
            <span className="text-[11px] font-bold uppercase text-slate-400 hidden sm:block">New stock weekly</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {MARKET_DEPARTMENTS.map((c) => {
              const Icon = c.icon === "Smartphone" ? Smartphone : c.icon === "Laptop" ? Laptop : c.icon === "Car" ? Car : c.icon === "Wrench" ? Wrench : Cpu
              const cover = banners.departments[c.slug] || deptCover.get(c.slug) || c.image
              return (
              <Link
                key={c.slug}
                href={`/marketplace/category/${c.slug}`}
                className="group relative rounded-xl overflow-hidden border border-[#E2E8F0] transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="h-32 sm:h-36 overflow-hidden">
                  <img src={marketImage(cover)} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <span className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0F172A] shadow-sm" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <span className="block truncate text-sm font-bold text-white leading-tight" title={c.name}>{c.name}</span>
                  <span className="mt-0.5 inline-block text-[11px] font-semibold text-[#FCD34D]">Shop now →</span>
                </div>
              </Link>
              )
            })}
          </div>
          {/* subcategory chips */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {MARKET_DEPARTMENTS.flatMap((d) => d.subs.map((s) => ({ name: s.name, slug: s.slug }))).slice(0, 14).map((s) => (
              <Link
                key={s.slug}
                href={`/marketplace/category/${s.slug}`}
                className="text-[11px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-2.5 py-1 text-slate-600 hover:text-[#0F172A] hover:border-[#F59E0B]"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </section>

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
              {filtering
                ? `${shown.length} result${shown.length === 1 ? "" : "s"}${q ? ` for “${query.trim()}”` : ""}`
                : "Shop the collection"}
            </span>
          </div>
          {filtering && (
            <div className="flex flex-wrap items-center gap-2 pb-3">
              {vendorFilter && (
                <button
                  onClick={() => setVendorFilter(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#DC2626] text-white rounded-full px-3 py-1.5 hover:bg-[#B91C1C]"
                >
                  {vendorFilter} <X className="h-3.5 w-3.5" />
                </button>
              )}
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
          {shown.length > 0 ? (
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
              <p className="font-bold text-[#0F172A]">No products match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search or vendor.</p>
              <button
                onClick={() => { setQuery(""); setVendorFilter(null) }}
                className="mt-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* feature panels — new arrivals / featured / best selling */}
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

        {/* trending slider — reviewed best first, newest fills in until reviews exist */}
        {(() => {
          const trending = [...best, ...grid.filter((g) => !best.some((b) => b.id === g.id))].slice(0, 6)
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

        {/* smartphone & tablet showcase */}
        {phonesDept && (
          <CategoryShowcase
            title="Smartphone & Tablet"
            deptSlug={phonesDept.slug}
            nav={phonesDept.subs.map((s) => ({ name: s.name, slug: s.slug }))}
            items={phonesItems}
            onAdd={addToCart}
            added={justAdded}
            wished={wishlist}
            onWish={toggleWish}
          />
        )}

        {/* shop by collections — every real category node */}
        <ShopCollections collections={collections} />

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
            <div ref={storesRailRef} className="flex gap-3 overflow-x-auto pb-1 snap-x" style={{ scrollbarWidth: "thin" }}>
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
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* departments — real category spotlights (only depts with live items) */}
        {spotDepts.map(({ dept, items }, di) => {
          const accent = di === 1 ? "#EF4444" : "#F59E0B"
          return (
          <section key={dept.slug} className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
            <div className="flex items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-6 rounded-full" style={{ background: accent }} />
                <h2 className="text-lg font-bold text-[#0F172A]">{dept.name}</h2>
              </div>
              <Link
                href={`/marketplace/category/${dept.slug}`}
                className="text-sm text-[#B45309] hover:text-[#D97706] font-semibold hidden sm:inline-flex items-center gap-1"
              >
                Shop all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3 rounded-xl overflow-hidden text-white flex flex-col justify-between relative min-h-[280px]">
                <img src={marketImage(banners.departments[dept.slug] || deptCover.get(dept.slug) || dept.image)} alt={dept.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.92) 100%)" }} />
                <div className="space-y-1.5 relative z-10 p-5">
                  <span className="bg-[#EF4444] text-white text-[11px] font-bold uppercase px-2 py-0.5 rounded">Mega Drop</span>
                  <h3 className="text-2xl font-extrabold leading-tight">Special<br />Sale <span className="text-[#F59E0B]">Up to 50%</span></h3>
                  <p className="text-sm text-slate-300">{dept.subs.length} groups · {dept.subs.reduce((n, s) => n + s.items.length, 0)} product types with full warranty.</p>
                </div>
                <Link
                  href={`/marketplace/category/${dept.slug}`}
                  className="relative z-10 m-5 mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold text-center py-2.5 rounded-lg transition-colors"
                >
                  Shop {dept.name.split(" ")[0]}
                </Link>
              </div>
              <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {items.map((p) => (
                  <ProductCard key={`${dept.slug}-${p.id}`} {...cardProps(p)} />
                ))}
              </div>
            </div>
          </section>
          )
        })}

        {/* promo banner — admin-custom image or default gradient */}
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
                href={`/marketplace/category/${MARKET_DEPARTMENTS[0].slug}`}
                className="bg-[#0F172A] hover:bg-black text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                Shop Appliances
              </Link>
            </div>
          </div>
        </section>

        {/* brands */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex flex-wrap items-center justify-between gap-4 opacity-70">
            {["SAMSUNG", "SONY", "INTEL", "JBL", "ANKER", "LOGITECH", "XIAOMI"].map((b) => (
              <span key={b} className="text-lg font-extrabold tracking-tight text-[#0F172A]">{b}</span>
            ))}
          </div>
        </section>

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
                      <span className="text-sm font-bold text-[#EF4444]">${price.toFixed(2)}</span>
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

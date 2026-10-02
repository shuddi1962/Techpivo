"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight, Car, Check, ChevronLeft, ChevronRight, Cpu, Flame,
  Heart, Laptop, ShoppingCart, Smartphone, Star, Wrench, X, Zap,
  CalendarDays, GitCompareArrows, BadgeCheck, Truck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart as addLine, cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import {
  DEMO_PRODUCTS, MARKETPLACE_BRAND, MARKETPLACE_HERO,
  MARKETPLACE_POSTS, MARKETPLACE_VENDORS, type DemoProduct,
} from "@/lib/marketplace"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import { MarketplaceHeader, MarketplaceFooter } from "./marketplace-header"

const CATEGORY_ICONS: Record<string, typeof Laptop> = {
  Cpu, Smartphone, Laptop, Car, Wrench,
}

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
  category_slug?: string | null
  subcategory_slug?: string | null
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.round(value) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`}
        />
      ))}
    </span>
  )
}

function ProductCard({ p, onAdd, wished, onWish, added, href }: { p: DemoProduct; onAdd: () => void; wished: boolean; onWish: () => void; added: boolean; href?: string }) {
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  const body = (
    <>
      <div className="w-full aspect-square bg-white rounded-lg p-3 flex items-center justify-center mb-2 overflow-hidden">
        <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="flex flex-col flex-1 justify-between gap-1">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{p.category}</p>
          <h5 className="text-sm font-semibold text-[#0F172A] line-clamp-1 group-hover:text-[#B45309] transition-colors">{p.name}</h5>
          <div className="flex items-center gap-1 my-1">
            <Stars value={p.rating} />
            <span className="text-[11px] text-slate-500">({p.reviews})</span>
          </div>
        </div>
      </div>
    </>
  )
  return (
    <div className="group bg-[#F8FAFC] rounded-xl p-3 flex flex-col justify-between hover:bg-slate-100 transition-colors relative">
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-[#EF4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">-{discount}%</span>
      )}
      <button
        onClick={onWish}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${wished ? "bg-[#EF4444] text-white" : "bg-white border border-[#E2E8F0] text-slate-400 hover:text-[#EF4444]"}`}
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
      </button>
      {href ? <Link href={href} className="flex flex-col flex-1">{body}</Link> : <div className="flex flex-col flex-1">{body}</div>}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-bold ${discount > 0 ? "text-[#EF4444]" : "text-[#0F172A]"}`}>${p.price.toFixed(2)}</span>
          {p.oldPrice && <span className="text-[11px] text-slate-400 line-through">${p.oldPrice.toFixed(2)}</span>}
        </div>
        <button
          onClick={onAdd}
          className={`w-full mt-2 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${added ? "bg-[#10B981] text-white" : "bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]"}`}
        >
          {added ? (
            <><Check className="h-3.5 w-3.5" /> Added</>
          ) : (
            <><ShoppingCart className="h-3.5 w-3.5" /> Add</>
          )}
        </button>
      </div>
    </div>
  )
}

function useCountdown() {
  const [secs, setSecs] = useState(59)
  const [mins, setMins] = useState(52)
  const [hrs, setHrs] = useState(9)
  useEffect(() => {
    const t = setInterval(() => {
      setSecs((s) => {
        if (s > 0) return s - 1
        setMins((m) => {
          if (m > 0) return m - 1
          setHrs((h) => (h > 0 ? h - 1 : 23))
          return 59
        })
        return 59
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, "0")
  return { days: "02", hrs: pad(hrs), mins: pad(mins), secs: pad(secs) }
}

const WISH_KEY = "tp_market_wish_v1"

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

export function MarketplaceHome() {
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([])
  const [tab, setTab] = useState<"new" | "featured" | "best">("new")
  const cart = useMarketCart()
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({})
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState("")
  const [deptFilter, setDeptFilter] = useState<string | null>(null)
  const t = useCountdown()

  useEffect(() => {
    setWishlist(readWish())
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
    }
    load()
    const ch = supabase
      .channel(`market_home_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .subscribe()
    const poll = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      alive = false
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
    }
  }, [])

  const liveProducts: DemoProduct[] = useMemo(
    () =>
      dbProducts.map((d, i) => ({
        id: d.id,
        name: d.product_name,
        category: d.program_key || "TechPivo Pick",
        price: Number(d.sale_price ?? d.original_price ?? 0),
        oldPrice: d.original_price ? Number(d.original_price) : undefined,
        rating: d.is_featured ? 5 : 4,
        reviews: 10 + ((i * 37) % 200),
        image: d.product_image_url || DEMO_PRODUCTS[i % DEMO_PRODUCTS.length].image,
        badge: d.is_featured ? "Featured" : undefined,
      })),
    [dbProducts]
  )

  const grid: DemoProduct[] = liveProducts.length > 0 ? liveProducts : DEMO_PRODUCTS
  const newArrivals = grid.slice(0, 6)
  const featured = (liveProducts.length > 0 ? liveProducts.filter((_, i) => i % 2 === 0) : DEMO_PRODUCTS.slice(2, 8)).slice(0, 6)
  const best = (liveProducts.length > 0 ? liveProducts : DEMO_PRODUCTS).slice(0, 6)
  const tabShown = tab === "new" ? newArrivals : tab === "featured" ? featured : best

  const q = query.trim().toLowerCase()
  const matchQuery = (p: DemoProduct) =>
    !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
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
  const matchDept = (p: DemoProduct) => {
    if (!deptFilter) return true
    const mapped = deptOf.get(p.id)
    if (mapped) return mapped === deptFilter
    const dept = MARKET_DEPARTMENTS.find((d) => d.slug === deptFilter)
    if (!dept) return true
    const hay = `${p.name} ${p.category}`.toLowerCase()
    const needles = [dept.name, ...dept.subs.flatMap((s) => [s.name, ...s.items.map((i) => i.name)])]
    return needles.some((n) =>
      n.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4).some((w) => hay.includes(w))
    )
  }
  const shown = tabShown.filter((p) => matchQuery(p) && matchDept(p))
  const filtering = q.length > 0 || deptFilter !== null
  const wishCount = Object.values(wishlist).filter(Boolean).length
  const subChips = useMemo(
    () =>
      MARKET_DEPARTMENTS.flatMap((d) => d.subs.map((s) => ({ name: s.name, slug: s.slug, dept: d.slug }))).slice(0, 14),
    []
  )

  const cartCount = countLines(cart)
  const cartTotal = cart.reduce((sum, l) => {
    const found = dbProducts.find((d) => d.id === l.id)
    const unit = found ? Number(found.sale_price ?? found.original_price ?? 0) : 0
    return Math.round((sum + unit * l.qty) * 100) / 100
  }, 0)

  const addToCart = (p: DemoProduct) => {
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
      <div className="px-3 sm:px-6 lg:px-10 py-4 space-y-4 sm:space-y-6">
        <MarketplaceHeader
          cartCount={cartCount}
          cartTotal={`$${cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          wishCount={wishCount}
          onSearch={(v) => {
            setQuery(v)
            if (v.trim()) document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          onShopDept={(slug) => {
            setDeptFilter(slug)
            document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
        />

        {/* promo ticker */}
        <div className="bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-[#F59E0B] text-[#0F172A] text-[11px] font-bold uppercase px-2 py-1 rounded-md shrink-0">Welcome Offer</span>
            <p className="text-sm text-slate-500">
              Welcome to <strong className="text-[#0F172A]">TechPivo Market</strong>! New deals & free gifts every weekend.
            </p>
          </div>
          <Link href="#flash-deals" className="bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0">
            Explore Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* hero bento */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
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
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-white/5 p-4 flex items-center justify-center">
                  <img src={MARKETPLACE_HERO.image} alt="TechPivo Market hero product" className="w-full h-full object-cover rounded-xl" loading="eager" />
                </div>
                <div className="absolute -bottom-2 -left-2 bg-white text-[#0F172A] rounded-xl p-2.5 shadow-xl flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#10B981]" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase leading-none">Express Global</p>
                    <p className="text-xs font-bold leading-tight">Free 2-Day Air</p>
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

          <div className="lg:col-span-4 flex flex-col gap-4">
            {[
              { tag: "Pro Optics", title: "Digital Super Zoom Camera", copy: "16.4 MP photos with pro-grade lens.", price: "$489.00", cta: "Shop Now", img: DEMO_PRODUCTS[0].image },
              { tag: "Esports Ready", title: "SteelSeries Gaming Gear", copy: "Tournament-grade precision peripherals.", price: "$129.50", cta: "Learn More", img: DEMO_PRODUCTS[6].image },
            ].map((b) => (
              <div key={b.title} className="bg-white rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex-1 border border-[#E2E8F0]">
                <div className="space-y-1.5">
                  <span className="bg-[#FEF2F2] text-[#EF4444] text-[11px] font-bold uppercase px-2 py-0.5 rounded">{b.tag}</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">{b.title}</h3>
                  <p className="text-sm text-slate-500">{b.copy}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <span className="text-lg font-bold text-[#0F172A]">{b.price}</span>
                    <Link className="block text-sm text-[#B45309] hover:text-[#D97706] font-semibold mt-1" href="#trending">{b.cta} →</Link>
                  </div>
                  <div className="w-24 h-24 rounded-xl bg-[#F8FAFC] overflow-hidden flex items-center justify-center border border-[#E2E8F0]">
                    <img src={b.img} alt={b.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* categories — real CJ-aligned tree */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Shop by Department</h2>
              <p className="text-sm text-slate-500">5 departments · live CJDropshipping catalog</p>
            </div>
            <span className="text-[11px] font-bold uppercase text-slate-400 hidden sm:block">CJDropshipping synced</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {MARKET_DEPARTMENTS.map((c) => {
              const Icon = CATEGORY_ICONS[c.icon] ?? Laptop
              const leaves = c.subs.reduce((n, s) => n + s.items.length, 0)
              const selected = deptFilter === c.slug
              return (
                <button
                  key={c.slug}
                  onClick={() => {
                    setDeptFilter(selected ? null : c.slug)
                    document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                  aria-pressed={selected}
                  className={`group rounded-xl overflow-hidden border text-left transition-colors ${selected ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/30 bg-[#FFFBEB]" : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100"}`}
                >
                  <div className="h-20 overflow-hidden">
                    <img src={c.image} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3 flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] shrink-0">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#0F172A] group-hover:text-[#B45309] line-clamp-1">{c.name}</span>
                      <span className="block text-[11px] text-slate-400">{c.subs.length} groups · {leaves} types</span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {/* subcategory chips */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {subChips.map((s) => (
              <button
                key={s.slug}
                onClick={() => {
                  setDeptFilter(s.dept)
                  document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className="text-[11px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-2.5 py-1 text-slate-600 hover:text-[#0F172A] hover:border-[#F59E0B]"
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>

        {/* flash deals */}
        <section id="flash-deals" className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#E2E8F0] scroll-mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-4 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden text-white" style={{ background: MARKETPLACE_BRAND.navy }}>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 bg-[#EF4444] text-white px-2.5 py-1 rounded text-[11px] font-bold uppercase">
                  <Flame className="h-3.5 w-3.5" /> Flash Sale
                </div>
                <h3 className="text-3xl font-bold tracking-tight pt-1">Special Offer!</h3>
                <p className="text-3xl text-[#F59E0B] font-extrabold leading-none">Up to 50% Off</p>
                <p className="text-sm text-slate-300 pt-1">Hurry — stock is limited on verified TechPivo batches.</p>
              </div>
              <div className="my-4">
                <p className="text-[11px] uppercase text-slate-400 tracking-wider mb-2">Offer Ends In:</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { v: t.days, l: "Days" },
                    { v: t.hrs, l: "Hours" },
                    { v: t.mins, l: "Mins" },
                    { v: t.secs, l: "Secs" },
                  ].map((x) => (
                    <div key={x.l} className="bg-white/10 rounded-xl p-2">
                      <span className="text-xl font-extrabold text-[#F59E0B] block tabular-nums">{x.v}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-300">{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl">
                <Zap className="h-4 w-4 text-[#F59E0B] shrink-0" />
                <span>Real-time inventory sync from TechPivo fulfillment</span>
              </div>
            </div>
            {DEMO_PRODUCTS.slice(0, 2).map((p) => {
              const pct = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
              const left = p.stockLeft ?? 10
              const total = p.stockTotal ?? 20
              return (
                <div key={p.id} className="lg:col-span-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-100 transition-colors group relative">
                  {pct > 0 && <span className="absolute top-4 left-4 bg-[#EF4444] text-white text-[11px] font-bold px-2 py-0.5 rounded-full z-10">-{pct}%</span>}
                  <div className="relative w-full aspect-[4/3] rounded-xl bg-white p-3 flex items-center justify-center overflow-hidden mb-3 border border-[#E2E8F0]">
                    <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Stars value={p.rating} />
                        <span className="text-xs text-slate-500 ml-1">({p.reviews})</span>
                      </div>
                      <h4 className="font-bold text-[#0F172A] line-clamp-1">{p.name}</h4>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg text-[#EF4444] font-extrabold">${p.price.toFixed(2)}</span>
                        {p.oldPrice && <span className="text-sm text-slate-400 line-through">${p.oldPrice.toFixed(2)}</span>}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Available: <strong className="text-[#0F172A]">{left} left</strong></span>
                        <span className="text-[#EF4444] font-semibold">Almost Gone</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${Math.round((left / total) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => addToCart(p)}
                        className={`flex-1 text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${justAdded[p.id] ? "bg-[#10B981] text-white" : "bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]"}`}
                      >
                        {justAdded[p.id] ? (
                          <><Check className="h-4 w-4" /> Added</>
                        ) : (
                          <><ShoppingCart className="h-4 w-4" /> Add to Cart</>
                        )}
                      </button>
                      <button
                        onClick={() => toggleWish(p.id)}
                        aria-label={wishlist[p.id] ? "Remove from wishlist" : "Add to wishlist"}
                        aria-pressed={!!wishlist[p.id]}
                        className={`w-10 h-10 rounded-lg bg-white border flex items-center justify-center transition-colors ${wishlist[p.id] ? "border-[#EF4444] text-[#EF4444]" : "border-[#E2E8F0] text-slate-500 hover:text-[#EF4444]"}`}
                      >
                        <Heart className={`h-5 w-5 ${wishlist[p.id] ? "fill-current" : ""}`} />
                      </button>
                      <button aria-label="Compare" className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-100 hidden sm:flex items-center justify-center text-slate-500 transition-colors">
                        <GitCompareArrows className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* tabbed products */}
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
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${tab === b.id ? "text-white" : "text-slate-500 hover:text-[#0F172A]"}`}
                  style={tab === b.id ? { background: MARKETPLACE_BRAND.navy } : undefined}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">
              {filtering
                ? `${shown.length} result${shown.length === 1 ? "" : "s"}${deptFilter ? ` in ${MARKET_DEPARTMENTS.find((d) => d.slug === deptFilter)?.name}` : ""}${q ? ` for “${query.trim()}”` : ""}`
                : liveProducts.length > 0 ? `${liveProducts.length} live products from TechPivo partners` : "Sorted by Verified Quality"}
            </span>
          </div>
          {filtering && (
            <div className="flex flex-wrap items-center gap-2 pb-3">
              {deptFilter && (
                <button
                  onClick={() => setDeptFilter(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0F172A] text-white rounded-full px-3 py-1.5 hover:bg-slate-700"
                >
                  {MARKET_DEPARTMENTS.find((d) => d.slug === deptFilter)?.name} <X className="h-3.5 w-3.5" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            {shown.map((p) => (
              <ProductCard key={p.id} {...cardProps(p)} />
            ))}
          </div>
          {shown.length === 0 && (
            <div className="text-center py-10">
              <p className="font-bold text-[#0F172A]">No products match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search or department.</p>
              <button
                onClick={() => { setQuery(""); setDeptFilter(null) }}
                className="mt-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* vendors */}
        <section id="vendors" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[#F59E0B] text-[11px] font-bold uppercase tracking-wider block">Marketplace Network</span>
              <h2 className="text-lg font-bold text-[#0F172A]">Weekly Top Vendors</h2>
            </div>
            <Link className="text-sm text-[#B45309] hover:text-[#D97706] font-semibold hidden sm:inline-flex items-center gap-1" href="#trending">
              Explore All Vendors <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {MARKETPLACE_VENDORS.map((v) => (
              <div key={v.name} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: MARKETPLACE_BRAND.navy }}>{v.initials}</div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#0F172A] truncate">{v.name}</h4>
                    <p className="text-[11px] text-slate-500">{v.products} Products</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 my-2">
                  {v.images.map((src, i) => (
                    <div key={i} className="aspect-square bg-white border border-[#E2E8F0] rounded p-1">
                      <img src={src} alt={`${v.name} product ${i + 1}`} loading="lazy" className="w-full h-full object-cover rounded" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full mt-1 bg-white hover:bg-slate-100 border border-[#E2E8F0] text-[#0F172A] text-[11px] py-1.5 rounded font-semibold transition-colors"
                >
                  Visit Store
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* departments — real category spotlights */}
        {MARKET_DEPARTMENTS.slice(0, 3).map((dept, di) => {
          const hay = (p: DemoProduct) => `${p.name} ${p.category}`.toLowerCase()
          const deptItems = grid.filter((p) => {
            const mapped = deptOf.get(p.id)
            if (mapped) return mapped === dept.slug
            const needles = [dept.name, ...dept.subs.flatMap((s) => [s.name, ...s.items.map((i) => i.name)])]
            return needles.some((n) =>
              n.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4).some((w) => hay(p).includes(w))
            )
          })
          const items = (deptItems.length > 0 ? deptItems : grid).slice(0, 5)
          const accent = di === 1 ? "#EF4444" : "#F59E0B"
          return (
          <section key={dept.slug} className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
            <div className="flex items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-6 rounded-full" style={{ background: accent }} />
                <h2 className="text-lg font-bold text-[#0F172A]">{dept.name}</h2>
              </div>
              <button
                onClick={() => { setDeptFilter(dept.slug); document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" }) }}
                className="text-sm text-[#B45309] hover:text-[#D97706] font-semibold hidden sm:inline-flex items-center gap-1"
              >
                Shop all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3 rounded-xl overflow-hidden text-white flex flex-col justify-between relative min-h-[280px]">
                <img src={dept.image} alt={dept.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.92) 100%)" }} />
                <div className="space-y-1.5 relative z-10 p-5">
                  <span className="bg-[#EF4444] text-white text-[11px] font-bold uppercase px-2 py-0.5 rounded">Mega Drop</span>
                  <h3 className="text-2xl font-extrabold leading-tight">Special<br />Sale <span className="text-[#F59E0B]">Up to 50%</span></h3>
                  <p className="text-sm text-slate-300">{dept.subs.length} groups · {dept.subs.reduce((n, s) => n + s.items.length, 0)} product types with full warranty.</p>
                </div>
                <button
                  onClick={() => { setDeptFilter(dept.slug); document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" }) }}
                  className="relative z-10 m-5 mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold text-center py-2.5 rounded-lg transition-colors"
                >
                  Shop {dept.name.split(" ")[0]}
                </button>
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

        {/* promo banner */}
        <section className="rounded-2xl overflow-hidden p-6 md:p-8 text-white relative" style={{ background: MARKETPLACE_BRAND.navy }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-3 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-[#F59E0B] flex flex-col items-center justify-center bg-white/5">
                <span className="text-3xl text-[#F59E0B] font-extrabold leading-none">50%</span>
                <span className="text-[11px] font-bold uppercase">OFF PROMO</span>
              </div>
            </div>
            <div className="md:col-span-6 text-center md:text-left space-y-1.5">
              <span className="bg-[#F59E0B] text-[#0F172A] text-[11px] font-bold uppercase px-2 py-0.5 rounded">Major Appliance Drop</span>
              <h3 className="text-2xl font-bold tracking-tight">TechPivo Home Essentials — Washer & Smart Devices</h3>
              <p className="text-slate-300">Top-brand high-efficiency smart home devices at seasonal prices.</p>
            </div>
            <div className="md:col-span-3 flex items-center justify-center md:justify-end">
              <button
                onClick={() => { setDeptFilter("home-improvement"); setQuery(""); document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" }) }}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                Shop Appliances
              </button>
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

        {/* editorial */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[#F59E0B] text-[11px] font-bold uppercase tracking-wider block">Tech Journal</span>
              <h2 className="text-lg font-bold text-[#0F172A]">Latest Blogs & Editorial</h2>
            </div>
            <Link className="text-sm text-[#B45309] hover:text-[#D97706] font-semibold hidden sm:inline-flex items-center gap-1" href="/blog">
              View All Articles <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MARKETPLACE_POSTS.map((b) => (
              <article key={b.title} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group">
                <div className="aspect-video w-full overflow-hidden bg-slate-200">
                  <img src={b.image} alt={b.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{b.date}</span>
                      <span>•</span>
                      <span>{b.comments} comments</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#0F172A] line-clamp-2 group-hover:text-[#B45309] transition-colors">{b.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.excerpt}</p>
                  </div>
                  <Link className="mt-3 text-xs font-semibold text-[#B45309] hover:text-[#D97706] inline-flex items-center gap-1" href="/blog">
                    Read More <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* recently viewed */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Recently Viewed Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_PRODUCTS.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 transition-colors">
                <div className="w-16 h-16 rounded-lg bg-white p-1.5 shrink-0 flex items-center justify-center border border-[#E2E8F0]">
                  <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover rounded" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-sm font-semibold text-[#0F172A] line-clamp-1">{p.name}</h5>
                  <span className="text-sm font-bold text-[#EF4444]">${p.price.toFixed(2)}</span>
                  <span className="block text-[10px] text-[#10B981] font-medium">In Stock</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <MarketplaceFooter />

        {/* affiliate disclosure */}
        <p className="text-center text-[11px] text-slate-400 px-4 pb-2">
          TechPivo Market contains affiliate links. When you buy through links on this page, we may earn a commission — it never affects our reviews.
        </p>
      </div>
    </div>
  )
}

// keep next/image import referenced for future optimization
void Image

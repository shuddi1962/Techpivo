"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  RefreshCcw,
  ShoppingCart,
  Star,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart as addLine } from "@/lib/marketplace-cart"
import { openCartPopup } from "@/lib/marketplace-events"
import { marketImage } from "@/lib/marketplace-images"
import { cleanProductTitle } from "@/lib/marketplace-copy"
import { formatMarketPrice, useMarketCurrency } from "@/lib/marketplace-pricing"
import { MarketPrice } from "./market-price"
import { useLiveNgnRate } from "@/lib/fx-client"

interface SeasonalProduct {
  productId: string
  promotionalPrice: number
  badge: string
  badgeText: string
  badgeColor: string
  priority: number
  enabled: boolean
  startAt: string | null
  endAt: string | null
}

interface SeasonalCampaign {
  id: string
  name: string
  heading: string
  subtitle: string
  description: string
  bannerImage: string
  bannerLink: string
  ctaText: string
  ctaLink: string
  status: "draft" | "published" | "paused" | "expired"
  startAt: string | null
  endAt: string | null
  timezone: string
  countdownEnabled: boolean
  countdownStyle: string
  accentColor: string
  textColor: string
  products: SeasonalProduct[]
  settings: Record<string, unknown>
  maxProducts: number
  displayLimit: number
}

const EMPTY_CAMPAIGN: SeasonalCampaign = {
  id: "",
  name: "",
  heading: "Special Deals.",
  subtitle: "Limited Time.",
  description: "Grab amazing offers on top products this season.",
  bannerImage: "",
  bannerLink: "/marketplace/deals",
  ctaText: "Shop the Sale",
  ctaLink: "/marketplace/deals",
  status: "expired",
  startAt: null,
  endAt: null,
  timezone: "Africa/Lagos",
  countdownEnabled: true,
  countdownStyle: "boxes",
  accentColor: "#EF4444",
  textColor: "#0F172A",
  products: [],
  settings: {
    sectionVisibility: true,
    sectionHeading: "Special Deals.",
    sectionSubtitle: "Limited Time.",
    desktopLayout: "side-by-side",
    tabletLayout: "stacked",
    mobileLayout: "stacked",
    cardSpacing: "md",
    imagePresentation: "cover",
    borderRadius: "xl",
    cardShadow: "sm",
    badgeStyle: "pill",
    priceColor: "#EF4444",
    countdownAppearance: "boxes",
    carouselArrows: true,
    paginationDots: false,
    autoRotation: false,
    transitionSpeed: 4,
    visibleProducts: 5,
    mobileProductsPerView: 2,
  },
  maxProducts: 20,
  displayLimit: 5,
}

function splitCountdown(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return { days: d, hrs: h, mins: m, secs: s }
}

function secondsLeft(endAt: string | null): number {
  if (!endAt) return 0
  return Math.max(0, Math.floor((Date.parse(endAt) - Date.now()) / 1000))
}

interface CarouselProductsProps {
  campaignProducts: SeasonalProduct[]
  byId: Map<string, DbProductRow>
  reviews: Record<string, { sum: number; n: number }>
  formatPrice: (usd: number | null | undefined) => string
  accent: string
  campaignSettings: Record<string, unknown>
  carouselRef: React.RefObject<HTMLDivElement>
  scrollPos: number
  setScrollPos: (v: number) => void
  trackClick: (productId: string, event: "click" | "addToCart") => void
  addToCart: (productId: string) => void
  currency: string
  ngnRate: number
}

interface DbProductRow {
  id: string
  product_name: string
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  stock: number | null
}

function badgeFor(cp: SeasonalProduct) {
  const custom = (cp.badgeText || "").trim()
  return custom || cp.badge || "SPECIAL OFFER"
}

function CarouselProducts({
  campaignProducts,
  byId,
  reviews,
  formatPrice,
  accent,
  campaignSettings,
  carouselRef,
  scrollPos,
  setScrollPos,
  trackClick,
  addToCart,
  currency,
  ngnRate,
}: CarouselProductsProps) {
  return (
    <div className="relative">
      {campaignProducts.length > 1 && (
        <>
          <button
            onClick={() => {
              const el = carouselRef.current
              if (el) el.scrollBy({ left: -340, behavior: "smooth" })
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-3 py-6 rounded-r-full bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg hover:bg-white hover:shadow-xl transition-all"
            aria-label="Scroll left"
            disabled={scrollPos <= 0}
          >
            <ChevronLeft className="h-6 w-6 text-[#0F172A]" />
          </button>
          <button
            onClick={() => {
              const el = carouselRef.current
              if (el) el.scrollBy({ left: 340, behavior: "smooth" })
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-3 py-6 rounded-l-full bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg hover:bg-white hover:shadow-xl transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-[#0F172A]" />
          </button>
        </>
      )}
      <div
        ref={carouselRef}
        className="seasonal-carousel flex min-w-0 flex-1 gap-5 items-stretch overflow-x-auto snap-x pb-6 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => setScrollPos((e.currentTarget as HTMLDivElement).scrollLeft)}
      >
        {campaignProducts.map((cp) => {
          const p = byId.get(cp.productId)
          if (!p) return null
          const st = reviews[p.id]
          const rating = st && st.n > 0 ? st.sum / st.n : 0
          const reviewCount = st?.n ?? 0
          const sale = Number(cp.promotionalPrice ?? p.sale_price ?? p.original_price ?? 0)
          const orig = Number(p.original_price ?? 0)
          const showStrike = orig > sale && orig > 0
          const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
          return (
            <div key={p.id} className="shrink-0 w-[200px] sm:w-[220px] md:w-[240px] flex flex-col h-full group">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm group">
                {p.product_image_url ? (
                  <img
                    src={marketImage(p.product_image_url)}
                    alt={p.product_name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-200">
                    <RefreshCcw className="h-10 w-10" />
                  </div>
                )}
                <span
                  className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#EF4444] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm tracking-wider uppercase"
                  style={{ backgroundColor: cp.badgeColor || accent }}
                >
                  {badgeFor(cp)}
                </span>
              </div>
              <div className="mt-2.5 flex flex-col gap-1 px-0 h-full">
                <Link
                  href={href || "/marketplace"}
                  aria-label={p.product_name}
                  className="block line-clamp-2 text-[12px] font-semibold leading-tight text-[#0F172A] transition-colors hover:text-[#EF4444]"
                  onClick={() => trackClick(p.id, "click")}
                >
                  {cleanProductTitle(p.product_name)}
                </Link>
                {rating > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                    <span className="text-[10px] font-medium text-slate-600">
                      {rating.toFixed(1)}
                    </span>
                    {reviewCount > 0 && (
                      <span className="text-[10px] text-slate-400">({reviewCount})</span>
                    )}
                  </div>
                )}
                <div className="mt-1 flex items-baseline gap-1">
                  {showStrike && (
                    <MarketPrice
                      usd={orig}
                      className="text-[10px] tabular-nums text-slate-400 line-through"
                    />
                  )}
                  <span className="text-[16px] font-black tabular-nums" style={{ color: String(campaignSettings?.priceColor ?? accent) }}>
                    {formatPrice(sale)}
                  </span>
                  {currency === "NGN" && (
                    <span className="text-[10px] text-slate-500 ml-1">
                      ≈ ₦{Math.max(1, Math.round(sale * ngnRate)).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex flex-col gap-2 px-0">
                <button
                  type="button"
                  onClick={() => addToCart(p.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EF4444] px-2.5 py-2 text-xs font-black text-white shadow-sm shadow-red-500/15 hover:bg-[#DC2626] transition-colors active:scale-[0.98]"
                >
                  <ShoppingCart className="h-3 w-3" /> Add to Cart
                </button>
                {href && (
                  <Link
                    href={href}
                    className="flex w-full items-center justify-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F8FAFC] hover:text-[#EF4444] hover:border-[#EF4444] transition-colors active:scale-[0.98]"
                  >
                    <Eye className="h-3 w-3" /> View Product
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SeasonalSalesSection() {
  const [config, setConfig] = useState<SeasonalCampaign | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [products, setProducts] = useState<DbProductRow[]>([])
  const [reviews, setReviews] = useState<Record<string, { sum: number; n: number }>>({})
  const currency = useMarketCurrency()
  const ngnRate = useLiveNgnRate()
  const carouselRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState(0)
  const [impressionLogged, setImpressionLogged] = useState(false)

  const campaigns = useMemo(() => {
    if (!loaded || !config) return []
    const arr = (config as unknown as { campaigns?: SeasonalCampaign[] }).campaigns
    return Array.isArray(arr) ? arr : []
  }, [config, loaded])

  const campaign = useMemo(() => {
    if (!loaded) return null
    const now = Date.now()
    const active = campaigns.find((c) => {
      const start = c.startAt ? Date.parse(c.startAt) : 0
      const end = c.endAt ? Date.parse(c.endAt) : 0
      return (
        c.status === "published" &&
        (!c.startAt || now >= start) &&
        (!c.endAt || now <= end)
      )
    })
    return active ?? null
  }, [campaigns, loaded])

  const remaining = useMemo(() => {
    if (!campaign || !campaign.countdownEnabled || !campaign.endAt) return Infinity
    return secondsLeft(campaign.endAt)
  }, [campaign])

  // Tick the countdown every second so the live timer keeps updating.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!campaign || !campaign.countdownEnabled || !campaign.endAt) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [campaign])

  const expired = useMemo(() => {
    if (!campaign || !campaign.endAt) return false
    return secondsLeft(campaign.endAt) <= 0
  }, [campaign, tick])

  const countdown = useMemo(() => {
    if (!campaign || !campaign.endAt) return splitCountdown(0)
    return splitCountdown(Math.max(0, secondsLeft(campaign.endAt)))
  }, [campaign, tick])

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_seasonal_sales")
          .maybeSingle()
        const val = (data as { value?: unknown } | null)?.value
        if (val && typeof val === "object") {
          setConfig({ ...EMPTY_CAMPAIGN, ...(val as Record<string, unknown>) })
        }
      } catch {
        // keep defaults
      } finally {
        setLoaded(true)
      }
    }
    load()
    const ch = createClient()
      .channel(`seasonal_sales_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.marketplace_seasonal_sales" },
        load
      )
      .subscribe()
    return () => {
      try {
        createClient().removeChannel(ch)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!loaded || !campaign) return
    const ids = campaign.products.filter((p) => p.enabled).map((p) => p.productId)
    if (ids.length === 0) {
      setProducts([])
      setReviews({})
      return
    }
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("id,product_name,product_image_url,original_price,sale_price,stock")
      .in("id", ids)
      .eq("is_active", true)
      .then(({ data }) => {
        const rows = (data || []) as Array<{
          id: string
          product_name: string
          product_image_url: string | null
          original_price: number | null
          sale_price: number | null
          stock: number | null
        }>
        const available = rows.filter((r) => Number(r.stock ?? 0) > 0)
        setProducts(available as DbProductRow[])
      })
    supabase
      .from("marketplace_reviews")
      .select("product_id,rating")
      .in("id", ids)
      .then(({ data }) => {
        const m: Record<string, { sum: number; n: number }> = {}
        for (const r of (data || []) as Array<{ product_id: string; rating: number }>) {
          const cur = m[r.product_id] || { sum: 0, n: 0 }
          cur.sum += Number(r.rating) || 0
          cur.n += 1
          m[r.product_id] = cur
        }
        setReviews(m)
      })
  }, [campaign, loaded])

  useEffect(() => {
    if (!campaign || impressionLogged) return
    void fetch("/api/marketplace/seasonal-sales/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "impression", campaignId: campaign.id }),
      keepalive: true,
    }).catch(() => {})
    setImpressionLogged(true)
  }, [campaign, impressionLogged])

  if (!loaded) return null
  if (!campaign || expired || campaign.products.length === 0) return null

  const sectionVisibility = Boolean(campaign.settings?.sectionVisibility) ?? true
  if (!sectionVisibility) return null

  const byId = new Map(products.map((p) => [p.id, p]))
  const displayLimit = Number(campaign.settings?.displayLimit ?? campaign.displayLimit ?? 8)
  const accent = campaign.accentColor || "#EF4444"

  const campaignProducts = campaign.products
    .filter((p) => p.enabled && byId.has(p.productId))
    .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))
    .slice(0, displayLimit)

  const formatPrice = (usd: number | null | undefined) =>
    formatMarketPrice(usd, ngnRate, currency)

  const trackClick = (productId: string, event: "click" | "addToCart") => {
    if (!campaign) return
    void fetch("/api/marketplace/seasonal-sales/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: event, campaignId: campaign.id, productId }),
      keepalive: true,
    }).catch(() => {})
  }

  const addToCart = (productId: string) => {
    addLine(productId, 1)
    openCartPopup(productId)
    trackClick(productId, "addToCart")
  }

  return (
    <section aria-label="Seasonal Sales" className="w-full bg-white py-8 sm:py-12 lg:py-16 overflow-x-clip">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10">
        {/* Side-by-side: promotional header on the left, product carousel on the right */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-start">
          <div className="flex flex-col gap-4 mb-6 lg:mb-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EF4444] px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/30">
              <Clock className="h-4 w-4" /> {campaign.name || "SEASONAL SALE"}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="mt-0 mb-1 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0F172A] leading-[1.05]">
                {campaign.heading || "Special Deals."}
              </h2>
              <p className="mt-0 mb-3 text-lg font-semibold text-slate-600 sm:text-xl">
                {campaign.subtitle || "Limited Time."}
              </p>
            </div>
            {campaign.countdownEnabled && !expired && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {[
                  { v: countdown.days, l: "Days" },
                  { v: countdown.hrs, l: "Hrs" },
                  { v: countdown.mins, l: "Min" },
                  { v: countdown.secs, l: "Sec" },
                ].map((x) => (
                  <div
                    key={x.l}
                    className="flex flex-col items-center gap-0.5 rounded-xl bg-[#F8FAFC] px-2 py-1.5 text-center border border-[#E2E8F0] shadow-sm"
                  >
                    <span className="text-xl font-black tabular-nums text-[#0F172A]">
                      {String(x.v).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {x.l}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {campaign.description && (
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-md">
                {campaign.description}
              </p>
            )}
            <Link
              href={campaign.ctaLink || "/marketplace/deals"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EF4444] px-8 py-3 text-sm font-black text-white shadow-md shadow-red-500/30 hover:bg-[#DC2626] transition-all active:scale-95"
            >
              {campaign.ctaText || "Shop the Sale"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-2 flex-1 min-w-0 relative">
            <CarouselProducts
              campaignProducts={campaignProducts}
              byId={byId}
              reviews={reviews}
              formatPrice={formatPrice}
              accent={accent}
              campaignSettings={campaign.settings}
              carouselRef={carouselRef}
              scrollPos={scrollPos}
              setScrollPos={setScrollPos}
              trackClick={trackClick}
              addToCart={addToCart}
              currency={currency}
              ngnRate={ngnRate}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

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
    desktopLayout: "banner-top",
    tabletLayout: "banner-top",
    mobileLayout: "stacked",
    cardSpacing: "md",
    imagePresentation: "cover",
    borderRadius: "xl",
    cardShadow: "sm",
    badgeStyle: "pill",
    priceColor: "#EF4444",
    countdownAppearance: "boxes",
    carouselArrows: true,
    paginationDots: true,
    autoRotation: false,
    transitionSpeed: 4,
    visibleProducts: 8,
    mobileProductsPerView: 2,
  },
  maxProducts: 20,
  displayLimit: 8,
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

export function SeasonalSalesSection() {
  const [config, setConfig] = useState<SeasonalCampaign>(EMPTY_CAMPAIGN)
  const [loaded, setLoaded] = useState(false)
  const [products, setProducts] = useState<DbProductRow[]>([])
  const [reviews, setReviews] = useState<Record<string, { sum: number; n: number }>>({})
  const currency = useMarketCurrency()
  const ngnRate = useLiveNgnRate()
  const carouselRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState(0)
  const [impressionLogged, setImpressionLogged] = useState(false)

  const campaign = useMemo(() => {
    if (!loaded) return null
    const now = Date.now()
    const start = config.startAt ? Date.parse(config.startAt) : 0
    const end = config.endAt ? Date.parse(config.endAt) : 0
    const active =
      config.status === "published" &&
      (!config.startAt || now >= start) &&
      (!config.endAt || now <= end)
    return active ? config : null
  }, [config, loaded])

  const remaining = useMemo(() => {
    if (!campaign || !campaign.countdownEnabled || !campaign.endAt) return Infinity
    return secondsLeft(campaign.endAt)
  }, [campaign])

  const expired = useMemo(() => !campaign || remaining <= 0, [campaign, remaining])

  const countdown = useMemo(() => splitCountdown(remaining), [remaining])

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

  if (!loaded || !config.settings?.sectionVisibility) return null
  if (!campaign || expired || campaign.products.length === 0) return null

  const byId = new Map(products.map((p) => [p.id, p]))
  const displayLimit = Number(campaign.settings?.displayLimit ?? campaign.displayLimit ?? 5)
  const badgeStyle = String(campaign.settings?.badgeStyle ?? "pill")
  const accent = campaign.accentColor || "#EF4444"

  const campaignProducts = campaign.products
    .filter((p) => p.enabled && byId.has(p.productId))
    .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))
    .slice(0, displayLimit)

  const formatPrice = (usd: number | null | undefined) =>
    formatMarketPrice(usd, ngnRate, currency)

  const badgeFor = (cp: SeasonalProduct) => {
    const custom = (cp.badgeText || "").trim()
    return custom || cp.badge || "SPECIAL OFFER"
  }

  const trackClick = (productId: string, event: "click" | "addToCart") => {
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

  const pageCount = Math.max(1, Math.ceil(campaignProducts.length / 1))
  const activeDot = Math.min(pageCount - 1, Math.floor(scrollPos / 300))

  return (
    <section aria-label="Seasonal Sales" className="w-full bg-white py-10 sm:py-14 lg:py-16 overflow-x-clip">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10">
        {/* Hero banner band — full width, landscape */}
        <div className="relative rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-sm overflow-hidden mb-8 sm:mb-10 lg:mb-12">
          <div className="grid gap-6 sm:gap-8 lg:gap-12 items-start lg:items-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
            {/* Left: Promotional copy */}
            <div className="flex-none lg:w-[44%] flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EF4444] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md shadow-red-500/25">
                <Clock className="h-3.5 w-3.5" /> {campaign.name || "SEASONAL SALE"}
              </div>
              <h2 className="mt-0 mb-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0F172A] leading-[1.05]">
                {campaign.heading || "Special Deals."}
              </h2>
              <p className="mt-0 mb-3 text-lg font-semibold text-slate-600 sm:text-xl">
                {campaign.subtitle || "Limited Time."}
              </p>
              {campaign.description && (
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                  {campaign.description}
                </p>
              )}
              {campaign.countdownEnabled && !expired && (
                <div className="mt-4 mb-4 flex flex-wrap items-center gap-3">
                  {[
                    { v: countdown.days, l: "Days" },
                    { v: countdown.hrs, l: "Hrs" },
                    { v: countdown.mins, l: "Min" },
                    { v: countdown.secs, l: "Sec" },
                  ].map((x) => (
                    <div
                      key={x.l}
                      className="flex flex-col items-center gap-0.5 rounded-xl bg-white px-3 py-2 text-center border border-[#E2E8F0] shadow-sm"
                    >
                      <span className="text-2xl font-black tabular-nums text-[#0F172A]">
                        {String(x.v).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {x.l}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href={campaign.ctaLink || "/marketplace/deals"}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-3 text-sm font-black text-white hover:bg-slate-800 transition-colors shadow-lg shadow-black/15"
              >
                {campaign.ctaText || "Shop the Sale"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Right: Banner image */}
            <div className="flex-none lg:w-[56%]">
              {campaign.bannerImage ? (
                <div className="relative h-[200px] sm:h-[260px] lg:h-[320px] w-full overflow-hidden rounded-xl border border-[#E2E8F0] shadow-sm">
                  <img
                    src={marketImage(campaign.bannerImage)}
                    alt={campaign.heading}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="h-[200px] sm:h-[260px] lg:h-[320px] w-full rounded-xl border border-[#E2E8F0] bg-[#E2E8F0] flex items-center justify-center text-slate-300">
                  <RefreshCcw className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Landscape product carousel */}
        <div className="relative">
          {campaignProducts.length > 1 && (
            <>
              <button
                onClick={() => {
                  const el = carouselRef.current
                  if (el) el.scrollBy({ left: -340, behavior: "smooth" })
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-8 bg-gradient-to-r from-white/90 via-transparent"
                aria-label="Scroll left"
                disabled={scrollPos <= 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const el = carouselRef.current
                  if (el) el.scrollBy({ left: 340, behavior: "smooth" })
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-8 bg-gradient-to-l from-white/90 via-transparent"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div
            ref={carouselRef}
            className="seasonal-carousel flex min-w-0 flex-1 gap-5 overflow-x-auto snap-x pb-6 scroll-smooth"
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
                <div key={p.id} className="shrink-0 w-[300px] flex flex-col">
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm group">
                    {p.product_image_url ? (
                      <img
                        src={marketImage(p.product_image_url)}
                        alt={p.product_name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-200">
                        <RefreshCcw className="h-10 w-10" />
                      </div>
                    )}
                    <span
                      className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-[#EF4444] px-2 py-1 text-[10px] font-black text-white shadow-sm tracking-wider uppercase"
                      style={{ backgroundColor: cp.badgeColor || accent }}
                    >
                      {badgeFor(cp)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 px-0">
                    <Link
                      href={href || "/marketplace"}
                      aria-label={p.product_name}
                      className="block line-clamp-2 text-[13px] font-semibold leading-tight text-[#0F172A] transition-colors hover:text-[#EF4444]"
                      onClick={() => trackClick(p.id, "click")}
                    >
                      {cleanProductTitle(p.product_name)}
                    </Link>
                    {rating > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        <span className="text-[11px] font-medium text-slate-600">
                          {rating.toFixed(1)}
                        </span>
                        {reviewCount > 0 && (
                          <span className="text-[11px] text-slate-400">({reviewCount})</span>
                        )}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      {showStrike && (
                        <MarketPrice
                          usd={orig}
                          className="text-[11px] tabular-nums text-slate-400 line-through"
                        />
                      )}
                      <span className="text-[17px] font-black tabular-nums" style={{ color: String(campaign.settings?.priceColor ?? accent) }}>
                        {formatPrice(sale)}
                      </span>
                      {currency === "NGN" && (
                        <span className="text-[11px] text-slate-500 ml-1">
                          ≈ ₦{Math.max(1, Math.round(sale * ngnRate)).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 px-0">
                    <button
                      type="button"
                      onClick={() => addToCart(p.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EF4444] px-3 py-2.5 text-sm font-black text-white hover:bg-[#DC2626] transition-colors shadow-md shadow-red-500/20 active:scale-[0.99]"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                    </button>
                    {href && (
                      <Link
                        href={href}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#EF4444] hover:border-[#EF4444] transition-colors active:scale-[0.99]"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Product
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {Boolean(campaign.settings?.paginationDots) && campaignProducts.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {[...Array(pageCount)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const el = carouselRef.current
                    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" })
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    activeDot === i ? "bg-[#EF4444]" : "bg-slate-300"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

interface DbProductRow {
  id: string
  product_name: string
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  stock: number | null
}

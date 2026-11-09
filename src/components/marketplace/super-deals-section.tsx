"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Clock, Flame, Package, ShoppingCart, Star, Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { marketImage } from "@/lib/marketplace-images"
import { openQuickView } from "@/lib/marketplace-events"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { MarketPrice } from "./market-price"
import { cleanProductTitle } from "@/lib/marketplace-copy"
import {
  formatMarketPrice,
  useMarketCurrency,
} from "@/lib/marketplace-pricing"
import { useLiveNgnRate } from "@/lib/fx-client"

interface SuperDealProduct {
  id: string
  name: string
  image: string
  price: number
  oldPrice?: number
  rating?: number
  reviews?: number
  sale_pct?: number
}

interface SuperDealsConfig {
  enabled: boolean
  title: string
  subtitle: string
  kicker: string
  bannerImage: string
  bannerLink: string
  ctaText: string
  ctaLink: string
  countdownEnabled: boolean
  endAt: string
  maxProducts: number
  showDiscountBadge: boolean
  showRating: boolean
  showOriginalPrice: boolean
  autoplay: boolean
  autoplaySpeed: number
  products: SuperDealProduct[]
  autoSelect: boolean
  bgFrom: string
  bgTo: string
  accentColor: string
}

const FALLBACK_END_AT = "2026-12-31T23:59:59"

const EMPTY_CONFIG: SuperDealsConfig = {
  enabled: true,
  title: "SUPER DEAL",
  subtitle: "UP TO 70% OFF",
  kicker: "Super Deal",
  bannerImage: "",
  bannerLink: "/marketplace/deals",
  ctaText: "Shop Now",
  ctaLink: "/marketplace/deals",
  countdownEnabled: true,
  endAt: FALLBACK_END_AT,
  maxProducts: 8,
  showDiscountBadge: true,
  showRating: true,
  showOriginalPrice: true,
  autoplay: true,
  autoplaySpeed: 4,
  products: [],
  autoSelect: false,
  bgFrom: "#FF6B00",
  bgTo: "#D97706",
  accentColor: "#DC2626",
}

function splitCountdown(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return { days: d, hrs: h, mins: m, secs: s }
}

function flashSecondsLeft(endAt: string): number {
  const diff = Date.parse(endAt) - Date.now()
  return Math.max(0, Math.floor(diff / 1000))
}

export function SuperDealsSection() {
  const [config, setConfig] = useState<SuperDealsConfig>(EMPTY_CONFIG)
  const [loaded, setLoaded] = useState(false)
  const currency = useMarketCurrency()
  const ngnRate = useLiveNgnRate()
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_super_deals")
          .maybeSingle()
        const val = (data as { value?: unknown } | null)?.value
        if (val && typeof val === "object") {
          setConfig({ ...EMPTY_CONFIG, ...(val as Record<string, unknown>) })
        }
      } catch {
        // keep defaults
      } finally {
        setLoaded(true)
      }
    }
    load()
    const ch = createClient()
      .channel(`super_deals_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.marketplace_super_deals" },
        load
      )
      .subscribe()
    return () => {
      try {
        createClient().removeChannel(ch)
      } catch {}
    }
  }, [])

  // Auto-select discounted products when enabled.
  useEffect(() => {
    if (!loaded || !config.autoSelect) return
    const fetchDiscounted = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("affiliate_products")
          .select("id,product_name,product_image_url,sale_price,original_price")
          .eq("is_active", true)
          .not("original_price", "is", null)
          .order("original_price", { ascending: false })
          .limit(config.maxProducts)
        const rows = (data || []) as Array<{
          id: string
          product_name: string
          product_image_url: string | null
          sale_price: number | null
          original_price: number | null
        }>
        const products: SuperDealProduct[] = rows
          .filter((r) => Number(r.original_price ?? 0) > Number(r.sale_price ?? r.original_price ?? 0))
          .map((r) => {
            const sale = Number(r.sale_price ?? r.original_price ?? 0)
            const orig = Number(r.original_price ?? 0)
            return {
              id: r.id,
              name: r.product_name,
              image: r.product_image_url || "",
              price: sale,
              oldPrice: orig > sale ? orig : undefined,
              sale_pct: orig > sale ? Math.round(((orig - sale) / orig) * 100) : undefined,
              rating: 0,
              reviews: 0,
            }
          })
        setConfig((c) => ({ ...c, products }))
      } catch {
        // keep existing products
      }
    }
    fetchDiscounted()
  }, [loaded, config.autoSelect, config.maxProducts])

  if (!loaded || !config.enabled) return null

  const products = config.products.slice(0, config.maxProducts)

  const { days, hrs, mins, secs } = splitCountdown(
    config.countdownEnabled && config.endAt ? flashSecondsLeft(config.endAt) : 0
  )
  const countdownActive =
    config.countdownEnabled && config.endAt && (days > 0 || hrs > 0 || mins > 0 || secs > 0)
  const promotionExpired = config.endAt && flashSecondsLeft(config.endAt) <= 0

  const formatPrice = (usd: number) => formatMarketPrice(usd, ngnRate, currency)

  const bgGradient = `linear-gradient(135deg, ${config.bgFrom} 0%, ${config.bgTo} 100%)`
  const accent = config.accentColor || "#DC2626"

  return (
    <section aria-label="Super Deals" className="relative overflow-hidden mb-10 sm:mb-12 lg:mb-16">
      {/* Full-width orange/yellow gradient background spanning the viewport width. */}
      <div className="relative w-full overflow-hidden" style={{ background: bgGradient }}>
        {/* Decorative blue gradient shapes toward the right side */}
        <div className="absolute -top-32 -right-40 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-[320px] h-[320px] bg-blue-400/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 -right-16 w-[240px] h-[240px] bg-blue-600/10 rounded-full blur-[96px] pointer-events-none" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-20">
          <div className="flex flex-col lg:flex-row gap-12 items-start lg:items-center">
            {/* Left: Promotional area with large image + countdown timer */}
            <div className="flex-none lg:w-[44%] flex flex-col justify-center gap-4">
              <div className="inline-flex items-center gap-1.5 rounded bg-[#DC2626] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-2">
                <Flame className="h-4 w-4" /> {config.kicker}
              </div>
              <h2 className="mt-0 mb-3 text-5xl font-black tracking-tight text-[#DC2626] sm:text-6xl lg:text-7xl leading-[1.05] drop-shadow-sm">
                {config.title}
              </h2>
              <p className="mt-0 mb-6 text-xl font-semibold text-slate-800 sm:text-2xl tracking-wide">
                {config.subtitle}
              </p>
              {config.bannerImage && (
                <Link
                  href={config.bannerLink || "/marketplace/deals"}
                  aria-label={config.title}
                  className="mt-0 block shrink-0 overflow-hidden rounded-xl border border-white/30 shadow-lg"
                >
                  <img
                    src={marketImage(config.bannerImage)}
                    alt={config.title}
                    loading="lazy"
                    decoding="async"
                    className="h-[320px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              )}
              {!config.bannerImage && (
                <div className="mt-0 h-[320px] w-full rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner">
                  <Package className="h-16 w-16 text-slate-300" />
                  <span className="ml-4 text-sm font-medium text-slate-600">
                    {cleanProductTitle("Featured Deal")}
                  </span>
                </div>
              )}
              {/* Countdown timer — separate rectangular RED timer boxes below the image */}
              <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">
                  Ends in
                </span>
                {countdownActive && !promotionExpired ? (
                  <div className="flex gap-1.5">
                    {[
                      { v: days, l: "D" },
                      { v: hrs, l: "H" },
                      { v: mins, l: "M" },
                      { v: secs, l: "S" },
                    ].map((x) => (
                      <span
                        key={x.l}
                        className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#DC2626] px-2 text-[18px] font-black text-white shadow-xl"
                      >
                        {String(x.v).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-600 italic">
                    {promotionExpired ? "Promotion expired" : "No end date set"}
                  </span>
                )}
              </div>
              <Link
                href={config.ctaLink || "/marketplace/deals"}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#DC2626] px-8 py-3.5 text-sm font-black text-white hover:bg-[#B45309] transition-colors shadow-lg shadow-red-500/20"
              >
                {config.ctaText || "Shop Now"}
              </Link>
            </div>

            {/* Right: Product carousel */}
            <div className="flex-1 min-w-0 relative overflow-hidden">
              {products.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-white/60 text-sm">
                  No promotional products configured. Add products in Admin → Marketing → Super Deals.
                </div>
              ) : (
                <div className="relative block h-full w-full">
                  <div
                    className="super-deals-rail flex min-w-0 flex-1 gap-6 overflow-x-auto snap-x pb-4"
                    ref={railRef}
                    style={{ scrollbarWidth: "none" }}
                  >
                    {products.map((p) => {
                      const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
                      const showSale =
                        !!(p.sale_pct && p.sale_pct > 0) ||
                        !!(p.oldPrice && p.oldPrice > p.price)
                      const discount = showSale
                        ? p.sale_pct ??
                          Math.round(((p.oldPrice ?? p.price) - p.price) / (p.oldPrice ?? p.price) * 100)
                        : 0
                      const priceNgn = Math.max(1, Math.round(p.price * ngnRate))
                      return (
                        <div key={p.id} className="shrink-0 w-[200px] flex flex-col">
                          <Link
                            href={href || "/marketplace"}
                            aria-label={p.name}
                            className="block relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-white shadow-sm border border-[#E2E8F0] group"
                          >
                            {p.image ? (
                              <img
                                src={marketImage(p.image)}
                                alt={p.name}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-slate-200">
                                <Package className="h-10 w-10" />
                              </span>
                            )}
                            {showSale && config.showDiscountBadge && (
                              <span className="absolute left-3 top-3 z-10 flex h-8 items-center justify-center rounded bg-[#DC2626] px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
                                -{discount}%
                              </span>
                            )}
                            {/* Free delivery chip */}
                            <span className="absolute right-3 bottom-3 z-10 flex h-7 items-center justify-center rounded bg-[#10B981]/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                              <Truck className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                          <div className="mt-3 flex flex-col gap-1 px-1">
                            <p
                              title={p.name}
                              className="line-clamp-2 text-[13px] font-semibold leading-tight text-[#0F172A] transition-colors group-hover:text-[#B45309]"
                            >
                              {cleanProductTitle(p.name)}
                            </p>
                            <div className="mt-1.5 flex items-baseline gap-1">
                              {config.showOriginalPrice && p.oldPrice && p.oldPrice > p.price && (
                                <MarketPrice
                                  usd={p.oldPrice}
                                  className="text-[11px] tabular-nums text-slate-400 line-through"
                                />
                              )}
                              <span className="text-[16px] font-black tabular-nums text-[#DC2626]">
                                {formatPrice(p.price)}
                              </span>
                              {currency === "NGN" && (
                                <span className="text-[11px] text-slate-500 ml-1">
                                  ≈ ₦{priceNgn.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {config.showRating && p.rating && p.rating > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                                <span className="text-[11px] font-medium text-slate-600">
                                  {p.rating.toFixed(1)}
                                </span>
                                {p.reviews && (
                                  <span className="text-[11px] text-slate-400">({p.reviews})</span>
                                )}
                              </div>
                            )}
                          </div>
                          {href ? (
                            <Link href={href} aria-label={p.name} className="absolute inset-0 z-0 rounded-xl focus:outline-none" />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  {products.length > 2 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-8 bg-gradient-to-r from-[#FF6B00]/90 via-transparent">
                      <button
                        onClick={() => {
                          const el = railRef.current
                          if (el) el.scrollBy({ left: -420, behavior: "smooth" })
                        }}
                        className="p-3 rounded-full bg-white text-[#0F172A] hover:bg-[#FCD34D] transition-colors shadow-xl"
                        aria-label="Scroll left"
                      >
                        <span className="text-[12px] font-black">‹</span>
                      </button>
                    </div>
                  )}
                  {products.length > 2 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-8 bg-gradient-to-l from-[#FF6B00]/90 via-transparent">
                      <button
                        onClick={() => {
                          const el = railRef.current
                          if (el) el.scrollBy({ left: 420, behavior: "smooth" })
                        }}
                        className="p-3 rounded-full bg-white text-[#0F172A] hover:bg-[#FCD34D] transition-colors shadow-xl"
                        aria-label="Scroll right"
                      >
                        <span className="text-[12px] font-black">›</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

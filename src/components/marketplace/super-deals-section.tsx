"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Package,
  ShoppingCart,
  Star,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { marketImage } from "@/lib/marketplace-images"
import { openQuickView } from "@/lib/marketplace-events"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { MarketPrice } from "./market-price"
import { cleanProductTitle } from "@/lib/marketplace-copy"
import {
  formatMarketPrice,
  useMarketCurrency,
  useFxRate,
  usdToNgn,
} from "@/lib/marketplace-pricing"

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
  bannerImage: "",
  bannerLink: "/marketplace/deals",
  ctaText: "Shop Deals",
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
  bgFrom: "#F59E0B",
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
  const rate = useFxRate(currency)
  const ngnRate = useFxRate("NGN")
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

  const formatPrice = (usd: number) => formatMarketPrice(usd, rate, currency)

  // Decorative blue gradient shapes (CSS-only, positioned toward the right).
  const bgGradient = `linear-gradient(135deg, ${config.bgFrom} 0%, ${config.bgTo} 100%)`

  return (
    <section
      aria-label="Super Deals"
      className="relative overflow-hidden rounded-2xl shadow-sm border border-[#E2E8F0]"
      style={{ background: bgGradient }}
    >
      {/* Decorative blue shapes on the right side */}
      <div className="absolute -top-16 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]" />
      <div className="absolute top-1/3 -right-16 w-48 h-48 bg-blue-400/15 rounded-full blur-[64px]" />
      <div className="absolute bottom-8 -right-12 w-32 h-32 bg-blue-600/10 rounded-full blur-[40px]" />
      <div className="relative z-10 flex flex-col lg:flex-row gap-6 p-6 sm:p-8">
        {/* Left: Promotional area */}
        <div className="flex-none lg:w-[42%] flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            <Flame className="h-4 w-4" /> {config.title}
          </div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
            {config.subtitle}
          </h2>
          {config.bannerImage && (
            <Link
              href={config.bannerLink || "/marketplace/deals"}
              aria-label={config.title}
              className="mt-6 block shrink-0 overflow-hidden rounded-xl bg-white/10 aspect-[4/3]"
            >
              <img
                src={marketImage(config.bannerImage)}
                alt={config.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </Link>
          )}
          {!config.bannerImage && (
            <div className="mt-6 h-48 w-full rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Package className="h-10 w-10 text-white/40" />
              <span className="ml-2 text-sm text-white/60">{cleanProductTitle("Featured Deal")}</span>
            </div>
          )}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Ends in
            </span>
            {countdownActive && !promotionExpired ? (
              <div className="flex gap-1">
                {[days, hrs, mins, secs].map((v, i) => (
                  <span
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded bg-[#DC2626] px-1.5 text-xs font-extrabold text-white shadow-lg"
                  >
                    {String(v).padStart(2, "0")}
                  </span>
                ))}
                <span className="text-xs font-bold text-white/60 self-center">
                  :
                </span>
              </div>
            ) : (
              <span className="text-xs font-medium text-white/60 italic">
                {promotionExpired ? "Promotion expired" : "No end date set"}
              </span>
            )}
          </div>
          <Link
            href={config.ctaLink || "/marketplace/deals"}
            className="mt-6 inline-block rounded bg-white px-5 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#F59E0B] transition-colors"
          >
            {config.ctaText || "Shop Deals"}
          </Link>
        </div>

        {/* Right: Product carousel */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          {products.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-white/60 text-sm">
              No promotional products configured. Add products in Admin → Marketing → Super Deals.
            </div>
          ) : (
            <div className="relative block h-full w-full">
              <div
                className="super-deals-rail flex min-w-0 flex-1 gap-4 overflow-x-auto snap-x pb-2"
                ref={railRef}
                style={{ scrollbarWidth: "none" }}
              >
                <style>{`.super-deals-rail::-webkit-scrollbar{display:none}`}</style>
                {products.map((p) => {
                  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
                  const showSale =
                    !!(p.sale_pct && p.sale_pct > 0) ||
                    !!(p.oldPrice && p.oldPrice > p.price)
                  const discount = showSale
                    ? p.sale_pct ??
                      Math.round(((p.oldPrice ?? p.price) - p.price) / (p.oldPrice ?? p.price) * 100)
                    : 0
                  const priceNgn = usdToNgn(p.price, ngnRate)
                  return (
                    <div key={p.id} className="shrink-0 w-[170px] flex flex-col">
                      <Link
                        href={href || "/marketplace"}
                        aria-label={p.name}
                        className="block relative aspect-square w-full overflow-hidden rounded-xl bg-white shadow-sm border border-[#E2E8F0] group"
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
                            <Package className="h-8 w-8" />
                          </span>
                        )}
                        {showSale && config.showDiscountBadge && (
                          <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded bg-[#DC2626] px-1 text-[9px] font-extrabold text-white shadow-sm">
                            -{discount}%
                          </span>
                        )}
                      </Link>
                      <div className="mt-2 flex flex-col gap-1 px-1">
                        <p
                          title={p.name}
                          className="line-clamp-2 text-[12px] font-semibold leading-tight text-white transition-colors group-hover:text-[#FCD34D]"
                        >
                          {cleanProductTitle(p.name)}
                        </p>
                        <div className="mt-1 flex items-baseline gap-1">
                          {config.showOriginalPrice && p.oldPrice && p.oldPrice > p.price && (
                            <MarketPrice
                              usd={p.oldPrice}
                              className="text-[10px] tabular-nums text-white/50 line-through"
                            />
                          )}
                          <span className="text-[13px] font-extrabold tabular-nums text-white">
                            {formatPrice(p.price)}
                          </span>
                          {currency === "NGN" && (
                            <span className="text-[10px] text-white/50 ml-1">
                              ≈ {priceNgn}
                            </span>
                          )}
                        </div>
                        {config.showRating && p.rating && p.rating > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                            <span className="text-[10px] font-medium text-white/70">
                              {p.rating.toFixed(1)}
                            </span>
                            {p.reviews && (
                              <span className="text-[10px] text-white/40">({p.reviews})</span>
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3 py-4 bg-gradient-to-r from-[#F59E0B] via-transparent to-transparent">
                  <button
                    onClick={() => {
                      const el = railRef.current
                      if (el) el.scrollBy({ left: -340, behavior: "smooth" })
                    }}
                    className="p-2 rounded-full bg-white text-[#0F172A] hover:bg-[#FCD34D] transition-colors shadow-sm"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              )}
              {products.length > 2 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3 py-4 bg-gradient-to-l from-[#F59E0B] via-transparent to-transparent">
                  <button
                    onClick={() => {
                      const el = railRef.current
                      if (el) el.scrollBy({ left: 340, behavior: "smooth" })
                    }}
                    className="p-2 rounded-full bg-white text-[#0F172A] hover:bg-[#FCD34D] transition-colors shadow-sm"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft, ChevronRight, Clock, Flame, Package, ShoppingCart, Star,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { marketImage } from "@/lib/marketplace-images"
import { openQuickView } from "@/lib/marketplace-events"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { MarketPrice } from "./market-price"
import { cleanProductTitle } from "@/lib/marketplace-copy"
import { formatMarketPrice, useMarketCurrency, useFxRate } from "@/lib/marketplace-pricing"

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
}

const EMPTY_CONFIG: SuperDealsConfig = {
  enabled: false,
  title: "Super Deals",
  subtitle: "Up to 70% Off",
  bannerImage: "",
  bannerLink: "/marketplace/deals",
  ctaText: "Shop Deals",
  ctaLink: "/marketplace/deals",
  countdownEnabled: true,
  endAt: "",
  maxProducts: 8,
  showDiscountBadge: true,
  showRating: true,
  showOriginalPrice: true,
  autoplay: true,
  autoplaySpeed: 4,
  products: [],
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
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "key=eq.marketplace_super_deals" }, load)
      .subscribe()
    return () => {
      try { createClient().removeChannel(ch) } catch {}
    }
  }, [])

  const products = config.products.slice(0, config.maxProducts)

  // Auto-rotate product rail
  useEffect(() => {
    if (!loaded || !config.enabled || !config.autoplay || products.length <= config.maxProducts / 2) return
    const el = railRef.current
    if (!el) return
    let max = el.scrollWidth - el.clientWidth
    const t = setInterval(() => {
      max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: "smooth" })
      else el.scrollBy({ left: 320, behavior: "smooth" })
    }, config.autoplaySpeed * 1000)
    return () => clearInterval(t)
  }, [loaded, config.enabled, products.length, config.autoplay, config.autoplaySpeed])

  if (!loaded || !config.enabled) return null

  const { days, hrs, mins, secs } = splitCountdown(
    config.countdownEnabled && config.endAt ? flashSecondsLeft(config.endAt) : 0
  )
  const countdownActive = config.countdownEnabled && config.endAt && (days > 0 || hrs > 0 || mins > 0 || secs > 0)

  const formatPrice = (usd: number) => formatMarketPrice(usd, rate, currency)

  return (
    <section aria-label="Super Deals" className="bg-white rounded-2xl p-0 shadow-sm border border-[#E2E8F0] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[#DC2626] text-[11px] font-bold uppercase tracking-wider">{config.title}</span>
          <h2 className="text-lg font-extrabold text-[#0F172A] leading-tight">{config.subtitle}</h2>
        </div>
        {config.bannerImage && (
          <Link
            href={config.bannerLink || "/marketplace/deals"}
            aria-label={config.title}
            className="relative block w-[220px] shrink-0 overflow-hidden rounded-xl bg-[#F1F5F9] aspect-[16/9]"
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
      </div>

      <div className="px-5 py-5 flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Left: Promotional banner + countdown */}
        <div className="flex-none lg:w-[23%] relative overflow-hidden rounded-xl bg-[#F1F5F9] min-h-[260px] lg:min-h-[320px] flex flex-col">
          {config.bannerImage ? (
            <Link
              href={config.bannerLink || "/marketplace/deals"}
              aria-label={config.title}
              className="relative block h-[40%] w-full overflow-hidden"
            >
              <img
                src={marketImage(config.bannerImage)}
                alt={config.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </Link>
          ) : (
            <div className="relative h-[40%] w-full bg-gradient-to-br from-[#0F172A]/85 to-[#0F172A]/50 flex items-end p-4">
              <span className="text-[#F59E0B] text-[11px] font-bold uppercase tracking-wider">{config.title}</span>
              <h3 className="text-xl font-extrabold text-white mt-1 leading-tight">{config.subtitle}</h3>
            </div>
          )}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Amazing deals on top tech products. Limited time offers — shop now before they&apos;re gone.
              </p>
              {countdownActive && (
                <div className="mt-4 flex items-center gap-1.5">
                  {[
                    { v: days, l: "D" },
                    { v: hrs, l: "H" },
                    { v: mins, l: "M" },
                    { v: secs, l: "S" },
                  ].map((x, i, arr) => (
                    <span key={x.l} className="flex items-center gap-1">
                      <span className="min-w-6 rounded-lg bg-[#F8FAFC] px-1.5 py-1 text-center text-[10px] font-bold tabular-nums text-[#DC2626]">
                        {x.v}
                      </span>
                      {i < arr.length - 1 && <span className="text-[10px] font-bold text-slate-400">:</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Link
              href={config.ctaLink || "/marketplace/deals"}
              className="inline-block bg-[#0F172A] text-white text-[12px] font-bold px-4 py-2 rounded hover:bg-[#1a202c] transition-colors text-center"
            >
              {config.ctaText || "Shop Deals"}
            </Link>
          </div>
        </div>

        {/* Right: Product carousel */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          {products.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
              No promotional products configured. Add products in Admin → Marketing → Super Deals.
            </div>
          ) : (
            <div className="relative block h-full w-full">
              <div className="super-deals-rail flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1 snap-x" ref={railRef}>
                {products.map((p) => {
                  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
                  const showSale = !!(p.sale_pct && p.sale_pct > 0) || !!(p.oldPrice && p.oldPrice > p.price)
                  const discount = showSale ? (p.sale_pct ?? Math.round(((p.oldPrice ?? p.price) - p.price) / (p.oldPrice ?? p.price) * 100)) : 0
                  return (
                    <div key={p.id} className="shrink-0 w-[150px] flex flex-col">
                      <Link
                        href={href || "/marketplace"}
                        aria-label={p.name}
                        className="block relative aspect-square w-full overflow-hidden rounded-lg bg-[#F8FAFC] group"
                      >
                        {p.image ? (
                          <img
                            src={marketImage(p.image)}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-slate-300">
                            <Package className="h-8 w-8" />
                          </span>
                        )}
                        {showSale && config.showDiscountBadge && (
                          <span className="absolute left-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#F59E0B] text-[10px] font-extrabold text-[#0F172A] shadow-sm">
                            -{discount}%
                          </span>
                        )}
                      </Link>
                      <div className="mt-1.5 flex flex-col gap-0.5 px-1">
                        <p title={p.name} className="line-clamp-2 text-[12px] font-semibold leading-tight text-[#0F172A] transition-colors group-hover:text-[#B45309]">
                          {cleanProductTitle(p.name)}
                        </p>
                        <div className="flex items-baseline gap-1">
                          {config.showOriginalPrice && p.oldPrice && p.oldPrice > p.price && (
                            <MarketPrice usd={p.oldPrice} className="text-[10px] tabular-nums text-slate-400 line-through" />
                          )}
                          <MarketPrice usd={p.price} className="text-[13px] font-extrabold tabular-nums text-[#0F172A]" />
                        </div>
                        {config.showRating && p.rating && p.rating > 0 && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                            <span className="text-[10px] font-medium text-slate-600">{p.rating.toFixed(1)}</span>
                            {p.reviews && <span className="text-[10px] text-slate-400">({p.reviews})</span>}
                          </div>
                        )}
                      </div>
                      {href ? (
                        <Link href={href} aria-label={p.name} className="absolute inset-0 z-0 rounded-lg focus:outline-none" />
                      ) : null}
                    </div>
                  )
                })}
                {products.length > 4 && (
                  <div className="absolute right-0 top-0 bottom-0 flex items-center px-2 bg-gradient-to-r from-white via-white/40 to-transparent pointer-events-none" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

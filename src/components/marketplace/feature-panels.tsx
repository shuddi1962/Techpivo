"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Star, ShoppingCart, Heart, ArrowLeftRight } from "lucide-react"
import type { DemoProduct } from "@/lib/marketplace"
import { marketImage } from "@/lib/marketplace-images"
import { MarketPrice } from "./market-price"
import { useSaleBadge } from "./market-flags"
import { addToCart as addLine } from "@/lib/marketplace-cart"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"

export function discountPct(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round((1 - price / oldPrice) * 100)
}

/** Build four thumbnail candidates from the product's single image so the
 *  shopper can pick a view. Real image URLs only — no placeholder/fake art. */
function thumbVariants(image: string): string[] {
  const src = marketImage(image)
  if (!src) return ["", "", "", ""]
  const sizes = [900, 600, 400, 300]
  try {
    const u = new URL(src)
    return sizes.map((w) => {
      const v = new URL(u)
      v.searchParams.set("w", String(w))
      return v.toString()
    })
  } catch {
    return [src, src, src, src]
  }
}

interface CardProps {
  p: DemoProduct
  title: string
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}

function PanelStars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`} />
      ))}
    </span>
  )
}

function rotateItems<T extends { id: string }>(items: T[], offset = 0): T[] {
  if (items.length === 0) return items
  const start = ((offset % items.length) + items.length) % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

function ShowcaseCard({ p, title, onAdd, added, wished, onWish }: CardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [selected, setSelected] = useState(0)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const [compared, setCompared] = useState<boolean>(() => readCompare()[p.id] === true)

  const pct = discountPct(p.price, p.oldPrice)
  const saleBadgeAllowed = useSaleBadge(p.id)
  const showSale = pct > 0 && saleBadgeAllowed
  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const thumbs = thumbVariants(p.image)
  const activeThumb = thumbs[selected] || p.image
  const avg = p.rating || 0
  const priceUsd = Number(p.price || 0)
  const saleUsd = showSale && p.oldPrice && p.oldPrice > priceUsd ? priceUsd : null
  const oldUsd = showSale && p.oldPrice ? Number(p.oldPrice) : null

  // Stay in sync with compare toggles made anywhere else on the site.
  useEffect(() => {
    const onChange = () => setCompared(readCompare()[p.id] === true)
    window.addEventListener("tp-market-compare", onChange)
    return () => window.removeEventListener("tp-market-compare", onChange)
  }, [p.id])

  const scrollThumbs = useCallback(
    (delta: number) => {
      const el = thumbsRef.current
      if (!el) return
      el.scrollBy({ top: delta * 104, behavior: "smooth" })
    },
    []
  )

  const toggleCompare = () => {
    const next = toggleCompareStored(p.id)
    setCompared(next)
  }

  const handleAdd = () => {
    if (!href) return
    onAdd(p)
  }

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
      <span className="inline-flex items-center gap-1 rounded-r-2xl bg-[#FFD000] px-3 py-1.5 text-[#0F172A] font-bold text-sm tracking-tight">
        {title}
      </span>
      <button
        type="button"
        onClick={collapsed ? () => setCollapsed(false) : () => setCollapsed(true)}
        aria-label={collapsed ? "Expand section" : "Collapse section"}
        className="rounded-full p-1.5 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-slate-500 transition-colors"
      >
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
    </div>
  )

  if (collapsed) {
    return (
      <section className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {header}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden flex flex-col">
      {header}

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left: main product image */}
          <div className="relative aspect-square w-full min-h-[260px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg overflow-hidden flex items-center justify-center">
            {activeThumb ? (
              <img
                src={activeThumb}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain bg-white"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-200">
                <Star className="h-10 w-10" />
              </div>
            )}
            {showSale && (
              <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-[#FFD000] px-2.5 py-1 text-[11px] font-extrabold text-[#0F172A] shadow-sm">
                -{pct}%
              </span>
            )}
            <button
              type="button"
              onClick={() => scrollThumbs(-1)}
              aria-label="Scroll thumbnails up"
              className="absolute top-2 right-2 z-30 rounded-full p-1.5 bg-white/90 border border-[#E2E8F0] text-slate-500 hover:bg-white hover:text-[#0F172A] transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollThumbs(1)}
              aria-label="Scroll thumbnails down"
              className="absolute bottom-2 right-2 z-30 rounded-full p-1.5 bg-white/90 border border-[#E2E8F0] text-slate-500 hover:bg-white hover:text-[#0F172A] transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: vertically stacked thumbnails */}
          <div className="flex flex-col gap-2 h-full min-h-[260px]">
            <div
              ref={thumbsRef}
              className="flex flex-col gap-2 overflow-y-auto pr-1.5 max-h-[400px] scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {thumbs.map((thumb, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={`Thumbnail view ${i + 1}`}
                  aria-pressed={selected === i}
                  className={`aspect-square w-full shrink-0 border rounded-lg bg-white flex items-center justify-center overflow-hidden transition-colors ${
                    selected === i ? "border-[#FFD000] ring-1 ring-[#FFD000]" : "border-[#E2E8F0] hover:border-slate-400"
                  }`}
                >
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain bg-white" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-200">
                      <Star className="h-8 w-8" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: product information + shopping actions */}
        <div className="mt-4 border-t border-[#E2E8F0] pt-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div className="flex flex-col gap-1 lg:flex-1">
              <p title={p.name} className="font-bold text-[#0F172A] text-sm leading-snug line-clamp-2">
                {p.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PanelStars value={avg} size="h-3.5 w-3.5" />
                {avg > 0 ? (
                  <span className="text-xs text-[#F59E0B] font-bold">{avg.toFixed(1)}</span>
                ) : (
                  <span className="text-xs text-slate-400">Unrated</span>
                )}
                <span className="text-xs text-slate-500">({p.reviews || 0})</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                {saleUsd != null ? (
                  <>
                    <span className="font-extrabold text-[#DC2626]"><MarketPrice usd={saleUsd} /></span>
                    <span className="text-sm text-slate-400 line-through"><MarketPrice usd={oldUsd} /></span>
                  </>
                ) : (
                  <span className="font-extrabold text-[#0F172A]"><MarketPrice usd={priceUsd} /></span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 lg:flex-shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!href}
                aria-label={added[p.id] ? "Added to cart" : `Add ${p.name} to cart`}
                className={`flex-1 lg:flex-none items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#E2E8F0] ${
                  added[p.id] ? "border-[#0F172A] bg-[#0F172A] text-white" : ""
                }`}
              >
                {added[p.id] ? (
                  <>
                    <ShoppingCart className="h-4 w-4" strokeWidth={2} /> Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" strokeWidth={2} /> Add to Cart
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onWish(p.id)}
                aria-label={wished[p.id] ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={!!wished[p.id]}
                className={`p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] transition-colors hover:bg-[#E2E8F0] ${
                  wished[p.id] ? "border-[#EF4444] text-[#EF4444]" : "text-slate-500 hover:text-[#EF4444]"
                }`}
              >
                <Heart className={`h-5 w-5 ${wished[p.id] ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={toggleCompare}
                aria-label={compared ? "Remove from compare" : "Add to compare"}
                aria-pressed={compared}
                className={`p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] transition-colors hover:bg-[#E2E8F0] ${
                  compared ? "border-[#0F172A] text-[#0F172A]" : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface PanelGroup {
  title: string
  items: DemoProduct[]
  shopAllHref?: string
  offset?: number
}

export function FeaturePanels({
  groups,
  onAdd,
  added,
  wished,
  onWish,
}: {
  groups: Array<PanelGroup>
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}) {
  const live = groups
    .map((g) => ({
      ...g,
      items: rotateItems(g.items, g.offset ?? 0),
    }))
    .filter((g) => g.items.length > 0)
  if (live.length === 0) return null

  return (
    <section aria-label="Featured product showcase" className="bg-[#F8FAFC]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {live.map((g) => {
          const p = g.items[0]
          return p ? (
            <section key={g.title} className="flex flex-col">
              <ShowcaseCard p={p} title={g.title} onAdd={onAdd} added={added} wished={wished} onWish={onWish} />
            </section>
          ) : null
        })}
      </div>
    </section>
  )
}

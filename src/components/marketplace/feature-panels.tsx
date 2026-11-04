"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowLeftRight, Check, ChevronDown, ChevronUp, Eye, Heart, ShoppingCart, Star,
} from "lucide-react"
import type { DemoProduct } from "@/lib/marketplace"
import { openQuickView } from "@/lib/marketplace-events"
import { marketImage } from "@/lib/marketplace-images"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { MarketPrice } from "./market-price"
import { useSaleBadge } from "./market-flags"

export function PanelStars({ value }: { value: number }) {
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

export function discountPct(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round((1 - price / oldPrice) * 100)
}

interface PanelActions {
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}

function FeaturedCard({ p, onAdd, added, wished, onWish }: { p: DemoProduct } & PanelActions) {
  const [compared, setCompared] = useState<Record<string, boolean>>(() => readCompare())
  const pct = discountPct(p.price, p.oldPrice)
  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const saleBadgeAllowed = useSaleBadge(p.id)
  const showSale = pct > 0 && saleBadgeAllowed
  const flipCompare = () => setCompared((m) => ({ ...m, [p.id]: toggleCompareStored(p.id) }))

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-all hover:scale-105 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B] active:scale-95"
  return (
    <div className="group flex w-44 shrink-0 snap-start flex-col bg-white rounded-xl border border-[#E5E7EB] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] focus-within:ring-2 focus-within:ring-[#F59E0B] sm:w-52">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white">
        <div className="h-full w-full p-3">
          {p.image ? (
            <img src={marketImage(p.image)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
          ) : null}
        </div>
        {showSale && (
          <span className="absolute left-1.5 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B] text-[11px] font-extrabold text-[#0F172A] shadow-sm">
            -{pct}%
          </span>
        )}
        <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <button
            type="button"
            onClick={() => onWish(p.id)}
            aria-label={wished[p.id] ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={!!wished[p.id]}
            title="Wishlist"
            className={`${iconBtn} ${wished[p.id] ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
          >
            <Heart className={`h-4 w-4 ${wished[p.id] ? "fill-current" : ""}`} />
          </button>
          {href && (
            <button
              type="button"
              onClick={() => openQuickView(p.id)}
              aria-label={`Quick view ${p.name}`}
              title="Quick view"
              className={iconBtn}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={flipCompare}
            aria-label={compared[p.id] ? "Remove from compare" : "Add to compare"}
            aria-pressed={!!compared[p.id]}
            title="Compare"
            className={`${iconBtn} ${compared[p.id] ? "!bg-[#0F172A] !text-white" : ""}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
        {href && (
          <div className="absolute inset-x-2 bottom-2 z-10 hidden translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 md:block">
            <button
              type="button"
              onClick={() => onAdd(p)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold shadow-[0_8px_24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-colors active:scale-[0.99] ${added[p.id] ? "bg-[#0B0F19]/95 text-white" : "bg-[#0F172A]/95 text-white hover:bg-[#F59E0B] hover:text-[#0F172A]"}`}
            >
              {added[p.id] ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-1 flex-col gap-1">
        <p title={p.name} className="line-clamp-2 text-[13px] font-semibold text-[#0F172A] transition-colors group-hover:text-[#B45309]">{p.name}</p>
        <div className="flex items-baseline gap-1.5">
          <MarketPrice usd={p.price} className="text-[15px] font-extrabold tabular-nums text-[#0F172A]" />
          {showSale && p.oldPrice && p.oldPrice > p.price && (
            <MarketPrice usd={p.oldPrice} className="text-xs tabular-nums text-slate-400 line-through" />
          )}
        </div>
        {/* mobile add to cart */}
        <button
          type="button"
          onClick={() => onAdd(p)}
          aria-label={added[p.id] ? "Added to cart" : `Add ${p.name} to cart`}
          className={`relative z-10 mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors active:scale-[0.99] md:hidden ${added[p.id] ? "bg-[#0B0F19] text-white" : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"}`}
        >
          {added[p.id] ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
        </button>
      </div>
      {href ? (
        <Link href={href} aria-label={p.name} className="absolute inset-0 z-0 rounded-xl focus:outline-none" />
      ) : null}
    </div>
  )
}

function panelHref(title: string): string {
  const map: Record<string, string> = {
    "New Arrivals": "/marketplace/new-arrivals",
    "Featured Products": "/marketplace/new-arrivals",
    "Best Selling": "/marketplace/best-sellers",
  }
  return map[title] || "/marketplace"
}

export function FeaturePanels({
  groups,
  onAdd,
  added,
  wished,
  onWish,
}: {
  groups: Array<{ title: string; items: DemoProduct[] }>
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}) {
  const live = groups.filter((g) => g.items.length > 0)
  if (live.length === 0) return null
  return (
    <section aria-label="Featured product panels" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
      {live.map((g) => (
        <section key={g.title} className="mb-10 last:mb-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-[#0F172A]">{g.title}</h2>
            <Link
              href={panelHref(g.title)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#B45309] hover:text-[#D97706] hover:underline transition-colors"
            >
              Shop {g.title} <span className="text-[#B45309]">→</span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x" style={{ scrollbarWidth: "none" }}>
            {g.items.map((p) => (
              <FeaturedCard key={p.id} p={p} onAdd={onAdd} added={added} wished={wished} onWish={onWish} />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}

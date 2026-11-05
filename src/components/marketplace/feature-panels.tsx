"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRight, Star, ChevronUp } from "lucide-react"
import type { DemoProduct } from "@/lib/marketplace"
import { marketImage } from "@/lib/marketplace-images"
import { MarketPrice } from "./market-price"
import { useSaleBadge, useProductDiscount } from "./market-flags"

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

interface PanelGroup {
  title: string
  items: DemoProduct[]
  shopAllHref?: string
  offset?: number
}

/** Small card: image + title + price only (no description). */
function PanelCard({ p, onAdd, added, wished, onWish }: { p: DemoProduct } & PanelActions) {
  const [expanded, setExpanded] = useState(false)
  const [compared, setCompared] = useState<Record<string, boolean>>(() => ({}))
  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const { pct: discount, oldPrice } = useProductDiscount(p, p.id)
  const showSale = discount > 0
  const toggleCompare = () => setCompared((m) => ({ ...m, [p.id]: !m[p.id] }))

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-all hover:scale-105 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B] active:scale-95"

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.20)] focus-within:ring-2 focus-within:ring-[#F59E0B]">
      {/* hero image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-[#F8FAFC]">
        {p.image ? (
          <img
            src={marketImage(p.image)}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-200">
            <Star className="h-10 w-10" />
          </div>
        )}
        {showSale && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#DC2626] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm">
            <ChevronUp className="h-3.5 w-3.5" /> -{discount}%
          </span>
        )}
        {/* top-right icon rail */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onWish(p.id)}
            aria-label={wished[p.id] ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={!!wished[p.id]}
            title="Wishlist"
            className={`${iconBtn} ${wished[p.id] ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
          >
            <Star className={`h-4 w-4 ${wished[p.id] ? "fill-current text-[#EF4444]" : ""}`} />
          </button>
          {href && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label="Quick view"
              title="Quick view"
              className={iconBtn}
            >
              <Star className="h-4 w-4 text-[#F59E0B]" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleCompare}
            aria-label={compared[p.id] ? "Remove from compare" : "Add to compare"}
            aria-pressed={!!compared[p.id]}
            title="Compare"
            className={`${iconBtn} ${compared[p.id] ? "!bg-[#0F172A] !text-white" : ""}`}
          >
            <Star className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        {/* add to cart slide-up */}
        {href && (
          <div className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 md:block">
            <button
              type="button"
              onClick={() => onAdd(p)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold shadow-[0_8px_24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-colors active:scale-[0.99] ${added[p.id] ? "bg-[#0B0F19]/95 text-white" : "bg-white/95 text-[#0F172A] hover:bg-[#F59E0B]"}`}
            >
              {added[p.id] ? "Added to bag" : "Add to cart"}
            </button>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex-col gap-1">
        <p title={p.name} className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#0F172A] transition-colors group-hover:text-[#B45309]">
          {p.name}
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <MarketPrice usd={p.price} className="text-[15px] font-extrabold tabular-nums text-[#0F172A]" />
          {showSale && oldPrice && (
            <MarketPrice usd={oldPrice} className="text-xs tabular-nums text-slate-400 line-through" />
          )}
        </div>
        {expanded && (
          <div className="mt-2 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-slate-600">
              Tap the card to see full details, variants, and shipping options on the product page.
            </p>
          </div>
        )}
      </div>
      {href ? (
        <Link href={href} aria-label={p.name} className="absolute inset-0 z-0 rounded-xl focus:outline-none" />
      ) : null}
    </div>
  )
}

/** Main large card for the top of each column. */
function PanelHero({ p, onAdd, added, wished, onWish }: { p: DemoProduct } & PanelActions) {
  const [expanded, setExpanded] = useState(false)
  const [compared, setCompared] = useState<Record<string, boolean>>(() => ({}))
  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const { pct: discount, oldPrice } = useProductDiscount(p, p.id)
  const showSale = discount > 0
  const toggleCompare = () => setCompared((m) => ({ ...m, [p.id]: !m[p.id] }))

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-all hover:scale-105 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B] active:scale-95"

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)] focus-within:ring-2 focus-within:ring-[#F59E0B]">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-[#F8FAFC]">
        {p.image ? (
          <img
            src={marketImage(p.image)}
            alt={p.name}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-200">
            <Star className="h-12 w-12" />
          </div>
        )}
        {showSale && (
          <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-[#DC2626] px-3 py-1.5 text-[12px] font-extrabold tracking-wide text-white shadow-md">
            <ChevronUp className="h-4 w-4" /> -{discount}%
          </span>
        )}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onWish(p.id)}
            aria-label={wished[p.id] ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={!!wished[p.id]}
            title="Wishlist"
            className={`${iconBtn} ${wished[p.id] ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
          >
            <Star className={`h-5 w-5 ${wished[p.id] ? "fill-current text-[#EF4444]" : ""}`} />
          </button>
          {href && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label="Quick view"
              title="Quick view"
              className={iconBtn}
            >
              <Star className="h-5 w-5 text-[#F59E0B]" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleCompare}
            aria-label={compared[p.id] ? "Remove from compare" : "Add to compare"}
            aria-pressed={!!compared[p.id]}
            title="Compare"
            className={`${iconBtn} ${compared[p.id] ? "!bg-[#0F172A] !text-white" : ""}`}
          >
            <Star className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        {href && (
          <div className="absolute inset-x-4 bottom-4 z-10 hidden translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 md:block">
            <button
              type="button"
              onClick={() => onAdd(p)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold shadow-[0_8px_24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-colors active:scale-[0.99] ${added[p.id] ? "bg-[#0B0F19]/95 text-white" : "bg-white/95 text-[#0F172A] hover:bg-[#F59E0B]"}`}
            >
              {added[p.id] ? "Added to bag" : "Add to cart"}
            </button>
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex-col gap-1.5">
        <p title={p.name} className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#0F172A] transition-colors group-hover:text-[#B45309]">
          {p.name}
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <MarketPrice usd={p.price} className="text-[18px] font-extrabold tabular-nums text-[#0F172A]" />
          {showSale && p.oldPrice && p.oldPrice > p.price && (
            <MarketPrice usd={p.oldPrice} className="text-sm tabular-nums text-slate-400 line-through" />
          )}
        </div>
        {expanded && (
          <div className="mt-2 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-slate-600">
              Tap to see full details, variants, and shipping options on the product page.
            </p>
          </div>
        )}
      </div>
      {href ? (
        <Link href={href} aria-label={p.name} className="absolute inset-0 z-0 rounded-xl focus:outline-none" />
      ) : null}
    </div>
  )
}

function rotateItems<T extends { id: string }>(items: T[], offset = 0): T[] {
  if (items.length === 0) return items
  const start = ((offset % items.length) + items.length) % items.length
  return [...items.slice(start), ...items.slice(0, start)]
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
    <section aria-label="Featured product panels" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {live.map((g) => {
          const hero = g.items[0]
          const rest = g.items.slice(1, 5)
          return (
            <section key={g.title} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="relative inline-block">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-[12px] font-extrabold text-white tracking-tight shadow-lg shadow-[#F59E0B]/40">
                    {g.title}
                  </span>
                </div>
                {g.shopAllHref && (
                  <Link
                    href={g.shopAllHref}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#B45309] hover:text-[#D97706] hover:underline transition-colors"
                  >
                    Shop all {g.title.toLowerCase()} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              {hero ? (
                <PanelHero p={hero} onAdd={onAdd} added={added} wished={wished} onWish={onWish} />
              ) : null}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {rest.map((p) => (
                    <PanelCard key={p.id} p={p} onAdd={onAdd} added={added} wished={wished} onWish={onWish} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

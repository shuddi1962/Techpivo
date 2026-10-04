"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowLeftRight, Check, ChevronLeft, ChevronRight, Flame, Heart, ShoppingCart,
} from "lucide-react"
import type { DemoProduct } from "@/lib/marketplace"
import { marketImage } from "@/lib/marketplace-images"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { PanelStars, discountPct } from "./feature-panels"

interface ShowcaseActions {
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}

export interface ShowcaseNavItem {
  name: string
  slug: string
  count: number
}

function ShowcaseCard({ p, onAdd, added, wished, onWish }: { p: DemoProduct } & ShowcaseActions) {
  const [compared, setCompared] = useState<Record<string, boolean>>(() => readCompare())
  const pct = discountPct(p.price, p.oldPrice)
  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const flipCompare = () => setCompared((m) => ({ ...m, [p.id]: toggleCompareStored(p.id) }))

  return (
    <div className="flex w-44 shrink-0 snap-start flex-col bg-white rounded-xl border border-[#E5E7EB] p-3 sm:w-52">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white">
        {href ? (
          <Link href={href} aria-label={p.name} className="block h-full w-full p-3">
            {p.image ? (
              <img src={marketImage(p.image)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
            ) : null}
          </Link>
        ) : (
          <div className="h-full w-full p-3">
            {p.image ? (
              <img src={marketImage(p.image)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
            ) : null}
          </div>
        )}
        {pct > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B] text-[11px] font-extrabold text-[#0F172A] shadow-sm">
            -{pct}%
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-1 flex-col gap-1">
        {href ? (
          <Link href={href} title={p.name} className="block truncate text-[13px] font-semibold text-[#0F172A] hover:text-[#B45309]">
            {p.name}
          </Link>
        ) : (
          <p title={p.name} className="truncate text-[13px] font-semibold text-[#0F172A]">{p.name}</p>
        )}
        <PanelStars value={p.rating} />
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold tabular-nums text-[#0F172A]">${p.price.toFixed(2)}</span>
          {p.oldPrice && p.oldPrice > p.price && (
            <span className="text-xs tabular-nums text-slate-400 line-through">${p.oldPrice.toFixed(2)}</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAdd(p)}
            aria-label={added[p.id] ? "Added to cart" : `Add ${p.name} to cart`}
            title={added[p.id] ? "Added to cart" : "Add to cart"}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-colors ${added[p.id] ? "bg-[#10B981] text-white" : "bg-slate-100 text-[#0F172A] hover:bg-[#F59E0B]"}`}
          >
            {added[p.id] ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{added[p.id] ? "Added" : "Add to cart"}</span>
          </button>
          <button
            type="button"
            onClick={() => onWish(p.id)}
            aria-label={wished[p.id] ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={!!wished[p.id]}
            title="Wishlist"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${wished[p.id] ? "border-[#EF4444] bg-[#EF4444] text-white" : "border-[#E5E7EB] text-slate-500 hover:text-[#EF4444]"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${wished[p.id] ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            onClick={flipCompare}
            aria-label={compared[p.id] ? "Remove from compare" : "Add to compare"}
            aria-pressed={!!compared[p.id]}
            title="Compare"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${compared[p.id] ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-[#E5E7EB] text-slate-500 hover:text-[#0F172A]"}`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function CategoryShowcase({
  title,
  deptSlug,
  nav,
  totalCount,
  items,
  onAdd,
  added,
  wished,
  onWish,
}: {
  title: string
  deptSlug: string
  nav: ShowcaseNavItem[]
  totalCount: number
  items: Array<DemoProduct & { subSlug?: string | null }>
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}) {
  const [active, setActive] = useState<string | null>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const pauseRef = useRef(false)

  // Auto-moving rail — glides on its own, pauses while touched, wraps
  // around at the end for a non-stop loop feel. No visible scrollbar.
  useEffect(() => {
    const t = setInterval(() => {
      const el = railRef.current
      if (!el || pauseRef.current || document.hidden) return
      const max = el.scrollWidth - el.clientWidth - 8
      if (max <= 0) return
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: "smooth" })
      else el.scrollBy({ left: 320, behavior: "smooth" })
    }, 3200)
    return () => clearInterval(t)
  }, [])

  const shown = active ? items.filter((p) => p.subSlug === active) : items

  if (items.length === 0) return null

  const scroll = (dir: 1 | -1) =>
    railRef.current?.scrollBy({ left: dir * 640, behavior: "smooth" })

  const pill = (isActive: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
      isActive ? "bg-[#0F172A] text-white" : "text-slate-500 hover:text-[#0F172A] hover:bg-slate-100"
    }`

  return (
    <section aria-label={title} className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
      <style>{`.showcase-rail{scrollbar-width:none;-ms-overflow-style:none}.showcase-rail::-webkit-scrollbar{display:none}`}</style>
      {/* header: title + yellow underline, shop-all, arrows */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-[#0F172A]">{title}</h2>
          <span className="mt-1 block h-1 w-12 rounded-full bg-[#F59E0B]" aria-hidden />
        </div>
        <Link
          href={`/marketplace/category/${deptSlug}`}
          className="text-sm font-semibold text-[#B45309] hover:underline"
        >
          Shop all {title.toLowerCase()} →
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} products left`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] transition-colors hover:border-[#F59E0B]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} products right`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] transition-colors hover:border-[#F59E0B]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* subcategory pills — horizontal, landscape */}
      <nav aria-label={`${title} categories`} className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-pressed={active === null}
          className={pill(active === null)}
        >
          <span>All</span>
          <span className={`text-[11px] tabular-nums ${active === null ? "text-white/70" : "text-slate-400"}`}>
            ({totalCount})
          </span>
        </button>
        {nav.map((n) => (
          <button
            key={n.slug}
            type="button"
            onClick={() => setActive(n.slug)}
            aria-pressed={active === n.slug}
            className={pill(active === n.slug)}
          >
            <span className="whitespace-nowrap">{n.name}</span>
            <span className={`text-[11px] tabular-nums ${active === n.slug ? "text-white/70" : "text-slate-400"}`}>
              ({n.count})
            </span>
          </button>
        ))}
      </nav>

      {/* side promo banner + product rail — scrollbar hidden */}
      <div className="flex gap-3">
        <Link
          href="/marketplace/deals"
          className="flex w-36 shrink-0 flex-col justify-between self-stretch overflow-hidden rounded-xl bg-[#DC2626] p-4 text-white sm:w-52"
        >
          <span className="inline-flex w-fit items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase">
            <Flame className="h-3 w-3" /> Special
          </span>
          <span className="mt-6 block">
            <span className="block text-3xl font-extrabold leading-none">SALE</span>
            <span className="mt-1 block text-xs font-semibold text-white/85">Up to 50% off {title.toLowerCase()}</span>
          </span>
          <span className="mt-6 inline-flex w-fit items-center rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#991B1B]">
            Shop now
          </span>
        </Link>
        <div
          className="showcase-rail flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1 snap-x"
          ref={railRef}
          onMouseEnter={() => { pauseRef.current = true }}
          onMouseLeave={() => { pauseRef.current = false }}
          onTouchStart={() => { pauseRef.current = true }}
          onTouchEnd={() => { pauseRef.current = false }}
        >
          {shown.map((p) => (
            <ShowcaseCard key={p.id} p={p} onAdd={onAdd} added={added} wished={wished} onWish={onWish} />
          ))}
          {shown.length === 0 && (
            <p className="flex items-center px-4 text-sm text-slate-500">No products in this category yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}

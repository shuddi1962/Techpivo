"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowLeftRight, Check, ChevronLeft, ChevronRight, Eye, Flame, Heart, ShoppingCart,
} from "lucide-react"
import type { DemoProduct } from "@/lib/marketplace"
import { openQuickView } from "@/lib/marketplace-events"
import { marketImage } from "@/lib/marketplace-images"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { discountPct } from "./feature-panels"
import { MarketPrice } from "./market-price"
import { SaleCountdown, useSaleEnd } from "./sale-countdown"

interface ShowcaseActions {
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}

export interface ShowcaseNavItem {
  name: string
  slug: string
}

function ShowcaseCard({ p, onAdd, added, wished, onWish }: { p: DemoProduct } & ShowcaseActions) {
  const [compared, setCompared] = useState<Record<string, boolean>>(() => readCompare())
  const pct = discountPct(p.price, p.oldPrice)
  const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
  const saleEnd = useSaleEnd(p.id)
  const flipCompare = () => setCompared((m) => ({ ...m, [p.id]: toggleCompareStored(p.id) }))

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-all hover:scale-105 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B] active:scale-95"
  return (
    <div className="group relative flex w-44 shrink-0 snap-start flex-col bg-white rounded-xl border border-[#E5E7EB] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] focus-within:ring-2 focus-within:ring-[#F59E0B] sm:w-52">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white">
        <div className="h-full w-full p-3">
          {p.image ? (
            <img src={marketImage(p.image)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
          ) : null}
        </div>
        {pct > 0 && (
          <span className="absolute left-1.5 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B] text-[11px] font-extrabold text-[#0F172A] shadow-sm">
            -{pct}%
          </span>
        )}
        {/* hover icon rail — wishlist / quick view / compare */}
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
        {/* slide-up add to cart (desktop hover, above the stretched link) */}
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
        <p title={p.name} className="truncate text-[13px] font-semibold text-[#0F172A] transition-colors group-hover:text-[#B45309]">{p.name}</p>
        <div className="flex items-baseline gap-1.5">
          <MarketPrice usd={p.price} className="text-[15px] font-extrabold tabular-nums text-[#0F172A]" />
          {p.oldPrice && p.oldPrice > p.price && (
            <MarketPrice usd={p.oldPrice} className="text-xs tabular-nums text-slate-400 line-through" />
          )}
        </div>
        {pct > 0 && saleEnd.trim() && (
          <SaleCountdown endAt={saleEnd} prefix="Sale ends in" className="mt-0.5 w-fit" />
        )}
        {/* mobile add to cart — the slide-up button covers desktop */}
        <button
          type="button"
          onClick={() => onAdd(p)}
          aria-label={added[p.id] ? "Added to cart" : `Add ${p.name} to cart`}
          className={`relative z-10 mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors active:scale-[0.99] md:hidden ${added[p.id] ? "bg-[#0B0F19] text-white" : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"}`}
        >
          {added[p.id] ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
        </button>
      </div>
      {/* stretched link — the whole card (image + name + price) opens the product page */}
      {href ? (
        <Link
          href={href}
          aria-label={p.name}
          className="absolute inset-0 z-0 rounded-xl focus:outline-none"
        />
      ) : null}
    </div>
  )
}

export function CategoryShowcase({
  title,
  deptSlug,
  nav,
  items,
  promoImage,
  sideBanner = "",
  sideLink = "",
  onAdd,
  added,
  wished,
  onWish,
}: {
  title: string
  deptSlug: string
  nav: ShowcaseNavItem[]
  promoImage: string
  /** Admin-uploaded sidebar banner for this department: shown clean (no
      SALE overlay, text or button) and opening sideLink. Empty = the
      built-in SALE design below. */
  sideBanner?: string
  sideLink?: string
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
    `shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
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
          All
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
          </button>
        ))}
      </nav>

      {/* side promo banner — an uploaded banner stands clean (no SALE
          overlay, text or button) and opens its own link; otherwise the
          built-in SALE design shows. */}
      <div className="flex gap-3">
        {sideBanner ? (
          <Link
            href={sideLink || `/marketplace/category/${deptSlug}`}
            aria-label={`Shop ${title}`}
            className="relative block w-48 shrink-0 self-stretch overflow-hidden rounded-xl sm:w-64"
          >
            <img
              src={marketImage(sideBanner)}
              alt={`${title} promotion`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </Link>
        ) : (
        <Link
          href="/marketplace/deals"
          className="relative flex w-48 shrink-0 flex-col justify-between self-stretch overflow-hidden rounded-xl p-4 text-white sm:w-64"
        >
          {promoImage ? (
            <img
              src={marketImage(promoImage)}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(153,27,27,0.88) 100%)" }}
          />
          <span className="relative inline-flex w-fit items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase">
            <Flame className="h-3 w-3" /> Special
          </span>
          <span className="relative mt-6 block">
            <span className="block text-3xl font-extrabold leading-none sm:text-4xl">SALE</span>
            <span className="mt-1 block text-xs font-semibold text-white/85">Up to 50% off {title.toLowerCase()}</span>
          </span>
          <span className="relative mt-6 inline-flex w-fit items-center rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#991B1B]">
            Shop now
          </span>
        </Link>
        )}
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

"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftRight, ChevronRight, Eye, Heart, Home,
  Package as PkgIcon, Search, ShoppingCart, User, Cpu, Smartphone, Laptop,
  Wrench, Shirt, Baby, Hammer, Book, ShoppingBag, Clock, Sparkles, Monitor,
  Globe, CreditCard,
} from "lucide-react"
import type { MarketDepartment } from "@/lib/marketplace-categories"
import type { DemoProduct } from "@/lib/marketplace"
import { marketImage } from "@/lib/marketplace-images"
import { openQuickView } from "@/lib/marketplace-events"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { MarketPrice } from "./market-price"
import { useSaleEnd } from "./sale-countdown"
import { useProductDiscount } from "./market-flags"
import { cleanProductTitle } from "@/lib/marketplace-copy"

const DEPT_ICON_MAP: Record<string, any> = {
  Cpu, Smartphone, Laptop, Wrench, Shirt, Baby, Hammer, Book, ShoppingBag,
  Clock, Sparkles, Monitor, PkgIcon, Globe, CreditCard,
}

function resolveDeptIcon(iconName: string | null | undefined) {
  if (!iconName) return undefined
  const key = iconName.trim()
  if (DEPT_ICON_MAP[key]) return DEPT_ICON_MAP[key]
  return undefined
}

interface CatCardProps {
  p: DemoProduct
  onAdd: (p: DemoProduct) => void
  wished: Record<string, boolean>
  onWish: (id: string) => void
  added: Record<string, boolean>
  href?: string
}

// Compact product card used inside category shopping carousels — image +
// short title + price + sale badge, no description text.
export function CategoryProductCard({
  p,
  onAdd,
  wished,
  onWish,
  added,
  href,
}: CatCardProps) {
  const saleEnd = useSaleEnd(p.id)
  const { pct: discount, oldPrice } = useProductDiscount(p, p.id)
  const showSale = discount > 0
  const [compared, setCompared] = useState(() => !!readCompare()[p.id])
  const toggleCompare = () => setCompared(toggleCompareStored(p.id))

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,0.15)] backdrop-blur-sm transition-all hover:scale-105 hover:text-[#0F172A] active:scale-95"

  return (
    <div className="group relative flex w-40 shrink-0 flex-col bg-white rounded-xl border border-[#E5E7EB] p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.2)]">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#F8FAFC]">
        {p.image ? (
          <img
            src={marketImage(p.image)}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center" aria-hidden>
            <PkgIcon className="h-8 w-8 text-slate-200" />
          </span>
        )}
        {showSale && (
          <span className="absolute left-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#F59E0B] text-[10px] font-extrabold text-[#0F172A] shadow-sm">
            -{discount}%
          </span>
        )}
        <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
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
            onClick={toggleCompare}
            aria-label={compared ? "Remove from compare" : "Add to compare"}
            aria-pressed={compared}
            title="Compare"
            className={`${iconBtn} ${compared ? "!bg-[#0F172A] !text-white" : ""}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
        {href && (
          <div className="absolute inset-x-1 bottom-1 z-10 hidden translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 md:block">
            <button
              type="button"
              onClick={() => onAdd(p)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold shadow-[0_8px_24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-colors active:scale-[0.99] ${added[p.id] ? "bg-[#0B0F19]/95 text-white" : "bg-[#0F172A]/95 text-white hover:bg-[#F59E0B] hover:text-[#0F172A]"}`}
            >
              {added[p.id] ? (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" fill="current" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                </>
              )}
            </button>
          </div>
        )}
        <div className="relative z-10 px-2 pb-2 md:hidden">
          <button
            type="button"
            onClick={() => onAdd(p)}
            className={`flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-colors active:scale-[0.99] ${added[p.id] ? "bg-[#0B0F19] text-white" : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"}`}
          >
            {added[p.id] ? (
              <>
                <ShoppingCart className="h-3.5 w-3.5" fill="current" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" /> Add
              </>
            )}
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5 px-1">
        <p title={p.name} className="line-clamp-2 text-[12px] font-semibold leading-tight text-[#0F172A] transition-colors group-hover:text-[#B45309]">
          {cleanProductTitle(p.name)}
        </p>
        <div className="flex items-baseline gap-1">
          <MarketPrice usd={p.price} className="text-[13px] font-extrabold tabular-nums text-[#0F172A]" />
          {showSale && oldPrice && (
            <MarketPrice usd={oldPrice} className="text-[10px] tabular-nums text-slate-400 line-through" />
          )}
        </div>
      </div>
      {href ? (
        <Link href={href} aria-label={p.name} className="absolute inset-0 z-0 rounded-xl focus:outline-none" />
      ) : null}
    </div>
  )
}

interface CategoryShoppingSectionProps {
  dept: MarketDepartment
  products: DemoProduct[]
  deptOf: Map<string, string>
  onAdd: (p: DemoProduct) => void
  wished: Record<string, boolean>
  onWish: (id: string) => void
  added: Record<string, boolean>
}

// One category shopping section per major department: heading with the
// department name and up to 6 subcategory links, then a promo banner on
// the left and a horizontal product carousel on the right.
export function CategoryShoppingSection({
  dept,
  products,
  deptOf,
  onAdd,
  wished,
  onWish,
  added,
}: CategoryShoppingSectionProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const [activeSub, setActiveSub] = useState<string | null>(null)

  // Products strictly belonging to this department (by stored category).
  const deptProducts = useMemo(
    () => products.filter((p) => deptOf.get(p.id) === dept.slug),
    [products, deptOf, dept.slug]
  )

  const shown = activeSub
    ? deptProducts.filter((p) => p.category === activeSub)
    : deptProducts

  const Icon = resolveDeptIcon(dept.icon)

  // Auto-rotate products every 4 seconds so the section stays fresh.
  useEffect(() => {
    if (shown.length <= 6) return
    const el = railRef.current
    if (!el) return
    const t = setInterval(() => {
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: "smooth" })
      else el.scrollBy({ left: 560, behavior: "smooth" })
    }, 4000)
    return () => clearInterval(t)
  }, [shown.length])

  // Up to 6 subcategory links for the heading row.
  const subLinks = useMemo(
    () => (dept.subs || []).slice(0, 6),
    [dept.subs]
  )

  const promoImage = dept.banner_image || dept.image

  if (deptProducts.length === 0) return null

  return (
    <section aria-label={`Shop ${dept.name}`} className="bg-white rounded-2xl p-0 shadow-sm border border-[#E2E8F0] overflow-hidden">
      {/* Heading row — department name left, subcategory links right */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
            {resolveDeptIcon(dept.icon) ? (
              <span className="flex items-center gap-2 px-1" style={{ color: "#FF6B00" }}>
                <Icon size={13} className="text-[#FF6B00]" />
              </span>
            ) : (
              <span className="text-[11px]">{dept.icon}</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] leading-tight">{dept.name}</h2>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <Link
            href={`/marketplace/category/${dept.slug}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#B45309] border border-[#FFE4D6] bg-[#FFF1F2] hover:bg-[#F59E0B]/10 transition-colors"
          >
            All {dept.name}
          </Link>
          {subLinks.map((s) => (
            <Link
              key={s.slug}
              href={`/marketplace/category/${s.slug}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-slate-700 border border-[#E2E8F0] bg-white hover:border-[#F59E0B] hover:text-[#B45309] transition-colors"
            >
              {s.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/marketplace/category/${dept.slug}`}
            className="text-sm font-semibold text-[#B45309] hover:underline"
          >
            Shop all {dept.name} →
          </Link>
        </div>
      </div>

      {/* Content row — promo banner left, product carousel right */}
      <div className="px-5 py-5 flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-none lg:w-[35%] relative overflow-hidden rounded-xl bg-[#F1F5F9] min-h-[160px] lg:min-h-[200px]">
          <Link
            href={`/marketplace/category/${dept.slug}`}
            aria-label={`Shop ${dept.name}`}
            className="block h-full w-full"
          >
            <img
              src={marketImage(promoImage)}
              alt={dept.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[#0F172A]/10 flex items-end p-3">
              <span className="text-white font-bold text-sm">Shop {dept.name}</span>
            </div>
          </Link>
        </div>
        <div className="flex-1 min-w-0 relative overflow-hidden">
          <div className="relative block h-full w-full">
            <div className="showcase-rail flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1 snap-x" ref={railRef}>
              {shown.map((p) => {
                const href = /^[0-9a-f-]{36}$/i.test(p.id) ? `/marketplace/product/${p.id}` : undefined
                return (
                  <CategoryProductCard
                    key={p.id}
                    p={p}
                    onAdd={onAdd}
                    wished={wished}
                    onWish={onWish}
                    added={added}
                    href={href}
                  />
                )
              })}
              {shown.length === 0 && (
                <p className="flex items-center px-4 text-sm text-slate-500">No products in this category yet.</p>
              )}
            </div>
            {shown.length > 6 && (
              <div className="absolute right-0 top-0 bottom-0 flex items-center px-2 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

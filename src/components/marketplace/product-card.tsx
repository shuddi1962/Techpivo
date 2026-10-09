"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeftRight, Check, Eye, Heart, Package, ShoppingCart } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"
import { openQuickView } from "@/lib/marketplace-events"
import { COMPARE_KEY, readCompare, toggleCompareStored } from "@/lib/marketplace-compare"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"
import { MarketPrice } from "./market-price"

// Beautiful storefront card (modern ecommerce pattern):
// - calm at rest: image, short title, price
// - desktop hover/focus: slide-up "Add to Bag" bar + top-right icon stack
//   (wishlist, quick view, compare) with generous touch targets
// - touch screens: icons always visible, full-width Add button below price
export function ProductCard({
  p,
  onAdd,
  wished,
  onWish,
  added,
}: {
  p: StoreProduct
  onAdd: () => void
  wished: boolean
  onWish: () => void
  added: boolean
}) {
  const price = priceOf(p)
  const discount = discountOf(p)
  const old = p.original_price ? Number(p.original_price) : NaN
  const href = `/marketplace/product/${p.id}`
  const [compared, setCompared] = useState(() => !!readCompare()[p.id])

  const toggleCompare = () => setCompared(toggleCompareStored(p.id))

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.15)] backdrop-blur-sm transition-all hover:scale-105 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B] active:scale-95"

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)]">
      <div className="relative aspect-square w-full overflow-hidden bg-[#F8FAFC]">
        <Link href={href} aria-label={p.product_name} className="block h-full w-full">
          {p.product_image_url ? (
            <img
              src={marketImage(p.product_image_url)}
              alt={p.product_name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center" aria-hidden>
              <Package className="h-12 w-12 text-slate-200" />
            </span>
          )}
        </Link>
        {discount > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#DC2626] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm">
            -{Math.round(discount * 100)}%
          </span>
        )}
        {/* top-right icon stack — wishlist / quick view / compare */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <button
            type="button"
            onClick={onWish}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            title="Wishlist"
            className={`${iconBtn} ${wished ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
          >
            <Heart className={`h-[18px] w-[18px] ${wished ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => openQuickView(p.id)}
            aria-label={`Quick view ${p.product_name}`}
            title="Quick view"
            className={iconBtn}
          >
            <Eye className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={toggleCompare}
            aria-label={compared ? "Remove from compare" : "Add to compare"}
            aria-pressed={compared}
            title="Compare"
            className={`${iconBtn} ${compared ? "!bg-[#0F172A] !text-white" : ""}`}
          >
            <ArrowLeftRight className="h-[18px] w-[18px]" />
          </button>
        </div>
        {/* desktop hover: slide-up add-to-bag bar */}
        <div className="absolute inset-x-3 bottom-3 z-10 translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 max-md:hidden">
          <button
            type="button"
            onClick={onAdd}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-[0_8px_24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-colors active:scale-[0.99] ${added ? "bg-[#0B0F19]/95 text-white" : "bg-white/95 text-[#0F172A] hover:bg-[#F59E0B]"}`}
          >
            {added ? <><Check className="h-4 w-4" strokeWidth={3} /> Added to bag</> : <><ShoppingCart className="h-4 w-4" /> Add to Bag</>}
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={href} title={p.product_name} className="block min-w-0">
          <h3 className="truncate text-[13px] font-semibold leading-snug text-[#0F172A] transition-colors group-hover:text-[#B45309]">
            {p.product_name}
          </h3>
        </Link>
        <div className="flex items-baseline gap-1.5">
          <MarketPrice
            usd={price}
            className={`text-[15px] font-extrabold tabular-nums ${discount > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}
          />
          {discount > 0 && Number.isFinite(old) && (
            <MarketPrice usd={old} className="text-[11px] tabular-nums text-slate-400 line-through" />
          )}
        </div>
        {/* touch screens: roomy full-width add button (no hover there) */}
        <button
          type="button"
          onClick={onAdd}
          className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-colors active:scale-[0.99] md:hidden ${added ? "bg-[#0B0F19] text-white" : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"}`}
        >
          {added ? <><Check className="h-4 w-4" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-4 w-4" /> Add</>}
        </button>
      </div>
    </div>
  )
}

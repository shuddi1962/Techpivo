"use client"

import Link from "next/link"
import { Check, Package, ShoppingCart } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"
import { MarketPrice } from "./market-price"
import { SaleCountdown, useSaleEnd } from "./sale-countdown"

// Calm storefront card: the whole card (image + name + price) opens the
// product page via a stretched link; the only buttons are Add to Bag.
// No floating icon overlays.
export function ProductCard({
  p,
  onAdd,
  added,
}: {
  p: StoreProduct
  onAdd: () => void
  added: boolean
}) {
  const price = priceOf(p)
  const discount = discountOf(p)
  const old = p.original_price ? Number(p.original_price) : NaN
  const href = `/marketplace/product/${p.id}`
  const saleEnd = useSaleEnd(p.id)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)] focus-within:ring-2 focus-within:ring-[#F59E0B]">
      <div className="relative aspect-square w-full overflow-hidden bg-[#F8FAFC]">
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
        {discount > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#DC2626] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm">
            -{Math.round(discount * 100)}%
          </span>
        )}
        {/* desktop hover: slide-up add-to-bag bar (above the stretched link) */}
        <div className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-[130%] transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 md:block">
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
        <h3 className="truncate text-[13px] font-semibold leading-snug text-[#0F172A] transition-colors group-hover:text-[#B45309]">
          {p.product_name}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <MarketPrice
            usd={price}
            className={`text-[15px] font-extrabold tabular-nums ${discount > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}
          />
          {discount > 0 && Number.isFinite(old) && (
            <MarketPrice usd={old} className="text-[11px] tabular-nums text-slate-400 line-through" />
          )}
        </div>
        {discount > 0 && saleEnd.trim() && (
          <SaleCountdown endAt={saleEnd} prefix="Sale ends in" className="mt-1 w-fit" />
        )}
      </div>
      {/* touch screens: roomy full-width add button (no hover there) */}
      <div className="relative z-10 px-3 pb-3 md:hidden">
        <button
          type="button"
          onClick={onAdd}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-colors active:scale-[0.99] ${added ? "bg-[#0B0F19] text-white" : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"}`}
        >
          {added ? <><Check className="h-4 w-4" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-4 w-4" /> Add</>}
        </button>
      </div>
      {/* stretched link — the whole card opens the product page */}
      <Link
        href={href}
        aria-label={p.product_name}
        className="absolute inset-0 z-0 rounded-2xl focus:outline-none"
      />
    </div>
  )
}

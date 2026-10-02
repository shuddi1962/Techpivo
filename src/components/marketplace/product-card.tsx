"use client"

import Link from "next/link"
import { Check, Heart, Package, ShoppingCart, Star } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"

export function CardStars({ value }: { value: number }) {
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
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {discount > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-bold text-white">
          -{Math.round(discount * 100)}%
        </span>
      )}
      <button
        onClick={onWish}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
        className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${wished ? "bg-[#EF4444] text-white" : "border border-[#E2E8F0] bg-white text-slate-400 hover:text-[#EF4444]"}`}
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
      </button>
      <Link href={`/marketplace/product/${p.id}`} className="flex flex-1 flex-col">
        <div className="mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F8FAFC] p-3">
          {p.product_image_url ? (
            <img src={marketImage(p.product_image_url)} alt={p.product_name} loading="lazy" decoding="async" className="h-full w-full rounded-md object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <span className="flex h-full w-full items-center justify-center" aria-hidden>
              <Package className="h-12 w-12 text-slate-200" />
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[#0F172A] transition-colors group-hover:text-[#B45309]">
          {p.product_name}
        </h3>
        <div className="my-1 flex items-center gap-1">
          <CardStars value={p.rating} />
          {p.reviews > 0 ? (
            <span className="text-[11px] text-slate-500">({p.reviews})</span>
          ) : (
            <span className="text-[11px] font-semibold text-[#10B981]">New</span>
          )}
        </div>
      </Link>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-bold ${discount > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}>
            ${price.toFixed(2)}
          </span>
          {discount > 0 && Number.isFinite(old) && (
            <span className="text-[11px] text-slate-400 line-through">${old.toFixed(2)}</span>
          )}
        </div>
        <button
          onClick={onAdd}
          className={`mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-colors ${added ? "bg-[#10B981] text-white" : "bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]"}`}
        >
          {added ? (
            <><Check className="h-3.5 w-3.5" /> Added</>
          ) : (
            <><ShoppingCart className="h-3.5 w-3.5" /> Add</>
          )}
        </button>
      </div>
    </div>
  )
}

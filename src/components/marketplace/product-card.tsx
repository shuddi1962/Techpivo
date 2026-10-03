"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeftRight, Check, Eye, Heart, Package, ShoppingCart } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"

const COMPARE_KEY = "tp_market_compare_v1"

function readCompare(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Object.fromEntries((Array.isArray(arr) ? arr : []).map((id) => [id, true]))
  } catch {
    return {}
  }
}

// Beautiful storefront card (AliExpress/Jumia-style):
// - calm at rest: image, short title, price — no buttons, no ratings
// - hover/focus reveals a vertical icon rail: cart, wishlist, quick view, compare
// - icon rail is always visible on touch screens (hover doesn't exist there)
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

  const toggleCompare = () => {
    setCompared((v) => {
      const next = !v
      try {
        const cur = readCompare()
        if (next) cur[p.id] = true
        else delete cur[p.id]
        window.localStorage.setItem(COMPARE_KEY, JSON.stringify(Object.keys(cur)))
      } catch {
        // storage blocked — visual state still toggles
      }
      return next
    })
  }

  const railBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#F59E0B]"

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
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#DC2626] px-2 py-1 text-[10px] font-extrabold tracking-wide text-white shadow-sm">
            -{Math.round(discount * 100)}%
          </span>
        )}
        {/* hover icon rail — cart / wishlist / quick view / compare */}
        <div className="absolute right-2.5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 opacity-0 translate-x-3 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 max-md:translate-x-0 max-md:opacity-100">
          <button
            type="button"
            onClick={onAdd}
            aria-label={added ? "Added to cart" : `Add ${p.product_name} to cart`}
            title={added ? "Added to cart" : "Add to cart"}
            className={`${railBtn} ${added ? "!bg-[#10B981] !text-white" : "hover:!bg-[#F59E0B]"}`}
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onWish}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            title="Wishlist"
            className={`${railBtn} ${wished ? "!bg-[#EF4444] !text-white" : "hover:!text-[#EF4444]"}`}
          >
            <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
          </button>
          <Link
            href={href}
            aria-label={`Quick view ${p.product_name}`}
            title="Quick view"
            className={railBtn}
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={toggleCompare}
            aria-label={compared ? "Remove from compare" : "Add to compare"}
            aria-pressed={compared}
            title="Compare"
            className={`${railBtn} ${compared ? "!bg-[#0F172A] !text-white" : ""}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
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
          <span className={`text-[15px] font-extrabold tabular-nums ${discount > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}>
            ${price.toFixed(2)}
          </span>
          {discount > 0 && Number.isFinite(old) && (
            <span className="text-[11px] tabular-nums text-slate-400 line-through">${old.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

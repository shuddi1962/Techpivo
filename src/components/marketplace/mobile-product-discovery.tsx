"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ListFilter, ChevronUp, ChevronDown } from "lucide-react"
import { addToCart as addLine } from "@/lib/marketplace-cart"
import { openCartPopup } from "@/lib/marketplace-events"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"
import { fetchStoreProducts } from "@/lib/marketplace-products"
import { marketImage } from "@/lib/marketplace-images"
import { MarketPrice } from "@/components/marketplace/market-price"
import { readWish } from "@/lib/marketplace-wish"

interface MobileProductDiscoveryProps {
  deptSlug?: string | null
  subSlug?: string | null
}

interface SortOption {
  id: string
  label: string
}

const SORTS: SortOption[] = [
  { id: "popular", label: "Recommended" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
]

const WISH_KEY = "tp_market_wish_v1"

/**
 * Mobile-only product discovery section — two-column grid under the
 * category/subcategory navigation area. Shows products from the selected
 * subcategory (or the whole department when no sub is selected).
 *
 * Hidden on desktop/tablet via `md:hidden`.
 */
export function MobileProductDiscovery({
  deptSlug,
  subSlug,
}: MobileProductDiscoveryProps) {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState("popular")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [wishlist, setWishlist] = useState<Record<string, boolean>>(() =>
    readWish()
  )
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({})
  const mountedRef = useRef(false)

  const slugs = useMemo(() => {
    if (subSlug) return [subSlug]
    if (deptSlug) return [deptSlug]
    return []
  }, [deptSlug, subSlug])

  useEffect(() => {
    if (slugs.length === 0) {
      setProducts([])
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchStoreProducts({ slugs, limit: 60 })
        if (!cancelled) setProducts(data)
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [slugs])

  const shown = useMemo(() => {
    const list = [...products]
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => priceOf(a) - priceOf(b))
      case "price-desc":
        return list.sort((a, b) => priceOf(b) - priceOf(a))
      case "newest":
        return list.sort(
          (a, b) =>
            String(b.created_at || "").localeCompare(String(a.created_at || ""))
        )
      default:
        return list.sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    }
  }, [products, sort])

  const addToCart = (p: StoreProduct) => {
    if (!/^[0-9a-f-]{36}$/i.test(p.id)) return
    addLine(p.id, 1)
    setJustAdded((m) => ({ ...m, [p.id]: true }))
    setTimeout(() => setJustAdded((m) => ({ ...m, [p.id]: false })), 1600)
    openCartPopup(p.id)
  }

  const toggleWish = (id: string) => {
    setWishlist((m) => {
      const next = { ...m, [id]: !m[id] }
      if (!next[id]) delete next[id]
      try {
        window.localStorage.setItem(
          WISH_KEY,
          JSON.stringify(Object.keys(next))
        )
      } catch {
        // ignore
      }
      return next
    })
  }

  const sortLabel = SORTS.find((s) => s.id === sort)?.label || "Recommended"

  return (
    <section className="bg-[#F8FAFC] md:hidden">
      {/* Sort control */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-white shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Sort by
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-expanded={drawerOpen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            <span>{sortLabel}</span>
            <span className="ml-1">
              {drawerOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              )}
            </span>
          </button>
        </div>
        {drawerOpen && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSort(s.id)
                  setDrawerOpen(false)
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sort === s.id
                    ? "bg-[#FFF1F2] text-[#FF6B00]"
                    : "text-slate-700 hover:bg-[#F1F5F9]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
            <ListFilter className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">No products yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Check back soon for new arrivals in this section.
          </p>
        </div>
      ) : (
        <div className="px-3 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {shown.map((p) => {
              const price = priceOf(p)
              const discount = discountOf(p)
              const showSale = discount > 0
              const oldPrice = showSale && p.original_price && p.original_price > price ? p.original_price : null
              const wished = !!wishlist[p.id]
              const added = !!justAdded[p.id]
              const href = `/marketplace/product/${p.id}`
              return (
                <Link
                  key={p.id}
                  href={href}
                  className="flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition-transform hover:-translate-y-1"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-[#F8FAFC]">
                    {p.product_image_url ? (
                      <img
                        src={marketImage(p.product_image_url)}
                        alt={p.product_name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300">
                        <span className="text-[10px]">?</span>
                      </span>
                    )}
                    {showSale && (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        -{Math.round(discount * 100)}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        toggleWish(p.id)
                      }}
                      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                      className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 ${wished ? "text-[#EF4444]" : "text-slate-600"} shadow-sm hover:scale-105 transition-transform`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={wished ? "#EF4444" : "none"}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-2.5 pb-2">
                    <h4 className="truncate text-[12px] font-semibold leading-snug text-[#0F172A] mb-1">
                      {p.product_name}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <MarketPrice
                        usd={price}
                        className={`text-[13px] font-extrabold tabular-nums ${showSale ? "text-[#DC2626]" : "text-[#0F172A]"}`}
                      />
                      {showSale && oldPrice && (
                        <MarketPrice
                          usd={oldPrice}
                          className="text-[10px] tabular-nums text-slate-400 line-through"
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        addToCart(p)
                      }}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold transition-colors active:scale-95 ${
                        added
                          ? "bg-[#0B0F19] text-white"
                          : "bg-[#F6F7F9] text-[#0F172A] active:bg-[#F59E0B]"
                      }`}
                    >
                      {added ? "Added" : <span>Add</span>}
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

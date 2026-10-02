"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ListFilter, PackageSearch } from "lucide-react"
import { addToCart as addLine } from "@/lib/marketplace-cart"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"
import { ProductCard } from "./product-card"
import { EMPTY_FILTERS, FilterSidebar, applyFilters, countActiveFilters, type FilterValue } from "./filter-sidebar"

type Sort = "popular" | "newest" | "price-asc" | "price-desc" | "discount" | "rating"

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "popular", label: "Popularity" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "discount", label: "Biggest Discount" },
  { id: "rating", label: "Top Rated" },
]

const WISH_KEY = "tp_market_wish_v1"

function readWish(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(WISH_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Object.fromEntries((Array.isArray(arr) ? arr : []).map((id) => [id, true]))
  } catch {
    return {}
  }
}

export function ProductListing({ products }: { products: StoreProduct[] }) {
  const [filters, setFilters] = useState<FilterValue>(EMPTY_FILTERS)
  const [sort, setSort] = useState<Sort>("popular")
  const [drawer, setDrawer] = useState(false)
  const [wishlist, setWishlist] = useState<Record<string, boolean>>(() => readWish())
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => applyFilters(products, filters), [products, filters])

  const shown = useMemo(() => {
    const list = [...filtered]
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => priceOf(a) - priceOf(b))
      case "price-desc":
        return list.sort((a, b) => priceOf(b) - priceOf(a))
      case "discount":
        return list.sort((a, b) => discountOf(b) - discountOf(a))
      case "rating":
        return list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
      case "newest":
        return list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      default:
        return list.sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    }
  }, [filtered, sort])

  const addToCart = (p: StoreProduct) => {
    if (!/^[0-9a-f-]{36}$/i.test(p.id)) return
    addLine(p.id, 1)
    setJustAdded((m) => ({ ...m, [p.id]: true }))
    setTimeout(() => setJustAdded((m) => ({ ...m, [p.id]: false })), 1600)
  }

  const toggleWish = (id: string) =>
    setWishlist((m) => {
      const next = { ...m, [id]: !m[id] }
      if (!next[id]) delete next[id]
      try {
        window.localStorage.setItem(WISH_KEY, JSON.stringify(Object.keys(next)))
      } catch {
        // ignore
      }
      return next
    })

  const active = countActiveFilters(filters)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="hidden lg:col-span-3 lg:block xl:col-span-3">
        <FilterSidebar value={filters} onChange={setFilters} resultCount={shown.length} />
      </div>
      <div className="lg:col-span-9 xl:col-span-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            <strong className="text-[#0F172A]">{shown.length}</strong> of {products.length} products
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] lg:hidden"
            >
              <ListFilter className="h-4 w-4" /> Filters
              {active > 0 && (
                <span className="rounded-full bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-bold text-white">{active}</span>
              )}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort products"
                className="cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {shown.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {shown.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                onAdd={() => addToCart(p)}
                wished={!!wishlist[p.id]}
                onWish={() => toggleWish(p.id)}
                added={!!justAdded[p.id]}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-14 text-center">
            <PackageSearch className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-[#0F172A]">No products match your filters</p>
            <p className="mt-1 text-sm text-slate-500">Try widening the price range or clearing a filter or two.</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
              >
                Clear filters
              </button>
              <Link
                href="/marketplace/shop"
                className="rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                Shop all
              </Link>
            </div>
          </div>
        )}
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Product filters">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-sm overflow-y-auto bg-[#F8FAFC] p-4">
            <FilterSidebar
              value={filters}
              onChange={setFilters}
              resultCount={shown.length}
            />
            <button
              type="button"
              onClick={() => setDrawer(false)}
              className="mt-4 w-full rounded-lg bg-[#DC2626] py-3 text-sm font-bold text-white"
            >
              Show {shown.length} result{shown.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

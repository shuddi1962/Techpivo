"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { SlidersHorizontal, Star, X } from "lucide-react"
import { useUsdNgnRate } from "@/lib/marketplace-pricing"
import type { CatProduct } from "@/app/marketplace/category/[slug]/page"

type Sort = "popular" | "newest" | "price-asc" | "price-desc"

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "popular", label: "Popularity" },
  { id: "newest", label: "Newest Arrivals" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
]

export function CategoryBrowse({
  products,
  deptSlug,
  subs,
}: {
  products: CatProduct[]
  deptSlug: string
  subs: Array<{ name: string; slug: string }>
}) {
  const rate = useUsdNgnRate()
  const [sort, setSort] = useState<Sort>("popular")
  const [maxPrice, setMaxPrice] = useState("")
  const [vendor, setVendor] = useState("")
  const [minRating, setMinRating] = useState(0)
  const [dealsOnly, setDealsOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const vendors = useMemo(() => {
    const s = new Set<string>()
    products.forEach((p) => {
      if (p.program_key) s.add(p.program_key)
    })
    return [...s].sort()
  }, [products])

  const shown = useMemo(() => {
    const max = maxPrice ? Number(maxPrice) : NaN
    const list = products.filter((p) => {
      const price = Number(p.sale_price ?? p.original_price ?? 0)
      if (Number.isFinite(max) && max > 0 && price > max) return false
      if (vendor && p.program_key !== vendor) return false
      if (minRating > 0 && !(p.is_featured && minRating <= 5)) {
        // without per-product review aggregates, featured = top-rated shelf
        if (minRating > 4) return false
      }
      if (dealsOnly && !(p.original_price && Number(p.original_price) > price)) return false
      return true
    })
    const priceOf = (p: CatProduct) => Number(p.sale_price ?? p.original_price ?? 0)
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => priceOf(a) - priceOf(b))
      case "price-desc":
        return [...list].sort((a, b) => priceOf(b) - priceOf(a))
      case "newest":
        return [...list].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      default:
        return [...list].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    }
  }, [products, sort, maxPrice, vendor, minRating, dealsOnly])

  const clearAll = () => {
    setMaxPrice("")
    setVendor("")
    setMinRating(0)
    setDealsOnly(false)
  }
  const filtering = maxPrice !== "" || vendor !== "" || minRating > 0 || dealsOnly

  const filters = (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-[#0F172A] mb-2">Subgroups</h3>
        <ul className="space-y-1">
          {subs.map((s) => (
            <li key={s.slug}>
              <Link href={`/marketplace/category/${s.slug}`} className="text-sm text-slate-600 hover:text-[#B45309]">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#0F172A] mb-2">Max price (USD)</h3>
        <div className="flex gap-2">
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="e.g. 50"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]"
            aria-label="Maximum price in USD"
          />
        </div>
      </div>
      {vendors.length > 1 && (
        <div>
          <h3 className="text-sm font-bold text-[#0F172A] mb-2">Vendor</h3>
          <div className="space-y-1">
            {vendors.map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="radio" name="vendor" checked={vendor === v} onChange={() => setVendor(v)} className="accent-[#F59E0B]" />
                {v}
              </label>
            ))}
            {vendor && (
              <button onClick={() => setVendor("")} className="text-xs text-[#B45309] font-semibold">
                Clear vendor
              </button>
            )}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-[#0F172A] mb-2">Rating</h3>
        <div className="space-y-1">
          {[4, 0].map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} className="accent-[#F59E0B]" />
              {r === 0 ? (
                "All ratings"
              ) : (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" /> {r}.0 & above
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" checked={dealsOnly} onChange={(e) => setDealsOnly(e.target.checked)} className="accent-[#F59E0B] h-4 w-4" />
        Discounted only
      </label>
      {filtering && (
        <button onClick={clearAll} className="text-xs font-bold text-[#B45309] hover:text-[#D97706]">
          Reset all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <aside className="hidden lg:block lg:col-span-3">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sticky top-4">{filters}</div>
      </aside>
      <div className="lg:col-span-9 space-y-3">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => setFiltersOpen((v) => !v)} className="lg:hidden inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F172A] border rounded-lg px-3 py-2" aria-expanded={filtersOpen}>
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <span className="text-sm text-slate-500">{shown.length} result{shown.length === 1 ? "" : "s"}</span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sort by:
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#F59E0B]" aria-label="Sort products">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
        {filtersOpen && (
          <div className="lg:hidden bg-white rounded-2xl border border-[#E2E8F0] p-5">{filters}</div>
        )}
        {filtering && (
          <div className="flex flex-wrap gap-2">
            {maxPrice && (
              <button onClick={() => setMaxPrice("")} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                Under ${maxPrice} <X className="h-3 w-3" />
              </button>
            )}
            {vendor && (
              <button onClick={() => setVendor("")} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                {vendor} <X className="h-3 w-3" />
              </button>
            )}
            {dealsOnly && (
              <button onClick={() => setDealsOnly(false)} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                Discounted <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
            <p className="font-bold text-[#0F172A]">No products match your filters</p>
            <p className="text-sm text-slate-500 mt-1">Try widening the price or clearing filters.</p>
            <button onClick={clearAll} className="mt-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {shown.map((p) => {
              const price = Number(p.sale_price ?? p.original_price ?? 0)
              const old = p.original_price && Number(p.original_price) > price ? Number(p.original_price) : null
              const pct = old ? Math.round((1 - price / old) * 100) : 0
              return (
                <Link key={p.id} href={`/marketplace/product/${p.id}`} className="group bg-white border border-[#E2E8F0] rounded-xl p-3 hover:shadow-md transition-shadow relative">
                  {pct > 0 && <span className="absolute top-2 left-2 bg-[#EF4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">-{pct}%</span>}
                  <div className="aspect-square bg-[#F8FAFC] rounded-lg overflow-hidden mb-2">
                    {p.product_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.product_image_url} alt={p.product_name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : null}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{p.program_key || "TechPivo Pick"}</p>
                  <h3 className="text-sm font-semibold text-[#0F172A] line-clamp-2 min-h-[2.5em]">{p.product_name}</h3>
                  <p className="text-base font-bold text-[#0F172A] mt-1">${price.toFixed(2)}</p>
                  {old && <p className="text-[11px] text-slate-400 line-through">${old.toFixed(2)}</p>}
                  <p className="text-[11px] text-slate-500">≈ ₦{Math.round(price * rate).toLocaleString()}</p>
                </Link>
              )
            })}
          </div>
        )}
        <p className="text-xs text-slate-400">
          Prices in USD, payable in naira at checkout · <Link href={`/marketplace/category/${deptSlug}`} className="hover:text-[#0F172A]">Back to department top</Link>
        </p>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { PackageSearch, SlidersHorizontal, Star, X } from "lucide-react"
import { useUsdNgnRate } from "@/lib/marketplace-pricing"
import type { CatProduct } from "@/app/marketplace/category/[slug]/page"

type Sort = "popular" | "newest" | "price-asc" | "price-desc" | "discount"

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "popular", label: "Popularity" },
  { id: "newest", label: "Newest Arrivals" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "discount", label: "Biggest Discount" },
]

const num = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

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
  const [search, setSearch] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [vendors, setVendors] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [dealsOnly, setDealsOnly] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Header search can land here as /marketplace/category/<slug>?q=...
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q")
      if (q) setSearch(q)
    } catch {
      // ignore malformed query strings
    }
  }, [])

  const vendorOptions = useMemo(() => {
    const s = new Map<string, number>()
    products.forEach((p) => {
      const v = (p.program_key || "TechPivo Picks").trim()
      s.set(v, (s.get(v) || 0) + 1)
    })
    return [...s.entries()].sort((a, b) => b[1] - a[1])
  }, [products])

  const priceOf = (p: CatProduct) => Number(p.sale_price ?? p.original_price ?? 0)
  const discountOf = (p: CatProduct) => {
    const price = priceOf(p)
    const old = p.original_price ? Number(p.original_price) : NaN
    return Number.isFinite(old) && old > price ? 1 - price / old : 0
  }
  const inStock = (p: CatProduct) => p.stock == null || Number(p.stock) > 0

  const shown = useMemo(() => {
    const lo = minPrice ? num(minPrice) : NaN
    const hi = maxPrice ? num(maxPrice) : NaN
    const q = search.trim().toLowerCase()
    const list = products.filter((p) => {
      const price = priceOf(p)
      if (Number.isFinite(lo) && price < lo) return false
      if (Number.isFinite(hi) && hi > 0 && price > hi) return false
      if (vendors.length > 0 && !vendors.includes((p.program_key || "TechPivo Picks").trim())) return false
      if (q && !`${p.product_name} ${(p.product_description || "").slice(0, 200)}`.toLowerCase().includes(q)) return false
      if (minRating > 0 && !p.is_featured) return false
      if (dealsOnly && discountOf(p) <= 0) return false
      if (inStockOnly && !inStock(p)) return false
      return true
    })
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => priceOf(a) - priceOf(b))
      case "price-desc":
        return [...list].sort((a, b) => priceOf(b) - priceOf(a))
      case "discount":
        return [...list].sort((a, b) => discountOf(b) - discountOf(a))
      case "newest":
        return [...list].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      default:
        return [...list].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, sort, search, minPrice, maxPrice, vendors, minRating, dealsOnly, inStockOnly])

  const toggleVendor = (v: string) =>
    setVendors((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))

  const clearAll = () => {
    setSearch("")
    setMinPrice("")
    setMaxPrice("")
    setVendors([])
    setMinRating(0)
    setDealsOnly(false)
    setInStockOnly(false)
  }
  const filtering =
    search !== "" || minPrice !== "" || maxPrice !== "" || vendors.length > 0 || minRating > 0 || dealsOnly || inStockOnly

  const filters = (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-[#0F172A] mb-2">Search in this department</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. camera, charger..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]"
          aria-label="Search products in this department"
        />
      </div>
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
        <h3 className="text-sm font-bold text-[#0F172A] mb-2">Price (USD)</h3>
        <div className="flex gap-2">
          <input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="Min"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]"
            aria-label="Minimum price in USD"
          />
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="Max"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]"
            aria-label="Maximum price in USD"
          />
        </div>
      </div>
      {vendorOptions.length > 1 && (
        <div>
          <h3 className="text-sm font-bold text-[#0F172A] mb-2">Vendor</h3>
          <div className="space-y-1">
            {vendorOptions.map(([v, n]) => (
              <label key={v} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={vendors.includes(v)} onChange={() => toggleVendor(v)} className="accent-[#F59E0B] h-4 w-4" />
                <span className="flex-1">{v}</span>
                <span className="text-[11px] text-slate-400">({n})</span>
              </label>
            ))}
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
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={dealsOnly} onChange={(e) => setDealsOnly(e.target.checked)} className="accent-[#F59E0B] h-4 w-4" />
          Discounted only
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[#F59E0B] h-4 w-4" />
          In stock only
        </label>
      </div>
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
            {search && (
              <button onClick={() => setSearch("")} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                “{search}” <X className="h-3 w-3" />
              </button>
            )}
            {(minPrice || maxPrice) && (
              <button onClick={() => { setMinPrice(""); setMaxPrice("") }} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                ${minPrice || "0"} – ${maxPrice || "∞"} <X className="h-3 w-3" />
              </button>
            )}
            {vendors.map((v) => (
              <button key={v} onClick={() => toggleVendor(v)} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                {v} <X className="h-3 w-3" />
              </button>
            ))}
            {dealsOnly && (
              <button onClick={() => setDealsOnly(false)} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                Discounted <X className="h-3 w-3" />
              </button>
            )}
            {inStockOnly && (
              <button onClick={() => setInStockOnly(false)} className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 rounded-full px-3 py-1.5">
                In stock <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
            <PackageSearch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
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
                  {!inStock(p) && <span className="absolute top-2 right-2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">Out of stock</span>}
                  <div className="aspect-square bg-[#F8FAFC] rounded-lg overflow-hidden mb-2">
                    {p.product_image_url ? (
                      <img src={p.product_image_url} alt={p.product_name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

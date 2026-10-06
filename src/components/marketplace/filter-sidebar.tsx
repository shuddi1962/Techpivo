"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, Star } from "lucide-react"
import { priceOf, discountOf, type StoreProduct } from "@/lib/marketplace-catalog"

export interface FilterValue {
  q: string
  minPrice: string
  maxPrice: string
  minRating: number
  colors: string[]
  sizes: string[]
  features: string[]
  inStock: boolean
  onSale: boolean
}

export const EMPTY_FILTERS: FilterValue = {
  q: "",
  minPrice: "",
  maxPrice: "",
  minRating: 0,
  colors: [],
  sizes: [],
  features: [],
  inStock: false,
  onSale: false,
}

export const COLOR_OPTIONS: Array<{ name: string; hex: string; keys: string[] }> = [
  { name: "Black", hex: "#1F2937", keys: ["black"] },
  { name: "White", hex: "#FFFFFF", keys: ["white"] },
  { name: "Red", hex: "#DC2626", keys: ["red"] },
  { name: "Blue", hex: "#2563EB", keys: ["blue"] },
  { name: "Green", hex: "#16A34A", keys: ["green"] },
  { name: "Yellow", hex: "#EAB308", keys: ["yellow"] },
  { name: "Pink", hex: "#EC4899", keys: ["pink"] },
  { name: "Purple", hex: "#9333EA", keys: ["purple"] },
  { name: "Orange", hex: "#F97316", keys: ["orange"] },
  { name: "Grey", hex: "#9CA3AF", keys: ["gray", "grey", "silver"] },
  { name: "Brown", hex: "#92400E", keys: ["brown"] },
  { name: "Gold", hex: "#C9A227", keys: ["gold", "golden"] },
]

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"]
export const FEATURE_OPTIONS = ["Wireless", "Bluetooth", "Waterproof", "Rechargeable", "LED", "Smart", "Solar", "USB"]

const PRICE_PRESETS: Array<{ label: string; min: string; max: string }> = [
  { label: "Under $10", min: "", max: "10" },
  { label: "$10 – $50", min: "10", max: "50" },
  { label: "$50 – $100", min: "50", max: "100" },
  { label: "Over $100", min: "100", max: "" },
]

const num = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

function hayOf(p: StoreProduct): string {
  return `${p.product_name} ${p.product_description || ""}`.toLowerCase()
}

function wordHit(hay: string, word: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(hay)
}

export function applyFilters(products: StoreProduct[], f: FilterValue): StoreProduct[] {
  const lo = f.minPrice ? num(f.minPrice) : NaN
  const hi = f.maxPrice ? num(f.maxPrice) : NaN
  const q = f.q.trim().toLowerCase()
  return products.filter((p) => {
    const price = priceOf(p)
    if (Number.isFinite(lo) && price < lo) return false
    if (Number.isFinite(hi) && hi > 0 && price > hi) return false
    if (q && !hayOf(p).includes(q)) return false
    if (f.minRating > 0 && p.rating < f.minRating) return false
    if (f.colors.length > 0) {
      const hay = hayOf(p)
      const opt = COLOR_OPTIONS.filter((c) => f.colors.includes(c.name))
      if (!opt.some((c) => c.keys.some((k) => wordHit(hay, k)))) return false
    }
    if (f.sizes.length > 0) {
      const hay = hayOf(p)
      if (!f.sizes.some((s) => wordHit(hay, s))) return false
    }
    if (f.features.length > 0) {
      const hay = hayOf(p)
      if (!f.features.some((feat) => hay.includes(feat.toLowerCase()))) return false
    }
    if (f.inStock && !(p.stock == null || Number(p.stock) > 0)) return false
    if (f.onSale && discountOf(p) <= 0) return false
    return true
  })
}

export function countActiveFilters(f: FilterValue): number {
  let n = 0
  if (f.q.trim()) n++
  if (f.minPrice || f.maxPrice) n++
  if (f.minRating > 0) n++
  n += f.colors.length + f.sizes.length + f.features.length
  if (f.inStock) n++
  if (f.onSale) n++
  return n
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#E2E8F0] py-4 last:border-0 last:pb-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-bold text-[#0F172A]"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function FilterSidebar({
  value,
  onChange,
  products = [],
}: {
  value: FilterValue
  onChange: (v: FilterValue) => void
  products?: StoreProduct[]
}) {
  const set = (patch: Partial<FilterValue>) => onChange({ ...value, ...patch })
  const toggleList = (key: "colors" | "sizes" | "features", item: string) =>
    set({ [key]: value[key].includes(item) ? value[key].filter((x) => x !== item) : [...value[key], item] } as Partial<FilterValue>)
  const active = countActiveFilters(value)
  const presetActive = (min: string, max: string) => value.minPrice === min && value.maxPrice === max
  // Live suggestions: matching product names pop up as you type (instant,
  // from the already-loaded list — no extra request). Picking one jumps
  // straight to its product page.
  const [suggestOpen, setSuggestOpen] = useState(false)
  const matches = useMemo(() => {
    const q = value.q.trim().toLowerCase()
    if (q.length < 2 || products.length === 0) return []
    return products.filter((p) => hayOf(p).includes(q)).slice(0, 6)
  }, [value.q, products])
  const showSuggest = suggestOpen && value.q.trim().length >= 2 && matches.length > 0

  return (
    <aside className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm lg:sticky lg:top-36">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
          <SlidersHorizontal className="h-4 w-4 text-[#DC2626]" /> Filters
          {active > 0 && (
            <span className="rounded-full bg-[#DC2626] px-2 py-0.5 text-[10px] font-bold text-white">{active}</span>
          )}
        </h3>
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#DC2626]"
          >
            <RotateCcw className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Refine the list with the filters below
      </p>

      <div className="mt-2">
        <Section title="Search products">
          <div className="relative">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 focus-within:border-[#F59E0B]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={value.q}
              onChange={(e) => { set({ q: e.target.value }); setSuggestOpen(true) }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              onKeyDown={(e) => { if (e.key === "Escape") setSuggestOpen(false) }}
              placeholder="Search in this list..."
              aria-label="Search products"
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {showSuggest && (
            <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
              <ul>
                {matches.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/marketplace/product/${p.id}`}
                      onClick={() => setSuggestOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 transition-colors hover:bg-[#F8FAFC]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                        {p.product_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.product_image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        ) : (
                          <Search className="h-3.5 w-3.5 text-slate-300" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#0F172A]">{p.product_name}</span>
                        <span className="block text-xs font-bold text-[#EF4444]">${priceOf(p).toFixed(2)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </Section>

        <Section title="Price (USD)">
          <div className="flex gap-2">
            <input
              value={value.minPrice}
              onChange={(e) => set({ minPrice: e.target.value.replace(/[^0-9.]/g, "") })}
              inputMode="decimal"
              placeholder="Min"
              aria-label="Minimum price in USD"
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#F59E0B] focus:outline-none"
            />
            <input
              value={value.maxPrice}
              onChange={(e) => set({ maxPrice: e.target.value.replace(/[^0-9.]/g, "") })}
              inputMode="decimal"
              placeholder="Max"
              aria-label="Maximum price in USD"
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#F59E0B] focus:outline-none"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => set(presetActive(r.min, r.max) ? { minPrice: "", maxPrice: "" } : { minPrice: r.min, maxPrice: r.max })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${presetActive(r.min, r.max) ? "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]" : "border-[#E2E8F0] text-slate-600 hover:border-[#F59E0B]"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Rating">
          <div className="space-y-1.5">
            {[{ v: 0, label: "All ratings" }, { v: 4, label: "4 stars & up" }, { v: 3, label: "3 stars & up" }].map((r) => (
              <label key={r.v} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="radio"
                  name="rating"
                  checked={value.minRating === r.v}
                  onChange={() => set({ minRating: r.v })}
                  className="accent-[#DC2626]"
                />
                {r.v === 0 ? (
                  r.label
                ) : (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" /> {r.label}
                  </span>
                )}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Color">
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => {
              const on = value.colors.includes(c.name)
              return (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  aria-label={`Filter by color ${c.name}`}
                  aria-pressed={on}
                  onClick={() => toggleList("colors", c.name)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${on ? "scale-110 border-[#DC2626]" : "border-[#E2E8F0] hover:border-slate-400"}`}
                  style={{ background: c.hex }}
                >
                  {on && <Check className={`h-4 w-4 ${c.name === "White" ? "text-slate-800" : "text-white"}`} />}
                </button>
              )
            })}
          </div>
          {value.colors.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">{value.colors.join(", ")}</p>
          )}
        </Section>

        <Section title="Size">
          <div className="flex flex-wrap gap-1.5">
            {SIZE_OPTIONS.map((s) => {
              const on = value.sizes.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleList("sizes", s)}
                  className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${on ? "border-[#DC2626] bg-[#DC2626] text-white" : "border-[#E2E8F0] text-slate-600 hover:border-[#DC2626]"}`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Features">
          <div className="flex flex-wrap gap-1.5">
            {FEATURE_OPTIONS.map((feat) => {
              const on = value.features.includes(feat)
              return (
                <button
                  key={feat}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleList("features", feat)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "border-[#F59E0B] bg-[#FFFBEB] text-[#B45309]" : "border-[#E2E8F0] text-slate-600 hover:border-[#F59E0B]"}`}
                >
                  {feat}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Availability">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-between text-sm text-slate-600">
              In stock only
              <button
                type="button"
                role="switch"
                aria-checked={value.inStock}
                onClick={() => set({ inStock: !value.inStock })}
                className={`relative h-6 w-11 rounded-full transition-colors ${value.inStock ? "bg-[#10B981]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value.inStock ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </label>
            <label className="flex cursor-pointer items-center justify-between text-sm text-slate-600">
              On sale only
              <button
                type="button"
                role="switch"
                aria-checked={value.onSale}
                onClick={() => set({ onSale: !value.onSale })}
                className={`relative h-6 w-11 rounded-full transition-colors ${value.onSale ? "bg-[#DC2626]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value.onSale ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </label>
          </div>
        </Section>
      </div>
    </aside>
  )
}

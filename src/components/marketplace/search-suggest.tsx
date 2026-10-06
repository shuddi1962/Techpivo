"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Search } from "lucide-react"
import { MarketPrice } from "./market-price"

export interface SuggestItem {
  id: string
  name: string
  image: string
  price: number
}

// Live AJAX suggestions for the storefront header search. Debounced
// Supabase lookup (ilike on product name), minimum 2 characters.
// Never throws — an error/empty just yields no dropdown.
export function useRemoteSuggest(query: string): { items: SuggestItem[]; loading: boolean } {
  const [items, setItems] = useState<SuggestItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setItems([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const safe = q.replace(/[%_\\(),]/g, "")
        if (safe.length < 2) {
          if (alive) {
            setItems([])
            setLoading(false)
          }
          return
        }
        const { data } = await createClient()
          .from("affiliate_products")
          .select("id,product_name,product_image_url,sale_price,original_price")
          .eq("is_active", true)
          .or(`product_name.ilike.%${safe}%,product_description.ilike.%${safe}%`)
          .order("clicks", { ascending: false, nullsFirst: false })
          .limit(6)
        if (!alive) return
        const rows = (data || []) as Array<{
          id: string
          product_name: string
          product_image_url: string | null
          sale_price: number | null
          original_price: number | null
        }>
        setItems(
          rows.map((r) => ({
            id: r.id,
            name: r.product_name,
            image: r.product_image_url || "",
            price: Number(r.sale_price ?? r.original_price ?? 0),
          }))
        )
      } catch {
        if (alive) setItems([])
      } finally {
        if (alive) setLoading(false)
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query])

  return { items, loading }
}

// Shared suggestion dropdown panel: product thumbnails + names + prices
// that pop up as you type, plus a "see all results" footer row.
export function SuggestDropdown({
  items,
  loading,
  query,
  onPick,
  onSubmitAll,
}: {
  items: SuggestItem[]
  loading: boolean
  query: string
  onPick: () => void
  onSubmitAll: () => void
}) {
  const q = query.trim()
  if (q.length < 2) return null
  return (
    <div className="absolute inset-x-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl">
      {loading && items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-400">Searching…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">
          No products match “{q}” — press Enter to search anyway.
        </p>
      ) : (
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/marketplace/product/${it.id}`}
                onClick={onPick}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[#F8FAFC]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <Search className="h-4 w-4 text-slate-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#0F172A]">{it.name}</span>
                  <MarketPrice usd={it.price} className="block text-xs font-bold text-[#EF4444]" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onSubmitAll}
        className="flex w-full items-center justify-center gap-1 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#0F172A] transition-colors hover:bg-slate-100"
      >
        See all results for “{q}” <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

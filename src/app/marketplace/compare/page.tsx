"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowLeftRight, Check, ShoppingCart, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart } from "@/lib/marketplace-cart"
import { clearCompare, toggleCompareStored, useCompareIds } from "@/lib/marketplace-compare"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import { supplierDisplayName } from "@/lib/marketplace"
import { openCartPopup } from "@/lib/marketplace-events"
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-header"
import { MarketPrice } from "@/components/marketplace/market-price"
import { PanelStars } from "@/components/marketplace/feature-panels"

interface CmpProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  program_key: string | null
  category_slug: string | null
  subcategory_slug: string | null
  stock: number | null
}

interface RevStat {
  sum: number
  n: number
}

function CompareTable({ ids }: { ids: string[] }) {
  const [rows, setRows] = useState<CmpProduct[]>([])
  const [stats, setStats] = useState<Record<string, RevStat>>({})
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [, force] = useState(0)
  const idsKey = ids.join(",")

  useEffect(() => {
    let alive = true
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase
        .from("affiliate_products")
        .select("id,product_name,product_description,product_image_url,original_price,sale_price,program_key,category_slug,subcategory_slug,stock")
        .in("id", ids)
        .eq("is_active", true),
      supabase.from("marketplace_reviews").select("product_id,rating").in("product_id", ids).limit(1000),
    ])
      .then(([p, r]) => {
        if (!alive) return
        setRows(((p as { data?: CmpProduct[] }).data || []) as CmpProduct[])
        const m: Record<string, RevStat> = {}
        for (const rev of ((r as { data?: Array<{ product_id: string; rating: number }> }).data || [])) {
          const cur = m[rev.product_id] || { sum: 0, n: 0 }
          cur.sum += Number(rev.rating) || 0
          cur.n += 1
          m[rev.product_id] = cur
        }
        setStats(m)
        setLoading(false)
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  // Keep the table honest when the tray removes an item elsewhere.
  useEffect(() => {
    const sync = () => force((v) => v + 1)
    window.addEventListener("tp-market-compare", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("tp-market-compare", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const live = useMemo(() => {
    const order = new Map(ids.map((id, i) => [id, i]))
    return rows
      .filter((r) => order.has(r.id))
      .sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0))
  }, [rows, ids])

  const remove = (id: string) => {
    toggleCompareStored(id)
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const add = (id: string) => {
    addToCart(id, 1)
    setAdded((m) => ({ ...m, [id]: true }))
    setTimeout(() => setAdded((m) => ({ ...m, [id]: false })), 1600)
    openCartPopup(id)
  }

  if (loading) {
    return <p className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center text-sm text-slate-500">Loading your comparison...</p>
  }
  if (live.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
        <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-lg font-bold text-[#0F172A]">Nothing to compare yet</p>
        <p className="mt-1 text-sm text-slate-500">Tap the compare icon on any product card to shortlist it here.</p>
        <Link href="/marketplace" className="mt-4 inline-block rounded-xl bg-[#F59E0B] px-6 py-3 text-sm font-bold text-[#0F172A] hover:bg-[#D97706]">
          Browse products
        </Link>
      </div>
    )
  }

  const specRows: Array<{ label: string; render: (p: CmpProduct) => React.ReactNode }> = [
    {
      label: "Rating",
      render: (p) => {
        const st = stats[p.id]
        return st && st.n > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <PanelStars value={st.sum / st.n} />
            <span className="text-xs font-semibold text-slate-500">{(st.sum / st.n).toFixed(1)} ({st.n})</span>
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400">New — no reviews yet</span>
        )
      },
    },
    {
      label: "Price",
      render: (p) => {
        const price = Number(p.sale_price ?? p.original_price ?? 0)
        const old = p.original_price && p.sale_price ? Number(p.original_price) : null
        return (
          <span className="inline-flex flex-wrap items-baseline gap-1.5">
            <MarketPrice usd={price} className="text-lg font-extrabold tabular-nums text-[#0F172A]" />
            {old && old > price && <MarketPrice usd={old} className="text-xs tabular-nums text-slate-400 line-through" />}
          </span>
        )
      },
    },
    {
      label: "Availability",
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0F172A]">
          <span className={`h-1.5 w-1.5 rounded-full ${p.stock != null && p.stock <= 0 ? "bg-[#CBD5E1]" : "bg-[#0B0F19]"}`} />
          {p.stock != null && p.stock <= 0 ? "Made to order" : p.stock != null && p.stock <= 5 ? `Only ${p.stock} left` : "In stock"}
        </span>
      ),
    },
    { label: "Brand", render: (p) => <span className="text-[13px] text-slate-600">{supplierDisplayName(p.program_key)}</span> },
    {
      label: "Description",
      render: (p) => (
        <span className="line-clamp-3 block max-w-[220px] text-[13px] leading-relaxed text-slate-600">
          {cleanSupplierText(p.product_description) || "—"}
        </span>
      ),
    },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr>
            <th className="w-28 p-4 align-bottom text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Compare</th>
            {live.map((p) => (
              <th key={p.id} className="min-w-[200px] p-4 align-top">
                <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-xl border border-[#EDEFF3] bg-[#F6F7F9]">
                  {p.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={marketImage(p.product_image_url)} alt={p.product_name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Remove ${p.product_name} from compare`}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow transition-colors hover:text-[#EF4444]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Link href={`/marketplace/product/${p.id}`} className="mt-2 line-clamp-2 block text-sm font-bold text-[#0F172A] hover:text-[#B45309]">
                  {cleanSupplierText(p.product_name) || p.product_name}
                </Link>
                <button
                  type="button"
                  onClick={() => add(p.id)}
                  className={`mt-2 flex w-full max-w-[220px] items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-all active:scale-[0.99] ${added[p.id] ? "bg-[#0B0F19] text-white" : "bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]"}`}
                >
                  {added[p.id] ? <><Check className="h-4 w-4" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-4 w-4" /> Add to Bag</>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specRows.map((s) => (
            <tr key={s.label} className="border-t border-[#EFF1F5]">
              <th className="p-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{s.label}</th>
              {live.map((p) => (
                <td key={p.id} className="p-4 align-top">{s.render(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MarketplaceComparePage() {
  const ids = useCompareIds()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC]">
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-6 lg:px-10 sm:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309]">Side by side</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0B0F19]">Compare products</h1>
          </div>
          <div className="flex items-center gap-2">
            {ids.length > 0 && (
              <button onClick={clearCompare} className="rounded-xl border border-[#E2E6EE] bg-white px-4 py-2 text-[13px] font-bold text-slate-500 transition-colors hover:border-[#0B0F19] hover:text-[#0B0F19]">
                Clear all
              </button>
            )}
            <Link href="/marketplace" className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B0F19] px-4 py-2 text-[13px] font-bold text-white hover:bg-black">
              <ArrowLeft className="h-4 w-4" /> Keep shopping
            </Link>
          </div>
        </div>
        {!ready ? (
          <p className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center text-sm text-slate-500">Loading...</p>
        ) : ids.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
            <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-lg font-bold text-[#0F172A]">Nothing to compare yet</p>
            <p className="mt-1 text-sm text-slate-500">Tap the compare icon on any product card to shortlist it here.</p>
            <Link href="/marketplace" className="mt-4 inline-block rounded-xl bg-[#F59E0B] px-6 py-3 text-sm font-bold text-[#0F172A] hover:bg-[#D97706]">
              Browse products
            </Link>
          </div>
        ) : (
          <CompareTable ids={ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 4)} />
        )}
        {ids.length > 4 && (
          <p className="mt-2 text-center text-xs text-slate-400">Showing the first 4 of {ids.length} — remove one to compare another.</p>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  )
}

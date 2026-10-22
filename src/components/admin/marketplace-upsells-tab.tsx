// Admin → Marketplace → Upsells: curated "Complete Your Purchase"
// recommendations + real conversion report. No demo data, no fabricated
// rates — empty states say "collecting data" until events exist.

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Trash2, Eye, EyeOff, RefreshCw, TrendingUp, ShoppingBag, Banknote } from "lucide-react"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketCardCls,
  marketInputCls,
  MarketKpi,
  MarketLoading,
  MarketNotice,
  MarketPageBar,
} from "@/components/admin/marketplace-ui"

interface Rec {
  id: string
  primary_id: string
  recommended_id: string
  position: number
  is_active: boolean
}

interface Product {
  id: string
  product_name: string
  product_image_url?: string | null
  clicks?: number | null
  conversions?: number | null
  sale_price?: number | null
}

interface Report {
  byKind: Record<string, number>
  totalEvents: number
  topProducts: Array<{ id: string; name: string; adds: number }>
  paidOrders: number
  multiItemOrders: number
  aovUsd: number
}

const KIND_LABELS: Record<string, string> = {
  quickview_open: "Quick View opens",
  quickview_add: "Quick View add-to-cart",
  recommend_impression: "Upsell impressions",
  recommend_select: "Upsell selections",
  recommend_add: "Upsell add-to-cart",
  bundle_add: "Multi-item adds",
  cart_open: "Cart popup opens",
  cart_qty: "Quantity changes",
  cart_remove: "Cart removals",
  checkout_start: "Checkout starts",
  checkout_pay_attempt: "Payment attempts",
  checkout_success: "Confirmed payments",
  checkout_fail: "Payment failures",
}

export function MarketplaceUpsellsTab() {
  const [recs, setRecs] = useState<Rec[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [migrated, setMigrated] = useState(true)
  const [report, setReport] = useState<Report | null>(null)
  const [reportMigrated, setReportMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [primaryQ, setPrimaryQ] = useState("")
  const [recQ, setRecQ] = useState("")
  const [primaryId, setPrimaryId] = useState("")
  const [recId, setRecId] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [r, p, rep] = await Promise.all([
      fetch("/admin/marketplace/api?section=recommendations").then((x) => x.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=products&size=200").then((x) => x.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=upsell-report").then((x) => x.json()).catch(() => null),
    ])
    if (r) {
      setRecs(r.recommendations || [])
      setNames(r.names || {})
      setMigrated(r.migrated !== false)
    }
    if (p?.products) {
      setProducts(
        (p.products as Product[]).map((x) => ({
          id: x.id,
          product_name: x.product_name,
          product_image_url: x.product_image_url ?? null,
          clicks: x.clicks ?? 0,
          conversions: x.conversions ?? 0,
          sale_price: x.sale_price ?? null,
        }))
      )
    }
    if (rep) {
      setReport(rep.report || null)
      setReportMigrated(rep.migrated !== false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`market_upsells_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_recommendations" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_events" }, () => load())
      .subscribe()
    const t = setInterval(load, 30000)
    const focus = () => load()
    window.addEventListener("focus", focus)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", focus)
      supabase.removeChannel(ch)
    }
  }, [load])

  const match = (q: string) => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    return products.filter((p) => p.product_name.toLowerCase().includes(s)).slice(0, 8)
  }

  // Highest-clicking products first — the admin usually wants to pair a
  // winner with an add-on.
  const trending = useMemo(
    () =>
      [...products]
        .filter((p) => (p.clicks || 0) > 0 || (p.conversions || 0) > 0)
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.conversions || 0) - (a.conversions || 0))
        .slice(0, 6),
    [products]
  )

  const add = async () => {
    if (!primaryId || !recId || saving) return
    setSaving(true)
    setNotice("")
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recommend-add", primary_id: primaryId, recommended_id: recId }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setNotice("Recommendation saved — live on the product page now.")
        setPrimaryId("")
        setRecId("")
        setPrimaryQ("")
        setRecQ("")
        load()
      } else {
        setNotice(data?.error || "Could not save.")
      }
    } catch {
      setNotice("Could not save. Check your connection.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Remove this recommendation?")) return
    await fetch("/admin/marketplace/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recommend-remove", id }),
    }).catch(() => null)
    load()
  }

  const toggle = async (r: Rec) => {
    await fetch("/admin/marketplace/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recommend-toggle", id: r.id, is_active: !r.is_active }),
    }).catch(() => null)
    load()
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Rec[]>()
    for (const r of recs) {
      const list = map.get(r.primary_id) || []
      list.push(r)
      map.set(r.primary_id, list)
    }
    return [...map.entries()]
  }, [recs])

  if (loading) return <MarketLoading label="Loading upsells..." />

  const attachRate = report && report.paidOrders > 0 ? Math.round((report.multiItemOrders / report.paidOrders) * 1000) / 10 : 0

  return (
    <div>
      <MarketPageBar
        icon={TrendingUp}
        title="Upsells"
        desc="Complete-your-purchase — curated picks plus live conversion data"
        actions={
          <button type="button" onClick={load} className={marketBtnGhostCls}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {!migrated && (
        <MarketNotice tone="warn">
          Recommendations table not migrated yet — apply <code className="rounded bg-amber-100/60 px-1">supabase/migrations/094_marketplace_upsells.sql</code> in the
          Supabase SQL Editor. The storefront keeps working on automatic category recommendations meanwhile.
        </MarketNotice>
      )}
      {notice && <MarketNotice>{notice}</MarketNotice>}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MarketKpi label="Curated pairs" value={String(recs.length)} sub="pinned add-ons" icon={TrendingUp} tone="amber" />
        <MarketKpi label="Upsell adds" value={String(report?.byKind.recommend_add ?? 0)} sub="from Complete Your Purchase" icon={Plus} tone="violet" />
        <MarketKpi label="Multi-item orders" value={String(report?.multiItemOrders ?? 0)} sub={`${attachRate}% of paid orders`} icon={ShoppingBag} tone="sky" />
        <MarketKpi label="Avg order value" value={`$${(report?.aovUsd ?? 0).toFixed(2)}`} sub={`${report?.paidOrders ?? 0} paid orders`} icon={Banknote} tone="emerald" />
      </div>

      <section className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <h3 className="font-bold text-slate-900">Curated recommendations</h3>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Pin specific add-ons to a product. Curated picks always outrank automatic ones on “Complete Your Purchase”.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Primary product</label>
            <input
              value={primaryQ}
              onChange={(e) => setPrimaryQ(e.target.value)}
              placeholder="Search products..."
              className={marketInputCls}
            />
            {primaryId ? (
              <p className="mt-1 truncate text-xs font-semibold text-emerald-700">Selected: {names[primaryId] || products.find((p) => p.id === primaryId)?.product_name || primaryId.slice(0, 8)}</p>
            ) : (
              <ul className="mt-1 max-h-64 divide-y divide-slate-100 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200">
                {match(primaryQ).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setPrimaryId(p.id); setPrimaryQ(p.product_name) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-amber-50">
                      {p.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.product_image_url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
                      ) : (
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{p.product_name}</span>
                      {(p.clicks || 0) > 0 && <span className="shrink-0 text-[10px] font-bold text-slate-400">{p.clicks} clicks</span>}
                    </button>
                  </li>
                ))}
                {match(primaryQ).length === 0 && (
                  <li className="px-3 py-2 text-[13px] text-slate-400">No product matches that name.</li>
                )}
              </ul>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended add-on</label>
            <input
              value={recQ}
              onChange={(e) => setRecQ(e.target.value)}
              placeholder="Search products..."
              className={marketInputCls}
            />
            {recId ? (
              <p className="mt-1 truncate text-xs font-semibold text-emerald-700">Selected: {products.find((p) => p.id === recId)?.product_name || recId.slice(0, 8)}</p>
            ) : (
              <ul className="mt-1 max-h-64 divide-y divide-slate-100 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200">
                {match(recQ).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setRecId(p.id); setRecQ(p.product_name) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-amber-50">
                      {p.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.product_image_url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
                      ) : (
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{p.product_name}</span>
                      {(p.clicks || 0) > 0 && <span className="shrink-0 text-[10px] font-bold text-slate-400">{p.clicks} clicks</span>}
                    </button>
                  </li>
                ))}
                {match(recQ).length === 0 && (
                  <li className="px-3 py-2 text-[13px] text-slate-400">No product matches that name.</li>
                )}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={add}
            disabled={!primaryId || !recId || saving}
            className={marketBtnDarkCls + " disabled:opacity-50"}
          >
            <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add recommendation"}
          </button>
          {(primaryId || recId) && (
            <button type="button" onClick={() => { setPrimaryId(""); setRecId(""); setPrimaryQ(""); setRecQ("") }} className="text-xs text-slate-400 hover:text-slate-600">
              Clear selection
            </button>
          )}
        </div>

        {trending.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600" /> Best sellers — tap to pick
            </p>
            <div className="flex flex-wrap gap-2">
              {trending.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2">
                  {p.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.product_image_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                  ) : (
                    <span className="h-8 w-8 rounded-md bg-slate-100" />
                  )}
                  <span className="max-w-[160px] truncate text-xs font-semibold text-slate-700">{p.product_name}</span>
                  <button
                    type="button"
                    onClick={() => { setPrimaryId(p.id); setPrimaryQ(p.product_name) }}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-amber-100 hover:text-amber-700"
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecId(p.id); setRecQ(p.product_name) }}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-amber-100 hover:text-amber-700"
                  >
                    Add-on
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {grouped.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
              No curated recommendations yet — the storefront uses automatic category + co-purchase picks.
            </p>
          )}
          {grouped.map(([primary, list]) => (
            <div key={primary} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-900">{names[primary] || primary.slice(0, 8)}</p>
              <ul className="mt-2 space-y-1.5">
                {list.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-[13px]">
                    <span className={`flex-1 truncate ${r.is_active ? "text-slate-700" : "text-slate-400 line-through"}`}>
                      → {names[r.recommended_id] || r.recommended_id.slice(0, 8)}
                    </span>
                    <button type="button" onClick={() => toggle(r)} aria-label={r.is_active ? "Hide recommendation" : "Show recommendation"} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900">
                      {r.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => remove(r.id)} aria-label="Remove recommendation" className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={marketCardCls + " p-4 sm:p-5"}>
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 font-bold text-slate-900">
            <TrendingUp className="h-4 w-4 text-amber-600" /> Conversion report
          </h3>
          <button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        {!reportMigrated || !report ? (
          <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
            Collecting data — recommendation analytics appear here once shoppers interact and migration 094 is applied.
          </p>
        ) : report.totalEvents === 0 ? (
          <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
            Collecting data — no marketplace events recorded yet. Interactions from the cart popup, Quick View, upsells, and checkout feed this report.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(report.byKind).map(([k, n]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{KIND_LABELS[k] || k}</dt>
                  <dd className="text-xl font-extrabold tabular-nums text-slate-900">{n.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-500">Paid orders: </span>
                <strong className="tabular-nums text-slate-900">{report.paidOrders}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-500">Multi-item orders: </span>
                <strong className="tabular-nums text-slate-900">{report.multiItemOrders}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-500">Avg order value: </span>
                <strong className="tabular-nums text-slate-900">${report.aovUsd.toFixed(2)}</strong>
              </div>
            </div>
            {report.topProducts.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Top upsell adds</p>
                <ul className="mt-1.5 space-y-1">
                  {report.topProducts.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate text-slate-700">{t.name}</span>
                      <strong className="shrink-0 tabular-nums text-slate-900">{t.adds} adds</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

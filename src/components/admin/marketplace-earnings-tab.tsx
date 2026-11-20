"use client"

import { useCallback, useEffect, useState } from "react"
import { DollarSign, TrendingUp, Clock, Filter, X } from "lucide-react"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  marketInputCls,
  marketThCls,
  MarketBadge,
  MarketCardHead,
  MarketEmpty,
  MarketField,
  MarketKpi,
  MarketPageBar,
  MarketNotice,
  MarketTableShell,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface EarningRow {
  date: string
  category_slug: string | null
  gross_revenue_usd: number
  total_discounts_usd: number
  supplier_cost_usd: number
  shipping_charged_usd: number
  shipping_cost_usd: number
  gateway_fees_usd: number
  refunds_usd: number
  platform_commission_usd: number
  seller_earnings_usd: number
  net_profit_usd: number
  orders_count: number
  units_sold: number
}

const money = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—"
  return n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2)
}

const pct = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—%"
  return n.toFixed(0) + "%"
}

export function MarketplaceEarningsTab() {
  const [rows, setRows] = useState<EarningRow[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [category, setCategory] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const qs = new URLSearchParams()
      if (from) qs.set("from", from)
      if (to) qs.set("to", to)
      if (category) qs.set("category", category)
      const res = await fetch(`/admin/marketplace/api?section=earnings&${qs.toString()}`).then((r) => r.json())
      if (res?.error) throw new Error(res.error)
      setRows(Array.isArray(res?.earnings) ? res.earnings : [])
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load earnings.")
    } finally {
      setLoading(false)
    }
  }, [from, to, category])

  useEffect(() => {
    load()
  }, [load])

  // Aggregates across the visible window
  const totals = {
    gross: rows.reduce((s, r) => s + r.gross_revenue_usd, 0),
    discounts: rows.reduce((s, r) => s + r.total_discounts_usd, 0),
    supplierCost: rows.reduce((s, r) => s + r.supplier_cost_usd, 0),
    shippingCharged: rows.reduce((s, r) => s + r.shipping_charged_usd, 0),
    shippingCost: rows.reduce((s, r) => s + r.shipping_cost_usd, 0),
    gatewayFees: rows.reduce((s, r) => s + r.gateway_fees_usd, 0),
    refunds: rows.reduce((s, r) => s + r.refunds_usd, 0),
    platformCommission: rows.reduce((s, r) => s + r.platform_commission_usd, 0),
    sellerEarnings: rows.reduce((s, r) => s + r.seller_earnings_usd, 0),
    netProfit: rows.reduce((s, r) => s + r.net_profit_usd, 0),
    orders: rows.reduce((s, r) => s + r.orders_count, 0),
    units: rows.reduce((s, r) => s + r.units_sold, 0),
  }

  const grossMargin = totals.gross > 0 ? (totals.netProfit / totals.gross) * 100 : 0

  // Unique categories for the filter
  const categories = Array.from(new Set(rows.map((r) => r.category_slug).filter((c): c is string => Boolean(c)))).sort()

  return (
    <div>
      <MarketPageBar
        icon={DollarSign}
        title="Earnings & Profit Analytics"
        desc="Daily category-level earnings from real paid orders. Revenue, costs, gateway fees, refunds and net profit — nothing fabricated."
        badge={<MarketBadge tone="emerald" dot>Real data</MarketBadge>}
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-3">
        <MarketKpi label="Gross revenue" value={money(totals.gross)} sub={totals.orders + " orders"} icon={TrendingUp} />
        <MarketKpi label="Net profit" value={money(totals.netProfit)} sub={pct(grossMargin) + " margin"} />
        <MarketKpi label="Supplier cost" value={money(totals.supplierCost)} sub="CJ / vendor cost" />
        <MarketKpi label="Gateway fees" value={money(totals.gatewayFees)} sub="Flutterwave charges" />
        <MarketKpi label="Seller earnings" value={money(totals.sellerEarnings)} sub="Paid to sellers" icon={TrendingUp} />
        <MarketKpi label="Refunds" value={money(totals.refunds)} sub="Refunded to customers" />
      </div>

      {/* ---------- Filters ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead title="Filters" desc="Window and category scope for the table below." icon={Filter} />
        <div className="grid gap-2 sm:grid-cols-4">
          <MarketField label="From">
            <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className={marketInputCls} />
          </MarketField>
          <MarketField label="To">
            <input value={to} onChange={(e) => setTo(e.target.value)} type="date" className={marketInputCls} />
          </MarketField>
          <MarketField label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={marketInputCls}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </MarketField>
          <div className="flex items-end">
            <button onClick={load} disabled={loading} className={marketBtnPrimaryCls}>
              {loading ? "Loading…" : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5"}>
        <MarketCardHead
          title="Daily earnings by category"
          desc="One row per category per day. Click a row to see the full breakdown."
          icon={Clock}
        />
        {rows.length === 0 ? (
          <MarketEmpty icon={DollarSign} title="No earnings yet" desc="Paid orders will appear here once the store has sales." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Date</th>
                  <th className={marketThCls}>Category</th>
                  <th className={cn(marketThCls, "text-right")}>Revenue</th>
                  <th className={cn(marketThCls, "text-right")}>Discounts</th>
                  <th className={cn(marketThCls, "text-right")}>Supplier cost</th>
                  <th className={cn(marketThCls, "text-right")}>Shipping net</th>
                  <th className={cn(marketThCls, "text-right")}>Gateway</th>
                  <th className={cn(marketThCls, "text-right")}>Net profit</th>
                  <th className={cn(marketThCls, "text-center")}>Orders</th>
                  <th className={cn(marketThCls, "text-center")}>Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const shippingNet = r.shipping_charged_usd - r.shipping_cost_usd
                  return (
                    <tr key={`${r.date}|${r.category_slug}`} className="hover:bg-slate-50/60 group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-900">{r.date}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-900 truncate max-w-[140px] block">{r.category_slug || "uncategorized"}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-900">{money(r.gross_revenue_usd)}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-500">-${money(r.total_discounts_usd)}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-500">-${money(r.supplier_cost_usd)}</td>
                      <td className="px-4 py-3 tabular-nums text-right">
                        <span className={cn("font-bold", shippingNet >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {shippingNet >= 0 ? "+" : "-"}${money(Math.abs(shippingNet))}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-500">-${money(r.gateway_fees_usd)}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-900">
                        <span className={cn("font-bold", r.net_profit_usd >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {r.net_profit_usd >= 0 ? "+" : "-"}${money(Math.abs(r.net_profit_usd))}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-center">{r.orders_count}</td>
                      <td className="px-4 py-3 tabular-nums text-center">{r.units_sold}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals row */}
        <div className="mt-3 border border-slate-200 rounded-xl bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross revenue</span>
              <span className="font-bold tabular-nums text-slate-900">{money(totals.gross)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net profit</span>
              <span className={cn("font-bold tabular-nums", totals.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                {totals.netProfit >= 0 ? "+" : "-"}${money(Math.abs(totals.netProfit))}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Supplier cost</span>
              <span className="font-bold tabular-nums text-slate-500">-${money(totals.supplierCost)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform commission</span>
              <span className="font-bold tabular-nums text-slate-500">{money(totals.platformCommission)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Seller earnings</span>
              <span className="font-bold tabular-nums text-emerald-600">{money(totals.sellerEarnings)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipping net</span>
              <span className={cn("font-bold tabular-nums", totals.shippingCharged >= totals.shippingCost ? "text-emerald-600" : "text-red-600")}>
                {money(totals.shippingCharged - totals.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gateway fees</span>
              <span className="font-bold tabular-nums text-slate-500">-${money(totals.gatewayFees)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Refunds</span>
              <span className="font-bold tabular-nums text-slate-500">-${money(totals.refunds)}</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Blended gross margin: <span className={cn("font-semibold", grossMargin >= 20 ? "text-emerald-600" : grossMargin > 0 ? "text-amber-600" : "text-red-600")}>
              {grossMargin.toFixed(1)}%
            </span>
            &nbsp;·&nbsp;
            Orders: <span className="font-semibold">{totals.orders}</span>
            &nbsp;·&nbsp;
            Units: <span className="font-semibold">{totals.units}</span>
          </p>
        </div>
      </div>

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}

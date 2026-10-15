"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Banknote, ShoppingBag, MousePointerClick, BadgeCheck, BadgePercent, TrendingUp,
  Loader2, Crown,
} from "lucide-react"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts"
import { createClient } from "@/lib/supabase/client"

interface Analytics {
  totals: {
    revenueUsd: number
    revenueNgn: number
    orders: number
    paid: number
    avgOrder: number
    couponGiven: number
    couponUses: number
    clicks: number
    conversions: number
    vendors: number
    clickToOrder: number
  }
  series: Array<{ date: string; label: string; revenue: number; orders: number }>
  statuses: Array<{ status: string; count: number }>
  topRevenue: Array<{ id: string; name: string; qty: number; revenue: number }>
  topClicked: Array<{ id: string; name: string; clicks: number; conversions: number }>
  categories: Array<{ slug: string; count: number }>
  topCoupons: Array<{ code: string; uses: number; max_uses: number }>
}

const STATUS_COLORS = ["#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444", "#64748B"]

const cardCls = "bg-white border rounded-xl p-4"

function Kpi({ label, value, sub, icon: Icon, tint }: { label: string; value: string; sub: string; icon: typeof Banknote; tint: string }) {
  return (
    <div className={`${cardCls} transition-shadow hover:shadow-md`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${tint}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-extrabold tabular-nums text-slate-900">{value}</div>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  )
}

export function MarketplaceDashboardTab() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=analytics", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null)
    if (r?.analytics) setData(r.analytics as Analytics)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_dash_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .subscribe()
    const poll = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
    }
  }, [load])

  const maxCat = useMemo(() => Math.max(1, ...(data?.categories.map((c) => c.count) || [1])), [data])

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-600" /> Loading marketplace analytics...
      </div>
    )
  }

  const t = data?.totals
  const hasOrders = (t?.orders || 0) > 0

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Revenue (paid)" value={`$${(t?.revenueUsd || 0).toLocaleString()}`} sub={`₦${(t?.revenueNgn || 0).toLocaleString()} collected`} icon={Banknote} tint="text-emerald-600 bg-emerald-50" />
        <Kpi label="Paid orders" value={String(t?.paid || 0)} sub={`${t?.orders || 0} orders total · avg $${t?.avgOrder || 0}`} icon={ShoppingBag} tint="text-blue-600 bg-blue-50" />
        <Kpi label="Product clicks" value={(t?.clicks || 0).toLocaleString()} sub={`${t?.clickToOrder || 0}% click → paid`} icon={MousePointerClick} tint="text-violet-600 bg-violet-50" />
        <Kpi label="Coupon savings" value={`$${t?.couponGiven || 0}`} sub={`${t?.couponUses || 0} orders used a code`} icon={BadgePercent} tint="text-amber-600 bg-amber-50" />
        <Kpi label="Vendors" value={String(t?.vendors || 0)} sub="Supplier programs live" icon={TrendingUp} tint="text-sky-600 bg-sky-50" />
      </div>

      {!hasOrders && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          No orders yet — charts fill in live as shoppers buy. Share the store link to get the first sale.
        </div>
      )}

      {/* revenue + orders charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className={cardCls + " lg:col-span-3"}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-bold text-slate-900">Revenue — last 30 days</p>
              <p className="text-xs text-slate-500">Paid, fulfilled & delivered orders (USD)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series || []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="mkRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} labelStyle={{ color: "#0F172A" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#mkRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={cardCls + " lg:col-span-2"}>
          <p className="text-sm font-bold text-slate-900">Orders per day</p>
          <p className="text-xs text-slate-500 mb-1">Paid volume, last 30 days</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.series || []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} />
                <Tooltip labelStyle={{ color: "#0F172A" }} />
                <Bar dataKey="orders" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* status pie + top products + categories + coupons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className={cardCls}>
          <p className="text-sm font-bold text-slate-900">Orders by status</p>
          <p className="text-xs text-slate-500 mb-1">Fulfillment pipeline</p>
          {(data?.statuses.length || 0) > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.statuses} dataKey="count" nameKey="status" innerRadius={52} outerRadius={80} paddingAngle={2}>
                    {(data?.statuses || []).map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">No orders yet</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            {(data?.statuses || []).map((s, i) => (
              <span key={s.status} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                {s.status} · {s.count}
              </span>
            ))}
          </div>
        </div>

        <div className={cardCls}>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Crown className="h-4 w-4 text-amber-500" /> Top earners</p>
          <p className="text-xs text-slate-500 mb-2">Revenue from paid order items</p>
          {(data?.topRevenue.length || 0) > 0 ? (
            <ul className="space-y-2.5">
              {data?.topRevenue.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-extrabold text-slate-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.qty} sold</p>
                  </div>
                  <span className="text-xs font-extrabold tabular-nums text-emerald-600">${p.revenue.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">Sales will rank here</p>
          )}
        </div>

        <div className={cardCls}>
          <p className="text-sm font-bold text-slate-900">Most clicked</p>
          <p className="text-xs text-slate-500 mb-2">Shopper interest by product</p>
          {(data?.topClicked.length || 0) > 0 ? (
            <ul className="space-y-2.5">
              {data?.topClicked.map((p) => {
                const max = Math.max(1, ...(data?.topClicked.map((x) => x.clicks) || [1]))
                return (
                  <li key={p.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-slate-800">{p.name}</p>
                      <span className="text-[11px] font-bold tabular-nums text-slate-500 shrink-0">{p.clicks} clicks</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round((p.clicks / max) * 100)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">Clicks will rank here</p>
          )}
        </div>

        <div className={cardCls}>
          <p className="text-sm font-bold text-slate-900">Catalog by department</p>
          <p className="text-xs text-slate-500 mb-2">Live product spread</p>
          {(data?.categories.length || 0) > 0 ? (
            <ul className="space-y-2.5">
              {data?.categories.map((c) => (
                <li key={c.slug}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-slate-800 capitalize">{c.slug.replace(/-/g, " ")}</p>
                    <span className="text-[11px] font-bold tabular-nums text-slate-500 shrink-0">{c.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.round((c.count / maxCat) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">No products yet</p>
          )}
        </div>

        <div className={cardCls}>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-500" /> Coupon leaderboard</p>
          <p className="text-xs text-slate-500 mb-2">Usage vs limits</p>
          {(data?.topCoupons.length || 0) > 0 ? (
            <ul className="space-y-2.5">
              {data?.topCoupons.map((c) => (
                <li key={c.code}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-mono font-bold text-slate-800">{c.code}</p>
                    <span className="text-[11px] font-bold tabular-nums text-slate-500 shrink-0">
                      {c.uses}{c.max_uses > 0 ? `/${c.max_uses}` : ""} used
                    </span>
                  </div>
                  {c.max_uses > 0 && (
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.round((c.uses / c.max_uses) * 100))}%` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">Create coupons in Promotions</p>
          )}
        </div>

        <div className={cardCls + " bg-gradient-to-br from-slate-900 to-slate-800 !border-slate-900 text-white"}>
          <p className="text-sm font-bold">Conversion snapshot</p>
          <p className="text-xs text-slate-400 mb-3">Clicks → paid orders</p>
          <p className="text-4xl font-extrabold tabular-nums">{t?.clickToOrder || 0}<span className="text-lg text-slate-400">%</span></p>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-300"><span>Clicks</span><span className="font-bold tabular-nums">{(t?.clicks || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-300"><span>Conversions tracked</span><span className="font-bold tabular-nums">{(t?.conversions || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-300"><span>Paid orders</span><span className="font-bold tabular-nums">{t?.paid || 0}</span></div>
            <div className="flex justify-between text-slate-300"><span>Avg order</span><span className="font-bold tabular-nums">${t?.avgOrder || 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Banknote, ShoppingBag, MousePointerClick, BadgeCheck, BadgePercent, TrendingUp,
  Loader2, Crown, Plus, Plug, ImagePlus, CreditCard, ArrowRight, Filter,
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

const cardCls = "bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  return (
    <div className="h-9 -mb-1 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`mkSpark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#mkSpark-${color.replace("#", "")})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function Delta({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span title="Needs 14+ days of sales history" className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-400">
        —
      </span>
    )
  }
  const up = value >= 0
  return (
    <span
      title="Last 7 days vs the previous 7 days"
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
    >
      <TrendingUp className={`h-3 w-3 ${up ? "" : "rotate-180"}`} />
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  )
}

function Kpi({ label, value, sub, icon: Icon, tint, spark, sparkColor, delta }: {
  label: string
  value: string
  sub: string
  icon: typeof Banknote
  tint: string
  spark?: number[]
  sparkColor?: string
  delta?: number | null
}) {
  return (
    <div className={`${cardCls} transition-all hover:shadow-md hover:-translate-y-px`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}>
          <Icon className="h-4 w-4" />
        </div>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <div className="mt-2.5 text-[26px] leading-none font-extrabold tabular-nums tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-600">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
      {spark && sparkColor && <Spark data={spark} color={sparkColor} />}
    </div>
  )
}

function ChartTip({ active, payload, label, money }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null
  const v = Number(payload[0]?.value) || 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="text-sm font-extrabold tabular-nums text-slate-900">{money ? `$${v.toFixed(2)}` : v}</p>
    </div>
  )
}

/** % change of the last 7 days vs the previous 7 (null when no baseline). */
function weekDelta(series: Array<{ revenue: number; orders: number }>, key: "revenue" | "orders"): number | null {
  if (series.length < 14) return null
  const last = series.slice(-7).reduce((s, d) => s + d[key], 0)
  const prev = series.slice(-14, -7).reduce((s, d) => s + d[key], 0)
  if (prev <= 0) return last > 0 ? 100 : null
  return Math.round(((last - prev) / prev) * 1000) / 10
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
  const series = data?.series || []
  const revSpark = series.map((d) => d.revenue)
  const ordSpark = series.map((d) => d.orders)
  const revDelta = weekDelta(series, "revenue")
  const ordDelta = weekDelta(series, "orders")

  const clicks = t?.clicks || 0
  const conversions = t?.conversions || 0
  const paidCount = t?.paid || 0
  const funnelSteps = [
    { label: "Clicks", value: clicks, pct: 100, bar: "bg-violet-500" },
    { label: "Conversions", value: conversions, pct: clicks > 0 ? Math.min(100, (conversions / clicks) * 100) : 0, bar: "bg-sky-500" },
    { label: "Paid orders", value: paidCount, pct: clicks > 0 ? Math.min(100, (paidCount / clicks) * 100) : 0, bar: "bg-emerald-500" },
  ]

  const quickActions = [
    { href: "/admin/marketplace?section=products", icon: Plus, label: "New product", desc: "Add to catalog" },
    { href: "/admin/marketplace?section=cj", icon: Plug, label: "Import CJ", desc: "Sync supplier" },
    { href: "/admin/marketplace?section=promotions", icon: BadgePercent, label: "New coupon", desc: "Boost sales" },
    { href: "/admin/marketplace?section=banners", icon: ImagePlus, label: "Edit banners", desc: "Hero & flash" },
    { href: "/admin/marketplace?section=payments", icon: CreditCard, label: "Payout keys", desc: "Gateway mode" },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* KPI row — 2 cols on phones, 3 on tablets, 5 on desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Revenue (paid)" value={`$${(t?.revenueUsd || 0).toLocaleString()}`} sub={`₦${(t?.revenueNgn || 0).toLocaleString()} collected`} icon={Banknote} tint="text-emerald-600 bg-emerald-50" spark={revSpark} sparkColor="#10B981" delta={revDelta} />
        <Kpi label="Paid orders" value={String(t?.paid || 0)} sub={`${t?.orders || 0} orders total · avg $${t?.avgOrder || 0}`} icon={ShoppingBag} tint="text-blue-600 bg-blue-50" spark={ordSpark} sparkColor="#3B82F6" delta={ordDelta} />
        <Kpi label="Product clicks" value={(t?.clicks || 0).toLocaleString()} sub={`${t?.clickToOrder || 0}% click → paid`} icon={MousePointerClick} tint="text-violet-600 bg-violet-50" />
        <Kpi label="Coupon savings" value={`$${t?.couponGiven || 0}`} sub={`${t?.couponUses || 0} orders used a code`} icon={BadgePercent} tint="text-amber-600 bg-amber-50" />
        <Kpi label="Vendors" value={String(t?.vendors || 0)} sub="Supplier programs live" icon={TrendingUp} tint="text-sky-600 bg-sky-50" />
      </div>

      {/* funnel + quick actions — Shopify-style second row */}
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-5">
        <div className={cardCls + " lg:col-span-3"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Filter className="h-4 w-4 text-violet-500" /> Sales funnel
              </p>
              <p className="text-xs text-slate-500">Clicks → conversions → paid, all time</p>
            </div>
            <Link href="/admin/marketplace?section=orders" className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700">
              Orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {funnelSteps.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700">{s.label}</span>
                  <span className="font-extrabold tabular-nums text-slate-900">{s.value.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${s.bar} transition-all`} style={{ width: `${Math.max(s.value > 0 ? 4 : 0, Math.round(s.pct))}%` }} />
                </div>
              </div>
            ))}
          </div>
          {clicks === 0 && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              No shopper activity yet — share the store link and clicks will flow in here live.
            </p>
          )}
        </div>
        <div className={cardCls + " lg:col-span-2"}>
          <p className="text-sm font-bold text-slate-900">Quick actions</p>
          <p className="mb-2 text-xs text-slate-500">Jump to the task that moves sales</p>
          <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 transition-all hover:border-amber-300 hover:bg-amber-50/60 active:scale-[0.99]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition-colors group-hover:text-amber-600">
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-xs font-bold text-slate-800">{a.label}</span>
                  <span className="block truncate text-[11px] text-slate-400">{a.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!hasOrders && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          No orders yet — charts fill in live as shoppers buy. Share the store link to get the first sale.
        </div>
      )}

      {/* revenue + orders charts */}
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-5">
        <div className={cardCls + " lg:col-span-3"}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-bold text-slate-900">Revenue — last 30 days</p>
              <p className="text-xs text-slate-500">Paid, fulfilled & delivered orders (USD)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series || []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="mkRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} interval={4} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip money />} cursor={{ stroke: "#CBD5E1", strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} fill="url(#mkRev)" dot={false} activeDot={{ r: 4, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={cardCls + " lg:col-span-2"}>
          <p className="text-sm font-bold text-slate-900">Orders per day</p>
          <p className="text-xs text-slate-500 mb-1">Paid volume, last 30 days</p>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.series || []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} interval={4} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="orders" fill="#F59E0B" radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* status pie + top products + categories + coupons */}
      <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
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

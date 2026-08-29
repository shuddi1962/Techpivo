"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { SITE_URL } from "@/lib/constants"
import { AiExecutiveSummary } from "@/components/admin/ai-executive-summary"
import { LivePublishingQueue } from "@/components/admin/live-publishing-queue"
import { NotificationCenter } from "@/components/admin/notification-center"
import { ExecutiveKpiCards } from "@/components/admin/executive-kpi-cards"
import { FxApprox } from "@/components/fx-approx"
import { CountryFlag, resolveCountry } from "./country-data"
import {
  RefreshCw, TrendingUp, TrendingDown,
  BarChart3, Activity, Globe, MousePointerClick, Smartphone,
  FileText, Clock, ArrowUpRight, Eye, Users, Wallet,
} from "lucide-react"
import {
  ChartPie, ChartComposed, ChartLeaderboard
} from "@/components/charts"

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

const ORDER_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#F1F5F9", fg: "#475569" },
  pending: { bg: "#FEF3C7", fg: "#92400E" },
  approved: { bg: "#DBEAFE", fg: "#1E40AF" },
  rejected: { bg: "#FEE2E2", fg: "#991B1B" },
  live: { bg: "#DCFCE7", fg: "#166534" },
  completed: { bg: "#E2E8F0", fg: "#334155" },
  paused: { bg: "#EDE9FE", fg: "#5B21B6" },
  cancelled: { bg: "#FEE2E2", fg: "#991B1B" },
}

export default function AdminDashboard() {
  const supabaseRef = useRef(createClient())
  const [viewsOverTime, setViewsOverTime] = useState<{ date: string; views: number; sessions: number }[]>([])
  const [topPosts, setTopPosts] = useState<any[]>([])
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([])
  const [regions, setRegions] = useState<{ name: string; code: string | null; value: number }[]>([])
  const [pages, setPages] = useState<{ name: string; value: number }[]>([])
  const [referrers, setReferrers] = useState<{ name: string; value: number }[]>([])
  const [liveVisitors, setLiveVisitors] = useState(0)
  const [viewsToday, setViewsToday] = useState(0)
  const [sessionsToday, setSessionsToday] = useState(0)
  const [sessions7d, setSessions7d] = useState(0)
  const [revenue30d, setRevenue30d] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const supabase = supabaseRef.current
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

      const [
        topPostsRes, dailyViewsRes, statusCounts,
        regionRes, pageRes, referrerRes,
        viewsTodayRes, liveRes,
        sessionsRes, adRevenueRes, pendingRes, recentOrdersRes,
      ] = await Promise.all([
        supabase.from("posts").select("id, title, slug, views").eq("status", "published").order("views", { ascending: false }).limit(5),
        supabase.from("analytics_events").select("created_at, session_id").eq("event_type", "page_view").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "archived"),
        ]),
        supabase.from("analytics_events").select("country").eq("event_type", "page_view").not("country", "is", null).limit(500),
        supabase.from("analytics_events").select("page_url").eq("event_type", "page_view").not("page_url", "is", null).limit(500),
        supabase.from("analytics_events").select("referrer").eq("event_type", "page_view").not("referrer", "is", null).limit(500),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", todayStart),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", fiveMinAgo),
        supabase.from("analytics_events").select("session_id, created_at").eq("event_type", "page_view").not("session_id", "is", null).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("ad_revenue").select("revenue").gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
        supabase.from("ad_campaigns").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ad_campaigns").select("id, headline, advertiser_email, total_price, status, created_at").order("created_at", { ascending: false }).limit(5),
      ])

      if (topPostsRes.data) setTopPosts(topPostsRes.data)

      const dailyMap: Record<string, { views: number; sessions: Set<string> }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        dailyMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = { views: 0, sessions: new Set() }
      }
      ;(dailyViewsRes.data || []).forEach((e: any) => {
        const key = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (dailyMap[key]) {
          dailyMap[key].views++
          if (e.session_id) dailyMap[key].sessions.add(e.session_id)
        }
      })
      setViewsOverTime(Object.entries(dailyMap).map(([date, v]) => ({ date, views: v.views, sessions: v.sessions.size })))

      const [pubC, draftC, schC, archC] = statusCounts
      setStatusDist([
        { name: "Published", value: pubC.count || 0 },
        { name: "Draft", value: draftC.count || 0 },
        { name: "Scheduled", value: schC.count || 0 },
        { name: "Archived", value: archC.count || 0 },
      ])

      const regionMap: Record<string, number> = {}
      ;(regionRes.data || []).forEach((r: any) => {
        const name = r.country || "Unknown"
        regionMap[name] = (regionMap[name] || 0) + 1
      })
      const sortedRegions = Object.entries(regionMap)
        .filter(([name]) => name !== "Unknown" && name !== "UTC" && name !== "Etc" && name !== "")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      setRegions(sortedRegions.map(([raw, value]) => {
        const meta = resolveCountry(raw)
        return { name: meta ? meta.name : raw, code: meta?.code ?? null, value }
      }))

      setLiveVisitors(liveRes.count || 0)
      setViewsToday(viewsTodayRes.count || 0)
      const sessionEvents = (sessionsRes.data || []).filter((e: any) => e.session_id)
      setSessions7d(new Set(sessionEvents.map((e: any) => e.session_id)).size)
      setSessionsToday(new Set(sessionEvents.filter((e: any) => e.created_at >= todayStart).map((e: any) => e.session_id)).size)
      setRevenue30d((adRevenueRes.data || []).reduce((s: number, r: any) => s + (Number(r.revenue) || 0), 0))
      setPendingOrders(pendingRes.count || 0)
      setRecentOrders(recentOrdersRes.data || [])

      const pageMap: Record<string, number> = {}
      ;(pageRes.data || []).forEach((r: any) => {
        const name = r.page_url || "/"
        pageMap[name] = (pageMap[name] || 0) + 1
      })
      setPages(Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })))

      const refMap: Record<string, number> = {}
      ;(referrerRes.data || []).forEach((r: any) => {
        let name = r.referrer || "Direct"
        if (!name || name === "") name = "Direct"
        try { name = new URL(name).hostname } catch { name = "Direct" }
        refMap[name] = (refMap[name] || 0) + 1
      })
      setReferrers(Object.entries(refMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })))
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const client = supabaseRef.current
    const channel = client
      .channel(`admin_dashboard_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => { fetchData() })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => { fetchData() })
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_revenue" }, () => { fetchData() })
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => { fetchData() })
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaign_daily_stats" }, () => { fetchData() })
      .subscribe()
    const interval = setInterval(fetchData, 30000)
    const onFocus = () => fetchData()
    window.addEventListener("focus", onFocus)
    return () => {
      client.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [fetchData])

  const statusPieData = statusDist.filter(s => s.value > 0)

  const weekTotal = viewsOverTime.reduce((s, d) => s + d.views, 0)
  const hasViewsData = viewsOverTime.length > 0 && !viewsOverTime.every(d => d.views === 0)

  return (
    <div className="space-y-6">
      {/* ── Header with live counter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your publishing command center</p>
          </div>
          {!loading && (
            <Link
              href="/admin/analytics"
              className="hidden sm:flex items-center gap-3 pl-4 border-l border-border group"
              title="Open analytics"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              <div className="text-right group-hover:opacity-80 transition-opacity">
                <span className="text-xl font-bold text-emerald-500 tabular-nums">{liveVisitors}</span>
                <span className="text-xs text-muted-foreground ml-1.5">visitors / 5min</span>
              </div>
              <div className="text-right group-hover:opacity-80 transition-opacity">
                <span className="text-xl font-bold text-amber-500 tabular-nums">{viewsToday.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1.5">today</span>
              </div>
              <div className="text-right group-hover:opacity-80 transition-opacity">
                <span className="text-xl font-bold text-blue-500 tabular-nums">{sessionsToday.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1.5">sessions</span>
              </div>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums">
            {now.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Mobile live counter ── */}
      {!loading && (
        <Link
          href="/admin/analytics"
          className="flex sm:hidden items-center justify-around bg-card border rounded-xl p-4 group"
          title="Open analytics"
        >
          <div className="text-center group-hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
            <span className="text-2xl font-bold text-emerald-500 tabular-nums">{liveVisitors}</span>
            <p className="text-[10px] text-muted-foreground">visitors / 5min</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center group-hover:opacity-80 transition-opacity">
            <Eye className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <span className="text-2xl font-bold text-amber-500 tabular-nums">{viewsToday.toLocaleString()}</span>
            <p className="text-[10px] text-muted-foreground">views today</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center group-hover:opacity-80 transition-opacity">
            <BarChart3 className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <span className="text-2xl font-bold text-blue-500 tabular-nums">{weekTotal.toLocaleString()}</span>
            <p className="text-[10px] text-muted-foreground">this week</p>
          </div>
        </Link>
      )}

      <ExecutiveKpiCards />

      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold">Revenue & Sessions</h2>
          </div>
          {!loading && (
            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border">
              updates live
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link href="/admin/ads" className="rounded-xl bg-muted/40 p-4 hover:bg-muted/60 hover:border-primary/30 border border-transparent transition-colors group">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Ad Revenue (30d)</p>
            <p className="text-2xl font-bold mt-1 tabular-nums group-hover:text-primary transition-colors">{loading ? "…" : `$${revenue30d.toFixed(2)}`}</p>
            {!loading && revenue30d > 0 && <FxApprox amount={revenue30d} from="USD" className="block text-xs text-muted-foreground mt-0.5" />}
          </Link>
          <Link href="/admin/ads" className="rounded-xl bg-muted/40 p-4 hover:bg-muted/60 hover:border-primary/30 border border-transparent transition-colors group">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Pending Orders</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-amber-500 group-hover:text-primary transition-colors">{loading ? "…" : pendingOrders}</p>
          </Link>
          <Link href="/admin/analytics" className="rounded-xl bg-muted/40 p-4 hover:bg-muted/60 hover:border-primary/30 border border-transparent transition-colors group">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Sessions Today</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-emerald-500 group-hover:text-primary transition-colors">{loading ? "…" : sessionsToday.toLocaleString()}</p>
          </Link>
          <Link href="/admin/analytics" className="rounded-xl bg-muted/40 p-4 hover:bg-muted/60 hover:border-primary/30 border border-transparent transition-colors group">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Sessions (7d)</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-blue-500 group-hover:text-primary transition-colors">{loading ? "…" : sessions7d.toLocaleString()}</p>
          </Link>
          <Link href="/admin/analytics" className="rounded-xl bg-muted/40 p-4 hover:bg-muted/60 hover:border-primary/30 border border-transparent transition-colors group">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Views Today</p>
            <p className="text-2xl font-bold mt-1 tabular-nums group-hover:text-primary transition-colors">{loading ? "…" : viewsToday.toLocaleString()}</p>
          </Link>
        </div>
        {!loading && recentOrders.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Campaign Orders</p>
              <Link href="/admin/ads" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                Manage ads <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {recentOrders.map((c: any) => (
                <Link key={c.id} href="/admin/ads" className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm hover:bg-muted/60 hover:border-primary/30 border border-transparent transition-colors group/order">
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover/order:text-primary transition-colors">{c.headline || "Untitled campaign"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.advertiser_email || "—"} · {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-bold tabular-nums">₦{Number(c.total_price || 0).toLocaleString()}</p>
                    <FxApprox amount={Number(c.total_price || 0)} from="NGN" className="block text-[10px] text-muted-foreground" />
                    <span
                      className="text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: ORDER_STATUS_COLORS[c.status]?.bg || "hsl(var(--muted))",
                        color: ORDER_STATUS_COLORS[c.status]?.fg || "hsl(var(--muted-foreground))",
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AiExecutiveSummary />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivePublishingQueue />
        <NotificationCenter />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4 bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold">Views This Week</h2>
            </div>
            <div className="flex items-center gap-2">
              {!loading && (
                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border">
                  {weekTotal.toLocaleString()} total
                </span>
              )}
              <Link href="/admin/analytics" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                Analytics <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          ) : !hasViewsData ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <Link href="/admin/analytics" className="block group">
              <ChartComposed
                data={viewsOverTime}
                xKey="date"
                bars={[{ key: "views", color: "#f59e0b", name: "Views" }]}
                lines={[{ key: "sessions", color: "#3b82f6", name: "Sessions" }]}
                height={260}
              />
            </Link>
          )}
        </div>

        <div className="lg:col-span-3 bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold">Post Status Distribution</h2>
            </div>
            <Link href="/admin/posts" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Manage posts <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : statusPieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No posts yet</div>
          ) : (
            <div className="flex flex-col items-center">
              <ChartPie
                data={statusPieData}
                nameKey="name"
                valueKey="value"
                colors={[COLORS[0], COLORS[2], COLORS[1], COLORS[3]]}
                height={220}
                donut
                showLabel
              />
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {statusPieData.map((s, i) => s.value > 0 && (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: [COLORS[0], COLORS[2], COLORS[1], COLORS[3]][i] }} />
                    <span className="text-xs font-medium text-muted-foreground">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Posts + Top Regions + Top Pages ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-3 bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-semibold">Top Posts by Views</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : topPosts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No published posts yet</div>
          ) : (
            <div className="space-y-2">
              {topPosts.map((p: any, i: number) => (
                <Link
                  key={p.id}
                  href={`/admin/posts/${p.id}/edit`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: i < 3 ? [`linear-gradient(135deg,#f59e0b,#d97706)`,`linear-gradient(135deg,#94a3b8,#64748b)`,`linear-gradient(135deg,#b45309,#92400e)`][i] : "hsl(var(--muted))",
                      color: i < 3 ? "#fff" : "hsl(var(--muted-foreground))",
                      boxShadow: i < 3 ? `0 2px 8px ${[`rgba(245,158,11,0.3)`,`rgba(148,163,184,0.25)`,`rgba(180,83,9,0.25)`][i]}` : "none",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-emerald-500 transition-colors">
                      {p.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">/{p.slug}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-emerald-500">
                    {(p.views || 0).toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold">Top Regions</h2>
            </div>
            <Link href="/admin/analytics" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Analytics <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : regions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground">
              <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p>No region data yet</p>
              <p className="text-xs mt-1">Data appears as visitors view posts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {regions.slice(0, 7).map((r, i) => {
                const flag = r.code ? <CountryFlag code={r.code} size="1.2rem" showName={false} /> : null
                return (
                  <div key={i} className="flex items-center gap-3">
                    {flag && <span className="flex-shrink-0">{flag}</span>}
                    <span className="text-sm truncate flex-1 min-w-0">{r.name}</span>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground ml-auto pl-2">{r.value.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <MousePointerClick className="h-5 w-5 text-cyan-500" />
            <h2 className="text-base font-semibold">Top Pages</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : pages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p>No page data yet</p>
              <p className="text-xs mt-1">Data appears as visitors view posts</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pages.map((p, i) => (
                <Link
                  key={i}
                  href={`${SITE_URL}${p.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-1 border-b border-border/50 last:border-0 hover:bg-muted/40 rounded-md group/page"
                >
                  <span className="text-sm text-muted-foreground truncate flex-1 min-w-0 group-hover/page:text-primary transition-colors" title={p.name}>
                    {p.name.length > 28 ? p.name.slice(0, 25) + "..." : p.name}
                  </span>
                  <span className="text-sm font-semibold tabular-nums ml-3 group-hover/page:text-primary transition-colors">{p.value.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Traffic Sources ── */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-lime-500" />
            <h2 className="text-base font-semibold">Traffic Sources</h2>
          </div>
          <Link href="/admin/analytics" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            Analytics <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : referrers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p>No traffic source data yet</p>
            <p className="text-xs mt-1">Data appears as visitors come from external sites</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {referrers.map((r, i) => {
              const pct = weekTotal > 0 ? ((r.value / weekTotal) * 100).toFixed(1) : "0"
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS[i % COLORS.length] + "20" }}>
                    <TrendingUp className="h-4 w-4" style={{ color: COLORS[i % COLORS.length] }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={r.name}>{r.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold tabular-nums">{r.value.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

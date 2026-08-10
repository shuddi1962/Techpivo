"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, Globe, TrendingUp, Share2, Mail, Brain, Download, Wallet, ReceiptText, Eye, MousePointerClick } from "lucide-react"
import { AiInsights } from "@/components/admin/ai-insights"
import { ChartLine, ChartBar, ChartArea, ChartPie, ChartLeaderboard } from "@/components/charts"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"]

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "realtime", label: "Real-Time", icon: TrendingUp },
  { id: "audience", label: "Audience", icon: Users },
  { id: "traffic", label: "Traffic Sources", icon: Globe },
  { id: "revenue", label: "Revenue", icon: Wallet },
  { id: "social", label: "Social", icon: Share2 },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "ai", label: "AI Insights", icon: Brain },
  { id: "exports", label: "Exports", icon: Download },
]

function OverviewTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [users, pageViews, postsCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      ])

      const { data: dailyData } = await supabase
        .from("analytics_events")
        .select("created_at, post_id, session_id, page_url")
        .eq("event_type", "page_view")
        .gte("created_at", since30d)
        .limit(20000)

      const { data: catPosts } = await supabase
        .from("posts")
        .select("category_id, categories!left(name)")
        .eq("status", "published")
        .limit(100)

      const events = dailyData || []
      const sessions = new Set<string>()
      let nullSessions = 0
      events.forEach((e: any) => {
        if (e.session_id) sessions.add(e.session_id)
        else nullSessions++
      })
      const sessions30d = sessions.size + nullSessions
      const postViews30d = events.filter((e: any) => e.post_id).length

      const pageMap: Record<string, number> = {}
      events.forEach((e: any) => {
        const url = e.page_url || "/"
        pageMap[url] = (pageMap[url] || 0) + 1
      })
      const sortedPages = Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

      const catMap: Record<string, number> = {}
      ;(catPosts || []).forEach((p: any) => {
        const name = p.categories?.name || "Uncategorized"
        catMap[name] = (catMap[name] || 0) + 1
      })

      const dailyChart = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        const dayStr = d.toDateString()
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const dayEvents = events.filter((e: any) => new Date(e.created_at).toDateString() === dayStr)
        return { date: label, views: dayEvents.length, posts: dayEvents.filter((e: any) => e.post_id).length }
      })

      setData({
        users: users.count || 0,
        sessions: sessions30d,
        pageViews: pageViews.count || 0,
        views30d: events.length,
        postViews30d,
        postsCount: postsCount.count || 0,
        dailyChart,
        topPages: sortedPages,
        categories: Object.entries(catMap).map(([name, count]) => ({ name, count })),
      })
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    const id = `analytics_overview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(id)
    const refresh = () => { if (mounted) load() }
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, refresh)
    channel.subscribe()
    const poll = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => {
      mounted = false
      clearInterval(poll)
      window.removeEventListener("focus", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics...</div>
  if (!data) return <div className="flex items-center justify-center h-64 text-muted-foreground">No data available yet</div>

  const topPagesChart = data.topPages.map(([url, count]: [string, number]) => ({
    page: url.length > 30 ? url.substring(0, 30) + "..." : url,
    views: count,
  }))

  const catChart = data.categories.map((c: any) => ({ category: c.name, articles: c.count }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Users</p>
            <p className="text-2xl font-bold mt-1">{data.users.toLocaleString()}</p>
            <p className="text-xs mt-1 text-emerald-500 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> Total registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Sessions (30d)</p>
            <p className="text-2xl font-bold mt-1">{data.sessions.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Distinct visitors, last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Site Views (30d)</p>
            <p className="text-2xl font-bold mt-1">{data.views30d.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">All pages incl. articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Post Views (30d)</p>
            <p className="text-2xl font-bold mt-1">{data.postViews30d.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Article pages only</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Published Posts</p>
            <p className="text-2xl font-bold mt-1">{data.postsCount.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Total articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Avg Daily Views</p>
            <p className="text-2xl font-bold mt-1">{Math.round(data.views30d / 30).toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Per day (30d avg)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Views (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <ChartLine
            data={data.dailyChart}
            xKey="date"
            lines={[
              { key: "views", color: COLORS[0], name: "All Pages" },
              { key: "posts", color: COLORS[1], name: "Article Pages" },
            ]}
            height={250}
            showDots={false}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Pages (30d)</CardTitle></CardHeader>
          <CardContent>
            {topPagesChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No page data yet</p>
            ) : (
              <ChartBar
                data={topPagesChart}
                xKey="page"
                bars={[{ key: "views", color: COLORS[0], name: "Views" }]}
                height={220}
                layout="vertical"
                showValues
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Content by Category</CardTitle></CardHeader>
          <CardContent>
            {catChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No categories yet</p>
            ) : (
              <ChartBar
                data={catChart}
                xKey="category"
                bars={[{ key: "articles", color: COLORS[1], name: "Articles" }]}
                height={220}
                showValues
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RealTimeTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ activeNow: 0, today: 0, thisHour: 0, sessionsToday: 0 })
  const [pages, setPages] = useState<{ page: string; visitors: number }[]>([])
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRealtime = useCallback(async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

      const [todayRes, hourRes, pageRes, countryRes, todayEvents] = await Promise.all([
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", todayStart),
        supabase.from("analytics_events").select("session_id").eq("event_type", "page_view").gte("created_at", hourAgo).limit(500),
        supabase.from("analytics_events").select("page_url").eq("event_type", "page_view").gte("created_at", hourAgo).limit(500),
        supabase.from("analytics_events").select("country").eq("event_type", "page_view").gte("created_at", todayStart).limit(500),
        supabase.from("analytics_events").select("session_id").eq("event_type", "page_view").gte("created_at", todayStart).limit(2000),
      ])

      const countSessions = (rows: any[]) => {
        const set = new Set<string>()
        let nulls = 0
        rows.forEach((r: any) => { if (r.session_id) set.add(r.session_id); else nulls++ })
        return set.size + nulls
      }

      const pageMap: Record<string, number> = {}
      ;(pageRes.data || []).forEach((p: any) => {
        const url = p.page_url || "/"
        pageMap[url] = (pageMap[url] || 0) + 1
      })

      const countryMap: Record<string, number> = {}
      ;(countryRes.data || []).forEach((c: any) => {
        if (c.country) countryMap[c.country] = (countryMap[c.country] || 0) + 1
      })

      setStats({
        activeNow: countSessions(hourRes.data || []),
        today: todayRes.count || 0,
        thisHour: (hourRes.data || []).length,
        sessionsToday: countSessions(todayEvents.data || []),
      })
      setPages(Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, visitors]) => ({ page, visitors })))
      setCountries(Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })))
    } catch (err) {
      console.error("Realtime fetch error:", err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 30000)
    return () => clearInterval(interval)
  }, [fetchRealtime])

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading real-time data...</div>

  const pagesChart = pages.map(p => ({ page: p.page.length > 25 ? p.page.substring(0, 25) + "..." : p.page, visitors: p.visitors }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="relative inline-flex">
              <span className="absolute -top-1 -right-1 h-3 w-3">
                <span className="animate-ping absolute h-3 w-3 rounded-full bg-green-400 opacity-75" />
                <span className="relative h-3 w-3 rounded-full bg-green-500 inline-block" />
              </span>
              <p className="text-3xl font-bold">{stats.activeNow}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active Visitors (Last Hour)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.today.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Views Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.thisHour.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Views This Hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{stats.sessionsToday.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions Today</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Pages (Last Hour)</CardTitle></CardHeader>
          <CardContent>
            {pagesChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent page views</p>
            ) : (
              <ChartBar
                data={pagesChart}
                xKey="page"
                bars={[{ key: "visitors", color: COLORS[5], name: "Visitors" }]}
                height={240}
                layout="vertical"
                showValues
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Countries (Today)</CardTitle></CardHeader>
          <CardContent>
            {countries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No country data yet</p>
            ) : (
              <ChartLeaderboard
                data={countries}
                nameKey="name"
                valueKey="count"
                valueLabel="views"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AudienceTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [eventsRes, postsRes] = await Promise.all([
        supabase.from("analytics_events").select("country, device, browser, os, post_id").eq("event_type", "page_view").limit(5000),
        supabase.from("posts").select("id, title, slug").eq("status", "published").limit(300),
      ])
      const events = eventsRes.data || []
      const deviceMap: Record<string, number> = {}
      const browserMap: Record<string, number> = {}
      const osMap: Record<string, number> = {}
      const countryMap: Record<string, number> = {}
      const postMap: Record<string, number> = {}
      events.forEach((e: any) => {
        if (e.device) deviceMap[e.device] = (deviceMap[e.device] || 0) + 1
        if (e.browser) browserMap[e.browser] = (browserMap[e.browser] || 0) + 1
        if (e.os) osMap[e.os] = (osMap[e.os] || 0) + 1
        if (e.country) countryMap[e.country] = (countryMap[e.country] || 0) + 1
        if (e.post_id) postMap[e.post_id] = (postMap[e.post_id] || 0) + 1
      })
      const toList = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
      const posts = new Map((postsRes.data || []).map((p: any) => [p.id, p]))
      setData({
        total: events.length,
        devices: toList(deviceMap),
        browsers: toList(browserMap),
        os: toList(osMap),
        countries: toList(countryMap).slice(0, 8),
        pages: toList(postMap).slice(0, 8).map(({ name, value }) => ({
          name,
          title: posts.get(name)?.title || "Unknown post",
          slug: posts.get(name)?.slug || "",
          value,
        })),
      })
    } catch (err) { console.error("Audience fetch error:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    const id = `analytics_audience_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(id)
    const refresh = () => { if (mounted) load() }
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, refresh)
    channel.subscribe()
    const poll = setInterval(refresh, 60000)
    window.addEventListener("focus", refresh)
    return () => {
      mounted = false
      clearInterval(poll)
      window.removeEventListener("focus", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading audience data...</div>
  if (!data) return <div className="h-64 flex items-center justify-center text-muted-foreground">No audience data yet. Data appears as visitors browse the site.</div>

  const pct = (v: number) => (data.total > 0 ? ((v / data.total) * 100).toFixed(1) : "0")

  const renderBreakdown = (items: { name: string; value: number }[], color: string) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        items.map((it) => (
          <div key={it.name} className="p-2.5 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{it.name}</span>
              <span className="text-xs text-muted-foreground">
                {it.value.toLocaleString()} · <span className="font-bold text-foreground">{pct(it.value)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct(it.value)}%`, backgroundColor: color }} />
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
          <CardContent>{renderBreakdown(data.devices, COLORS[0])}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Browsers</CardTitle></CardHeader>
          <CardContent>{renderBreakdown(data.browsers, COLORS[1])}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Operating Systems</CardTitle></CardHeader>
          <CardContent>{renderBreakdown(data.os, COLORS[2])}</CardContent>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Countries</CardTitle></CardHeader>
          <CardContent>{renderBreakdown(data.countries, COLORS[4])}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent>
            {data.pages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No page views recorded yet</p>
            ) : (
              <div className="space-y-2">
                {data.pages.map((p: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between text-sm gap-3">
                      <span className="font-medium truncate min-w-0" title={p.title}>{p.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {p.value.toLocaleString()} · <span className="font-bold text-foreground">{pct(p.value)}%</span>
                      </span>
                    </div>
                    {p.slug && <p className="text-[11px] text-muted-foreground truncate mt-0.5">/{p.slug}</p>}
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct(p.value)}%`, backgroundColor: COLORS[5] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Sample size: <strong>{data.total.toLocaleString()}</strong> tracked page views since device/browser/OS tracking started (2026-08-10).
        Percentages settle down as more visitors arrive.
      </p>
    </div>
  )
}

function TrafficSourcesTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data: events } = await supabase
        .from("analytics_events")
        .select("referrer")
        .eq("event_type", "page_view")
        .limit(3000)

      const refMap: Record<string, number> = {}
      ;(events || []).forEach((e: any) => {
        let ref = e.referrer || "Direct"
        if (!ref) ref = "Direct"
        try { ref = new URL(ref).hostname.replace("www.", "") } catch { ref = "Direct" }
        refMap[ref] = (refMap[ref] || 0) + 1
      })

      const sorted = Object.entries(refMap).sort((a, b) => b[1] - a[1])
      const total = sorted.reduce((s, [, v]) => s + v, 0) || 1

      const socialRefs = ["facebook", "twitter", "x.com", "linkedin", "reddit", "t.co", "instagram"]
      const social = sorted.filter(([k]) => socialRefs.some(s => k.includes(s)))

      setData({
        sources: sorted.slice(0, 8).map(([k, v]) => ({ source: k === "Direct" ? "Direct" : k, sessions: v, pct: Math.round((v / total) * 100) })),
        social: social.map(([k, v]) => ({ platform: k, sessions: v })),
      })
    } catch (err) { console.error("Traffic fetch error:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    const id = `analytics_traffic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(id)
    const refresh = () => { if (mounted) load() }
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, refresh)
    channel.subscribe()
    const poll = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => {
      mounted = false
      clearInterval(poll)
      window.removeEventListener("focus", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading traffic data...</div>
  if (!data || data.sources.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No traffic data yet. Data appears as visitors come from external sites.</div>

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
          <CardContent>
            <ChartPie data={data.sources} nameKey="source" valueKey="sessions" donut height={300} showLabel />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Source Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ChartBar
              data={data.sources}
              xKey="source"
              bars={[{ key: "sessions", color: COLORS[3], name: "Sessions" }]}
              height={280}
              layout="vertical"
              showValues
            />
          </CardContent>
        </Card>
      </div>
      {data.social.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Social Media Referrals</CardTitle></CardHeader>
          <CardContent>
            <ChartBar
              data={data.social}
              xKey="platform"
              bars={[{ key: "sessions", color: COLORS[4], name: "Sessions" }]}
              height={250}
              showValues
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SocialTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data: accounts } = await supabase.from("social_accounts").select("*")
      const { data: events } = await supabase
        .from("analytics_events")
        .select("referrer, created_at")
        .eq("event_type", "page_view")
        .limit(3000)

      const platformRefs = ["facebook", "twitter", "x.com", "linkedin", "t.co", "instagram", "reddit"]
      const socialEvents: Record<string, number> = {}
      ;(events || []).forEach((e: any) => {
        const ref = e.referrer || ""
        for (const p of platformRefs) {
          if (ref.includes(p)) {
            socialEvents[p] = (socialEvents[p] || 0) + 1
            break
          }
        }
      })

      const socialChart = Object.entries(socialEvents).map(([k, v]) => ({
        platform: k === "t.co" ? "X (t.co)" : k,
        referrals: v,
      }))

      setData({ accounts: accounts || [], socialChart })
    } catch (err) { console.error("Social fetch error:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    const id = `analytics_social_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(id)
    const refresh = () => { if (mounted) load() }
    channel.on("postgres_changes", { event: "*", schema: "public", table: "social_accounts" }, refresh)
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, refresh)
    channel.subscribe()
    const poll = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => {
      mounted = false
      clearInterval(poll)
      window.removeEventListener("focus", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading social data...</div>

  const displayAccounts = data?.accounts?.length > 0 ? data.accounts : [
    { platform: "X", follower_count: null },
    { platform: "Facebook", follower_count: null },
    { platform: "LinkedIn", follower_count: null },
    { platform: "Threads", follower_count: null },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayAccounts.slice(0, 4).map((p: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className="font-medium text-sm">{p.platform}</p>
              <p className="text-2xl font-bold mt-1">{p.follower_count?.toLocaleString() || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Followers</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {data?.socialChart?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Social Referral Traffic</CardTitle></CardHeader>
          <CardContent>
            <ChartBar
              data={data.socialChart}
              xKey="platform"
              bars={[{ key: "referrals", color: COLORS[6], name: "Referrals" }]}
              height={280}
              showValues
            />
          </CardContent>
        </Card>
      )}
      {(!data?.socialChart || data.socialChart.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-8">No social referral traffic yet. Connect your social accounts to start tracking.</p>
      )}
    </div>
  )
}

function NewsletterTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [subsRes, sendsRes, sendsCount, subGrowthRes] = await Promise.all([
        supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("newsletter_sends").select("subject, open_count, sent_at").order("sent_at", { ascending: false }).limit(5),
        supabase.from("newsletter_sends").select("*", { count: "exact", head: true }),
        supabase.from("subscribers").select("subscribed_at").eq("status", "active").gte("subscribed_at", since30d).limit(2000),
      ])

      const growthMap: Record<string, number> = {}
      const growthChart = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        return { date: key, subscribers: 0 }
      })
      const dayIndex: Record<string, number> = {}
      growthChart.forEach((g, i) => { dayIndex[g.date] = i })

      ;(subGrowthRes.data || []).forEach((s: any) => {
        const d = new Date(s.subscribed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        growthMap[d] = (growthMap[d] || 0) + 1
      })
      Object.entries(growthMap).forEach(([date, count]) => {
        if (dayIndex[date] !== undefined) growthChart[dayIndex[date]].subscribers = count
      })

      const sends = sendsRes.data || []
      setData({
        subscribers: subsRes.count || 0,
        campaigns: sends,
        campaignsSent: sendsCount.count || 0,
        growthDays: Object.keys(growthMap).length,
        totalOpens: sends.reduce((s: number, c: any) => s + (c.open_count || 0), 0),
        growthChart,
      })
    } catch (err) { console.error("Newsletter fetch error:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    const id = `analytics_newsletter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(id)
    const refresh = () => { if (mounted) load() }
    channel.on("postgres_changes", { event: "*", schema: "public", table: "subscribers" }, refresh)
    channel.on("postgres_changes", { event: "*", schema: "public", table: "newsletter_sends" }, refresh)
    channel.subscribe()
    const poll = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => {
      mounted = false
      clearInterval(poll)
      window.removeEventListener("focus", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading newsletter data...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{data?.subscribers?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Subscribers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{data?.campaignsSent || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Campaigns Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{data?.growthDays || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Days with Growth (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{data?.totalOpens?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Opens</p>
          </CardContent>
        </Card>
      </div>

      {data?.growthChart?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Subscriber Growth (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ChartArea
              data={data.growthChart}
              xKey="date"
              areas={[{ key: "subscribers", color: COLORS[0], name: "New Subscribers" }]}
              height={250}
            />
          </CardContent>
        </Card>
      )}

      {data?.campaigns?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Sends</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.campaigns.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.sent_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {c.open_count ? `${c.open_count} opens` : "No opens yet"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {(!data?.campaigns || data.campaigns.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-8">No newsletter sends yet. Publish a post with the newsletter option enabled to see data here.</p>
      )}
    </div>
  )
}

function RevenueTab() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ ad: 0, spend: 0, impressions: 0, clicks: 0, ctr: 0, pending: 0 })
  const [chart, setChart] = useState<{ date: string; revenue: number; impressions: number }[]>([])
  const [bySource, setBySource] = useState<{ source: string; revenue: number }[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const sinceDate = since.toISOString().slice(0, 10)

      const [adRes, spendRes, statsRes, pendRes, campRes] = await Promise.all([
        supabase.from("ad_revenue").select("revenue, date, source").gte("date", sinceDate).limit(2000),
        supabase.from("ad_campaigns").select("spend, currency").in("status", ["live", "paused", "completed"]).limit(2000),
        supabase.from("ad_campaign_daily_stats").select("impressions, clicks, stat_date").gte("stat_date", sinceDate).limit(20000),
        supabase.from("ad_campaigns").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }).limit(15),
      ])

      const dailyMap: Record<string, { revenue: number; impressions: number }> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dailyMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = { revenue: 0, impressions: 0 }
      }
      let totalAd = 0
      const sourceMap: Record<string, number> = {}
      ;(adRes.data || []).forEach((r: any) => {
        const key = new Date(`${r.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (dailyMap[key]) { dailyMap[key].revenue += Number(r.revenue) || 0; totalAd += Number(r.revenue) || 0 }
        const src = r.source || "other"
        sourceMap[src] = (sourceMap[src] || 0) + (Number(r.revenue) || 0)
      })
      let totalImpressions = 0
      let totalClicks = 0
      ;(statsRes.data || []).forEach((s: any) => {
        const key = new Date(`${s.stat_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (dailyMap[key]) { dailyMap[key].impressions += s.impressions || 0; dailyMap[key].revenue += (s.impressions || 0) * 0 }
        totalImpressions += s.impressions || 0
        totalClicks += s.clicks || 0
      })
      const totalSpend = (spendRes.data || []).reduce((s: number, c: any) => s + (Number(c.spend) || 0), 0)

      setChart(Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })))
      setBySource(Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).map(([source, revenue]) => ({ source, revenue })))
      setCampaigns(campRes.data || [])
      setTotals({
        ad: totalAd,
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        pending: pendRes.count || 0,
      })
    } catch (err) {
      console.error("Revenue fetch error:", err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true
    const id = `analytics_revenue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(id)
    const refresh = () => { if (mounted) load() }
    ;["ad_revenue", "ad_campaigns", "ad_campaign_daily_stats"].forEach(table => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh)
    })
    channel.subscribe()
    const poll = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => {
      mounted = false
      clearInterval(poll)
      window.removeEventListener("focus", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  const STATUS_COLORS: Record<string, string> = {
    draft: "#94A3B8", pending: "#F59E0B", approved: "#3B82F6", rejected: "#EF4444",
    live: "#22C55E", completed: "#64748B", paused: "#8B5CF6", cancelled: "#EF4444",
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Ad Revenue (30d)</p>
            <p className="text-2xl font-bold mt-1">${totals.ad.toFixed(2)}</p>
            <p className="text-xs mt-1 text-emerald-500">Live · ad_revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ReceiptText className="h-3 w-3" /> Campaign Spend (30d)</p>
            <p className="text-2xl font-bold mt-1">₦{totals.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-xs mt-1 text-muted-foreground">Live / paused / completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Impressions (30d)</p>
            <p className="text-2xl font-bold mt-1">{totals.impressions.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Delivered ad views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Clicks (30d)</p>
            <p className="text-2xl font-bold mt-1">{totals.clicks.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">From ad placements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> CTR</p>
            <p className="text-2xl font-bold mt-1">{totals.ctr.toFixed(2)}%</p>
            <p className="text-xs mt-1 text-muted-foreground">Clicks ÷ impressions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Pending Orders</p>
            <p className="text-2xl font-bold mt-1 text-amber-500">{totals.pending}</p>
            <p className="text-xs mt-1 text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Revenue &amp; Delivery (30 Days)
            <span className="text-[10px] font-normal bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> REALTIME
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis yAxisId="rev" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="imp" orientation="right" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12.5 }} />
              <Bar yAxisId="rev" dataKey="revenue" name="Ad Revenue ($)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Line yAxisId="imp" type="monotone" dataKey="impressions" name="Impressions" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Revenue by Source</CardTitle></CardHeader>
          <CardContent>
            {bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No ad revenue recorded yet</p>
            ) : (
              <div className="space-y-2">
                {bySource.map((s) => (
                  <div key={s.source} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                    <span className="font-medium capitalize">{s.source}</span>
                    <span className="font-bold">${s.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No campaign orders yet</p>
            ) : (
              campaigns.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.headline || "Untitled campaign"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.advertiser_email || "—"} · {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-bold">₦{Number(c.total_price || c.budget || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <Badge className="text-[10px]" style={{ background: STATUS_COLORS[c.status] || "#94A3B8", color: "#fff" }}>
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExportsTab() {
  const [generating, setGenerating] = useState<string | null>(null)
  const supabase = createClient()

  const downloadBlob = (content: string, type: string, name: string) => {
    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExport = async (name: string, type: string) => {
    setGenerating(name)
    try {
      if (type === "csv") {
        const { data: events } = await supabase
          .from("analytics_events")
          .select("page_url, post_id, referrer, country, device, browser, os, session_id, created_at")
          .eq("event_type", "page_view")
          .order("created_at", { ascending: false })
          .limit(5000)

        const headers = ["page_url", "post_id", "referrer", "country", "device", "browser", "os", "session_id", "created_at"]
        const csvRows = [headers.join(",")]
        ;(events || []).forEach((e: any) => {
          csvRows.push(headers.map(h => JSON.stringify(e[h] ?? "")).join(","))
        })
        downloadBlob(csvRows.join("\n"), "text/csv", `${name.toLowerCase().replace(/\s+/g, "_")}.csv`)
      } else if (type === "daily") {
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: events } = await supabase
          .from("analytics_events")
          .select("created_at, post_id")
          .eq("event_type", "page_view")
          .gte("created_at", since30d)
          .limit(20000)

        const rows: Record<string, { views: number; posts: number }> = {}
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          rows[d.toISOString().slice(0, 10)] = { views: 0, posts: 0 }
        }
        ;(events || []).forEach((e: any) => {
          const day = new Date(e.created_at).toISOString().slice(0, 10)
          if (rows[day]) { rows[day].views++; if (e.post_id) rows[day].posts++ }
        })
        const csv = ["date,all_pages,article_pages"].concat(
          Object.entries(rows).map(([date, v]) => `${date},${v.views},${v.posts}`)
        ).join("\n")
        downloadBlob(csv, "text/csv", `daily_views_30d.csv`)
      } else {
        const { data: events } = await supabase
          .from("analytics_events")
          .select("page_url, referrer, country, created_at")
          .eq("event_type", "page_view")
          .order("created_at", { ascending: false })
          .limit(5000)

        const rows = [
          ["Report", name],
          ["Generated", new Date().toISOString()],
          ["Total Events", String(events?.length || 0)],
          ["", ""],
          ["page_url", "referrer", "country", "created_at"],
          ...(events || []).map((e: any) => [e.page_url || "", e.referrer || "", e.country || "", e.created_at]),
        ]
        downloadBlob(rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv", `${name.toLowerCase().replace(/\s+/g, "_")}.csv`)
      }
    } catch (err) {
      console.error("Export failed:", err)
    }
    setGenerating(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Export Analytics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "Traffic Report", type: "txt" },
            { name: "Content Performance", type: "csv" },
            { name: "Daily Views (30d)", type: "daily" },
            { name: "SEO Overview", type: "txt" },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">{r.name}</span>
              <button
                onClick={() => handleExport(r.name, r.type)}
                disabled={generating === r.name}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Download className="h-3 w-3" />
                {generating === r.name ? "Generating..." : "Export"}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />
      case "realtime": return <RealTimeTab />
      case "audience": return <AudienceTab />
      case "traffic": return <TrafficSourcesTab />
      case "revenue": return <RevenueTab />
      case "social": return <SocialTab />
      case "newsletter": return <NewsletterTab />
      case "ai": return <AiInsights />
      case "exports": return <ExportsTab />
      default: return <OverviewTab />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Traffic, audience, revenue, and performance intelligence</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE · refreshes every 30s
        </span>
      </div>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          )
        })}
      </div>
      {renderTab()}
    </div>
  )
}

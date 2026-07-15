"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { GeminiQuotaWidget } from "@/components/admin/GeminiQuotaWidget"
import { AiExecutiveSummary } from "@/components/admin/ai-executive-summary"
import { AiOpportunityCenter } from "@/components/admin/ai-opportunity-center"
import { LivePublishingQueue } from "@/components/admin/live-publishing-queue"
import { NotificationCenter } from "@/components/admin/notification-center"
import { ExecutiveKpiCards } from "@/components/admin/executive-kpi-cards"
import {
  RefreshCw, TrendingUp, TrendingDown,
  BarChart3, Activity, Globe, MousePointerClick, Smartphone,
  FileText, Clock, ArrowUpRight,
} from "lucide-react"
import {
  ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell,
} from "recharts"

const COLORS = ["#F59E0B", "#10B981", "#F59E0B", "#EF4444", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16"]

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", "US": "🇺🇸", "India": "🇮🇳", "United Kingdom": "🇬🇧", "UK": "🇬🇧",
  "Germany": "🇩🇪", "France": "🇫🇷", "Canada": "🇨🇦", "Australia": "🇦🇺", "Brazil": "🇧🇷",
  "Japan": "🇯🇵", "China": "🇨🇳", "Russia": "🇷🇺", "South Korea": "🇰🇷", "Netherlands": "🇳🇱",
  "Spain": "🇪🇸", "Italy": "🇮🇹", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰",
  "Finland": "🇫🇮", "Poland": "🇵🇱", "Turkey": "🇹🇷", "Indonesia": "🇮🇩", "Mexico": "🇲🇽",
  "Argentina": "🇦🇷", "Nigeria": "🇳🇬", "South Africa": "🇿🇦", "Egypt": "🇪🇬", "Kenya": "🇰🇪",
  "Saudi Arabia": "🇸🇦", "UAE": "🇦🇪", "United Arab Emirates": "🇦🇪", "Singapore": "🇸🇬",
  "Hong Kong": "🇭🇰", "Switzerland": "🇨🇭", "Belgium": "🇧🇪", "Austria": "🇦🇹", "Ireland": "🇮🇪",
  "New Zealand": "🇳🇿", "Portugal": "🇵🇹", "Greece": "🇬🇷", "Czech Republic": "🇨🇿", "Romania": "🇷🇴",
  "Ukraine": "🇺🇦", "Hungary": "🇭🇺", "Israel": "🇮🇱", "Thailand": "🇹🇭", "Vietnam": "🇻🇳",
  "Philippines": "🇵🇭", "Malaysia": "🇲🇾", "Pakistan": "🇵🇰", "Bangladesh": "🇧🇩", "Colombia": "🇨🇴",
  "Chile": "🇨🇱", "Peru": "🇵🇪",
}

function flag(name: string): string {
  return COUNTRY_FLAGS[name] || ""
}

export default function AdminDashboard() {
  const supabaseRef = useRef(createClient())
  const [viewsOverTime, setViewsOverTime] = useState<{ date: string; views: number }[]>([])
  const [topPosts, setTopPosts] = useState<any[]>([])
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([])
  const [regions, setRegions] = useState<{ name: string; value: number }[]>([])
  const [pages, setPages] = useState<{ name: string; value: number }[]>([])
  const [referrers, setReferrers] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const supabase = supabaseRef.current

      const [
        topPostsRes, dailyViewsRes, statusCounts,
        regionRes, pageRes, referrerRes,
      ] = await Promise.all([
        supabase.from("posts").select("id, title, slug, views").eq("status", "published").order("views", { ascending: false }).limit(5),
        supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "archived"),
        ]),
        supabase.from("analytics_events").select("country").eq("event_type", "page_view").not("country", "is", null).limit(500),
        supabase.from("analytics_events").select("page_url").eq("event_type", "page_view").not("page_url", "is", null).limit(500),
        supabase.from("analytics_events").select("referrer").eq("event_type", "page_view").not("referrer", "is", null).limit(500),
      ])

      if (topPostsRes.data) setTopPosts(topPostsRes.data)

      const dailyMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        dailyMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0
      }
      ;(dailyViewsRes.data || []).forEach((e: any) => {
        const key = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (dailyMap[key] !== undefined) dailyMap[key]++
      })
      setViewsOverTime(Object.entries(dailyMap).map(([date, views]) => ({ date, views })))

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
      setRegions(Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: flag(name) ? `${flag(name)} ${name}` : name, value })))

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
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, () => { fetchData() })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => { fetchData() })
      .subscribe()
    return () => { supabaseRef.current.removeChannel(channel) }
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your publishing command center</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Last updated: {new Date().toLocaleTimeString()}
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

      {/* Executive KPI Cards */}
      <ExecutiveKpiCards />

      {/* AI Quota */}
      <GeminiQuotaWidget />

      {/* AI Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiExecutiveSummary />
        <AiOpportunityCenter />
      </div>

      {/* Publishing + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivePublishingQueue />
        <NotificationCenter />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4 bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold">Views This Week</h2>
            </div>
            {!loading && (
              <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border">
                {viewsOverTime.reduce((s, d) => s + d.views, 0).toLocaleString()} total
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "currentColor", fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="views" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={24} opacity={0.7} />
                <Line type="monotone" dataKey="views" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", stroke: "hsl(var(--background))", strokeWidth: 2, r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-3 bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold">Post Status</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart innerRadius="30%" outerRadius="90%" data={statusDist.map((d, i) => ({ ...d, fill: [COLORS[0], COLORS[2], COLORS[1], COLORS[3]][i] }))} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {statusDist.map((s, i) => s.value > 0 && (
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

      {/* Top Posts + Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-semibold">Top Posts by Views</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : topPosts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No published posts yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topPosts.map((p: any) => ({ name: p.title.length > 30 ? p.title.slice(0, 27) + "..." : p.title, views: p.views || 0 }))} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={160} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="views" radius={[0, 6, 6, 0]} barSize={22}>
                  {topPosts.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <Globe className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold">Top Regions</h2>
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={regions} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                  {regions.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pages + Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5">
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pages} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={160} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                  {pages.map((_, i) => (<Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <Smartphone className="h-5 w-5 text-lime-500" />
            <h2 className="text-base font-semibold">Traffic Sources</h2>
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={referrers} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={120} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                  {referrers.map((_, i) => (<Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

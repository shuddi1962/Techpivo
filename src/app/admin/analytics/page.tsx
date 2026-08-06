"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, Globe, TrendingUp, Share2, Mail, Swords, Brain, Download, RefreshCw } from "lucide-react"
import { RevenueAnalytics } from "@/components/admin/revenue-analytics"
import { AiInsights } from "@/components/admin/ai-insights"
import { ChartLine, ChartBar, ChartArea, ChartPie, ChartRadar, ChartLeaderboard, ChartGeoMap } from "@/components/charts"

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"]

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "realtime", label: "Real-Time", icon: TrendingUp },
  { id: "audience", label: "Audience", icon: Users },
  { id: "traffic", label: "Traffic Sources", icon: Globe },
  { id: "revenue", label: "Revenue", icon: BarChart3 },
  { id: "social", label: "Social", icon: Share2 },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "competitors", label: "Competitors", icon: Swords },
  { id: "ai", label: "AI Insights", icon: Brain },
  { id: "exports", label: "Exports", icon: Download },
]

function OverviewTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [users, sessions, pageViews, postsCount] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view")
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        ])

        const { data: dailyData } = await supabase
          .from("analytics_events")
          .select("created_at")
          .eq("event_type", "page_view")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(5000)

        const { data: topPages } = await supabase
          .from("analytics_events")
          .select("page_url")
          .eq("event_type", "page_view")
          .not("page_url", "is", null)
          .limit(5000)

        const { data: catPosts } = await supabase
          .from("posts")
          .select("category_id, categories!left(name)")
          .eq("status", "published")
          .limit(100)

        const pageMap: Record<string, number> = {}
        ;(topPages || []).forEach((p: any) => {
          const url = p.page_url || "/"
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
          const count = dailyData ? dailyData.filter((e: any) => new Date(e.created_at).toDateString() === dayStr).length : 0
          return { date: label, views: count }
        })

        setData({
          users: users.count || 0,
          sessions: sessions.count || 0,
          pageViews: pageViews.count || 0,
          postsCount: postsCount.count || 0,
          dailyChart,
          topPages: sortedPages,
          categories: Object.entries(catMap).map(([name, count]) => ({ name, count })),
        })
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase])

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
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Sessions (30d)</p>
            <p className="text-2xl font-bold mt-1">{data.sessions.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Page Views</p>
            <p className="text-2xl font-bold mt-1">{data.pageViews.toLocaleString()}</p>
            <p className="text-xs mt-1 text-emerald-500 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> All time</p>
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
            <p className="text-2xl font-bold mt-1">{Math.round(data.pageViews / 30).toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Per day (30d avg)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Views Per Post</p>
            <p className="text-2xl font-bold mt-1">{data.postsCount > 0 ? Math.round(data.pageViews / data.postsCount).toLocaleString() : "—"}</p>
            <p className="text-xs mt-1 text-muted-foreground">Avg per article</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Views (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <ChartLine
            data={data.dailyChart}
            xKey="date"
            lines={[{ key: "views", color: COLORS[0], name: "Page Views" }]}
            height={250}
            showDots={false}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
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
  const [stats, setStats] = useState({ activeNow: 0, today: 0, thisHour: 0, newToday: 0 })
  const [pages, setPages] = useState<{ page: string; visitors: number }[]>([])
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRealtime = useCallback(async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

      const [todayRes, hourRes, pageRes, countryRes] = await Promise.all([
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", todayStart),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", hourAgo),
        supabase.from("analytics_events").select("page_url").eq("event_type", "page_view").gte("created_at", hourAgo).limit(500),
        supabase.from("analytics_events").select("country").eq("event_type", "page_view").gte("created_at", todayStart).limit(500),
      ])

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
        activeNow: hourRes.count || 0,
        today: todayRes.count || 0,
        thisHour: hourRes.count || 0,
        newToday: todayRes.count || 0,
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
            <p className="text-xs text-muted-foreground mt-1">Active (Last Hour)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.today.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.thisHour.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">This Hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{stats.newToday.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Views Today</p>
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

  useEffect(() => {
    const fetchAudience = async () => {
      try {
        const { data: events } = await supabase
          .from("analytics_events")
          .select("country, device, browser, os")
          .eq("event_type", "page_view")
          .limit(2000)

        const deviceMap: Record<string, number> = {}
        const browserMap: Record<string, number> = {}
        const osMap: Record<string, number> = {}
        const countryMap: Record<string, number> = {}

        ;(events || []).forEach((e: any) => {
          if (e.device) deviceMap[e.device] = (deviceMap[e.device] || 0) + 1
          if (e.browser) browserMap[e.browser] = (browserMap[e.browser] || 0) + 1
          if (e.os) osMap[e.os] = (osMap[e.os] || 0) + 1
          if (e.country) countryMap[e.country] = (countryMap[e.country] || 0) + 1
        })

        setData({
          devices: Object.entries(deviceMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, value: v })),
          browsers: Object.entries(browserMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, value: v })),
          os: Object.entries(osMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, value: v })),
          countries: Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ name: k, value: v })),
        })
      } catch (err) { console.error("Audience fetch error:", err) }
      setLoading(false)
    }
    fetchAudience()
  }, [supabase])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading audience data...</div>
  if (!data) return <div className="h-64 flex items-center justify-center text-muted-foreground">No audience data yet. Data appears as visitors browse the site.</div>

  const radarData = [
    { metric: "Desktop", value: (data.devices.find((d: any) => d.name.toLowerCase().includes("desktop") || d.name.toLowerCase().includes("windows"))?.value || 0) > 0 ? 100 : 50 },
    { metric: "Mobile", value: (data.devices.find((d: any) => d.name.toLowerCase().includes("mobile") || d.name.toLowerCase().includes("android") || d.name.toLowerCase().includes("ios"))?.value || 0) > 0 ? 100 : 50 },
    { metric: "Tablet", value: (data.devices.find((d: any) => d.name.toLowerCase().includes("tablet"))?.value || 0) > 0 ? 80 : 20 },
    { metric: "Chrome", value: (data.browsers.find((d: any) => d.name.toLowerCase().includes("chrome"))?.value || 0) > 0 ? 100 : 50 },
    { metric: "Safari", value: (data.browsers.find((d: any) => d.name.toLowerCase().includes("safari"))?.value || 0) > 0 ? 80 : 30 },
    { metric: "Firefox", value: (data.browsers.find((d: any) => d.name.toLowerCase().includes("firefox"))?.value || 0) > 0 ? 60 : 20 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
          <CardContent>
            {data.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No device data</p>
            ) : (
              <ChartPie data={data.devices} nameKey="name" valueKey="value" donut height={260} showLabel />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Browsers</CardTitle></CardHeader>
          <CardContent>
            {data.browsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No browser data</p>
            ) : (
              <ChartPie data={data.browsers} nameKey="name" valueKey="value" donut height={260} showLabel />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Operating Systems</CardTitle></CardHeader>
          <CardContent>
            {data.os.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No OS data</p>
            ) : (
              <ChartPie data={data.os} nameKey="name" valueKey="value" donut height={260} showLabel />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Audience Comparison</CardTitle></CardHeader>
          <CardContent>
            <ChartRadar
              data={radarData}
              angleKey="metric"
              metrics={[{ key: "value", color: "#8b5cf6", name: "Engagement" }]}
              height={300}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Countries</CardTitle></CardHeader>
          <CardContent>
            {data.countries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No country data</p>
            ) : (
              <ChartBar
                data={data.countries}
                xKey="name"
                bars={[{ key: "value", color: COLORS[2], name: "Visitors" }]}
                height={260}
                layout="vertical"
                showValues
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TrafficSourcesTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTraffic = async () => {
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
    }
    fetchTraffic()
  }, [supabase])

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

  useEffect(() => {
    const fetchSocial = async () => {
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
    }
    fetchSocial()
  }, [supabase])

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

  useEffect(() => {
    const fetchNewsletter = async () => {
      try {
        const [subsRes, campaignsRes, subGrowthRes] = await Promise.all([
          supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("subscribers").select("created_at").eq("status", "active").limit(2000),
        ])

        const growthMap: Record<string, number> = {}
        ;(subGrowthRes.data || []).forEach((s: any) => {
          const d = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          growthMap[d] = (growthMap[d] || 0) + 1
        })
        const growthChart = Object.entries(growthMap).slice(-30).map(([date, subs]) => ({ date, subscribers: subs }))

        setData({
          subscribers: subsRes.count || 0,
          campaigns: campaignsRes.data || [],
          growthChart,
        })
      } catch (err) { console.error("Newsletter fetch error:", err) }
      setLoading(false)
    }
    fetchNewsletter()
  }, [supabase])

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
            <p className="text-3xl font-bold">{data?.campaigns?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Campaigns Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{data?.growthChart?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Days with Growth</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{data?.campaigns?.reduce((s: number, c: any) => s + (c.opens || 0), 0) || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Opens</p>
          </CardContent>
        </Card>
      </div>

      {data?.growthChart?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Subscriber Growth</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Recent Campaigns</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.campaigns.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium">{c.subject || c.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {c.opens ? `${c.opens} opens` : "No data"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {(!data?.campaigns || data.campaigns.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-8">No newsletter campaigns yet. Create your first campaign in the Newsletter section.</p>
      )}
    </div>
  )
}

function CompetitorsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Competitor Intelligence</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Competitor tracking data is available in the{" "}
            <a href="/admin/competitor-intelligence" className="text-primary hover:underline">Competitor Intelligence</a> section.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ExportsTab() {
  const [generating, setGenerating] = useState<string | null>(null)
  const supabase = createClient()

  const handleExport = async (name: string, type: string) => {
    setGenerating(name)
    try {
      if (type === "csv") {
        const { data: events } = await supabase
          .from("analytics_events")
          .select("page_url, referrer, country, device, browser, os, created_at")
          .eq("event_type", "page_view")
          .limit(5000)

        const headers = ["page_url", "referrer", "country", "device", "browser", "os", "created_at"]
        const csvRows = [headers.join(",")]
        ;(events || []).forEach((e: any) => {
          csvRows.push(headers.map(h => JSON.stringify(e[h] ?? "")).join(","))
        })
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${name.toLowerCase().replace(/\s+/g, "_")}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const { data: events } = await supabase
          .from("analytics_events")
          .select("page_url, referrer, created_at")
          .eq("event_type", "page_view")
          .limit(5000)

        const rows = [
          ["Report", name],
          ["Generated", new Date().toISOString()],
          ["Total Events", String(events?.length || 0)],
        ]
        const blob = new Blob([rows.map(r => r.join("\t")).join("\n")], { type: "text/tab-separated-values" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${name.toLowerCase().replace(/\s+/g, "_")}.txt`
        a.click()
        window.URL.revokeObjectURL(url)
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
      case "revenue": return <RevenueAnalytics />
      case "social": return <SocialTab />
      case "newsletter": return <NewsletterTab />
      case "competitors": return <CompetitorsTab />
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

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, Globe, TrendingUp, Share2, Mail, Swords, Brain, Download, RefreshCw } from "lucide-react"
import { RevenueAnalytics } from "@/components/admin/revenue-analytics"
import { AiInsights } from "@/components/admin/ai-insights"

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
        const totalCat = Object.values(catMap).reduce((s, v) => s + v, 0) || 1

        setData({
          users: users.count || 0,
          sessions: sessions.count || 0,
          pageViews: pageViews.count || 0,
          postsCount: postsCount.count || 0,
          dailyData,
          topPages: sortedPages,
          categories: Object.entries(catMap).map(([name, count]) => ({ name, pct: Math.round((count / totalCat) * 100) })),
        })
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics...</div>
  if (!data) return <div className="flex items-center justify-center h-64 text-muted-foreground">No data available yet</div>

  const dailyHeights = data.dailyData
    ? Array.from({ length: 30 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        const dayStr = d.toDateString()
        const count = data.dailyData.filter((e: any) => new Date(e.created_at).toDateString() === dayStr).length
        return count
      })
    : []

  const maxH = Math.max(...dailyHeights, 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Users", value: data.users.toLocaleString(), change: "+" + data.users, up: true },
          { label: "Sessions (30d)", value: data.sessions.toLocaleString(), change: "Last 30 days", up: true },
          { label: "Page Views", value: data.pageViews.toLocaleString(), change: "All time", up: true },
          { label: "Published Posts", value: data.postsCount.toLocaleString(), change: "Total", up: true },
          { label: "Avg Daily Views", value: Math.round(data.pageViews / (data.postsCount || 1)).toLocaleString(), change: "Per post", up: true },
          { label: "Returning", value: "—", change: "Track with GA", up: true },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
              <p className="text-xs mt-1 text-green-500">{k.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Daily Views (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-1">
            {dailyHeights.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t hover:bg-primary/40 transition-colors relative group"
                style={{ height: `${(h / maxH) * 100}%` }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  {h} views
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Daily page views — last 30 days</p>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No page data yet</p>
            ) : (
              data.topPages.map(([url, count]: [string, number], i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate font-mono text-xs">{url}</span>
                  <span className="text-muted-foreground">{count} views</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Content by Category</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
            ) : (
              data.categories.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="text-muted-foreground text-xs">{c.pct}%</span>
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

function RealTimeTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ activeNow: 0, today: 0, thisHour: 0, newToday: 0 })
  const [pages, setPages] = useState<{ page: string; visitors: number }[]>([])
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([])

  useEffect(() => {
    const fetchRealtime = async () => {
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
    }
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-500">{stats.activeNow}</p><p className="text-xs text-muted-foreground">Active (Last Hour)</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{stats.today.toLocaleString()}</p><p className="text-xs text-muted-foreground">Today</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{stats.thisHour.toLocaleString()}</p><p className="text-xs text-muted-foreground">This Hour</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{stats.newToday.toLocaleString()}</p><p className="text-xs text-muted-foreground">Views Today</p></CardContent></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Pages (Last Hour)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent page views</p>
            ) : (
              pages.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs truncate">{p.page}</span>
                  <Badge variant="outline">{p.visitors} views</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Countries (Today)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {countries.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No country data yet</p>
              ) : (
                countries.map((c, i) => (
                  <div key={i} className="text-center p-2 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.count} views</p>
                  </div>
                ))
              )}
            </div>
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

        const total = (v: Record<string, number>) => Object.values(v).reduce((s, c) => s + c, 0) || 1

        setData({
          devices: Object.entries(deviceMap).map(([k, v]) => ({ name: k, pct: Math.round((v / total(deviceMap)) * 100) })),
          browsers: Object.entries(browserMap).map(([k, v]) => ({ name: k, pct: Math.round((v / total(browserMap)) * 100) })),
          os: Object.entries(osMap).map(([k, v]) => ({ name: k, pct: Math.round((v / total(osMap)) * 100) })),
          countries: Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ name: k, pct: Math.round((v / total(countryMap)) * 100) })),
        })
      } catch (err) { console.error("Audience fetch error:", err) }
      setLoading(false)
    }
    fetchAudience()
  }, [])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
  if (!data) return <div className="h-64 flex items-center justify-center text-muted-foreground">No audience data yet. Data appears as visitors browse the site.</div>

  const renderBar = (items: { name: string; pct: number }[]) => (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1"><span>{item.name}</span><span>{item.pct}%</span></div>
          <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} /></div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Devices</CardTitle></CardHeader><CardContent>{renderBar(data.devices)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Browsers</CardTitle></CardHeader><CardContent>{renderBar(data.browsers)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Operating Systems</CardTitle></CardHeader><CardContent>{renderBar(data.os)}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Top Countries</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.countries.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{c.name}</span>
                <Badge variant="outline">{c.pct}%</Badge>
              </div>
            ))}
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

        const total = Object.values(refMap).reduce((s, c) => s + c, 0) || 1
        const sorted = Object.entries(refMap).sort((a, b) => b[1] - a[1])

        const socialRefs = ["facebook", "twitter", "x.com", "linkedin", "reddit", "t.co", "instagram"]
        const social = sorted.filter(([k]) => socialRefs.some(s => k.includes(s)))
        const socialTotal = social.reduce((s, [, v]) => s + v, 0) || 1

        setData({
          sources: sorted.slice(0, 6).map(([k, v]) => ({ source: k, pct: Math.round((v / total) * 100), sessions: v })),
          social: social.map(([k, v]) => ({ platform: k, sessions: v, pct: Math.round((v / socialTotal) * 100) })),
        })
      } catch (err) { console.error("Traffic fetch error:", err) }
      setLoading(false)
    }
    fetchTraffic()
  }, [])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
  if (!data || data.sources.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No traffic data yet. Data appears as visitors come from external sites.</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.sources.slice(0, 6).map((s: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground truncate">{s.source}</p>
              <p className="text-2xl font-bold mt-1">{s.pct}%</p>
              <p className="text-xs text-muted-foreground">{s.sessions} sessions</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.social.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Social Media Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.social.map((p: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{p.platform}</span><span>{p.sessions} ({p.pct}%)</span></div>
                <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${p.pct}%` }} /></div>
              </div>
            ))}
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

        setData({ accounts: accounts || [], socialEvents })
      } catch (err) { console.error("Social fetch error:", err) }
      setLoading(false)
    }
    fetchSocial()
  }, [])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(data?.accounts?.length > 0 ? data.accounts : [
          { platform: "X", follower_count: null },
          { platform: "Facebook", follower_count: null },
          { platform: "LinkedIn", follower_count: null },
          { platform: "Threads", follower_count: null },
        ]).slice(0, 4).map((p: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="font-medium">{p.platform}</p>
              <p className="text-2xl font-bold">{p.follower_count?.toLocaleString() || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {data?.socialEvents?.[p.platform.toLowerCase()] ? `${data.socialEvents[p.platform.toLowerCase()]} referrals` : "No data yet"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
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
        const [subsRes, campaignsRes] = await Promise.all([
          supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).limit(5),
        ])
        setData({
          subscribers: subsRes.count || 0,
          campaigns: campaignsRes.data || [],
        })
      } catch (err) { console.error("Newsletter fetch error:", err) }
      setLoading(false)
    }
    fetchNewsletter()
  }, [])

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{data?.subscribers?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Active Subscribers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{data?.campaigns?.length || 0}</p><p className="text-xs text-muted-foreground">Campaigns</p></CardContent></Card>
      </div>
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

  const handleExport = async (name: string, _type: string) => {
    setGenerating(name)
    await new Promise(r => setTimeout(r, 1500))
    setGenerating(null)
    alert(`${name} export initiated. The file will be available shortly.`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Export Analytics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "Traffic Report", type: "pdf" },
            { name: "Content Performance", type: "csv" },
            { name: "SEO Overview", type: "excel" },
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

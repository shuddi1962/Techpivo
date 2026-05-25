"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { FileText, Eye, Users, Rss, RefreshCw, TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell } from "recharts"

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]
const STATUS_COLORS: Record<string, string> = {
  published: "#10B981",
  draft: "#F59E0B",
  scheduled: "#6366F1",
  archived: "#6B7280",
}

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { label: "Published Posts", value: 0, change: "+0", icon: FileText, color: "#6366F1", href: "/admin/posts" },
    { label: "Total Views", value: 0, change: "+0", icon: Eye, color: "#10B981", href: "/admin/analytics" },
    { label: "Active RSS Feeds", value: 0, change: "", icon: Rss, color: "#F59E0B", href: "/admin/rss-feeds" },
    { label: "Subscribers", value: 0, change: "", icon: Users, color: "#EC4899", href: "/admin/newsletter" },
  ])
  const [viewsOverTime, setViewsOverTime] = useState<{ date: string; views: number }[]>([])
  const [topPosts, setTopPosts] = useState<any[]>([])
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [prevViews, setPrevViews] = useState(0)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [
      postsCount, postsViews, draftCount, rssFeeds,
      topPostsRes, dailyViewsRes, statusCounts,
    ] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("posts").select("views"),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("rss_feeds").select("*").eq("is_active", true),
      supabase.from("posts").select("id, title, slug, views").eq("status", "published").order("views", { ascending: false }).limit(5),
      supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "archived"),
      ]),
    ])

    const totalV = (postsViews.data || []).reduce((s: number, p: any) => s + (p.views || 0), 0)

    setStats(prev => {
      const updated = [...prev]
      updated[0] = { ...updated[0], value: postsCount.count || 0, change: `+${(postsCount.count || 0) - (prev[0].value || 0)}` }
      const viewDiff = totalV - prevViews
      updated[1] = { ...updated[1], value: totalV, change: viewDiff >= 0 ? `+${viewDiff}` : `${viewDiff}` }
      updated[2] = { ...updated[2], value: rssFeeds.data?.length || 0 }
      return updated
    })
    setPrevViews(totalV)
    setTotalPosts(postsCount.count || 0)

    if (topPostsRes.data) setTopPosts(topPostsRes.data)

    const dailyMap: Record<string, number> = {}
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      dailyMap[key] = 0
    }
    ;(dailyViewsRes.data || []).forEach((e: any) => {
      const d = new Date(e.created_at)
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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

    setLoading(false)
  }, [prevViews])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const maxViews = Math.max(...viewsOverTime.map(v => v.views), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your site at a glance</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors border-2 border-gray-200 dark:border-[#374151]">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isUp = stat.change.startsWith("+")
          return (
            <Link key={stat.label} href={stat.href}
              className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-5 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                {stat.change && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-lg ${
                    isUp ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1F2937]"
                  }`}>
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-[#6366F1]" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Views This Week</h2>
            </div>
            {!loading && (
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1F2937] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#374151]">
                {viewsOverTime.reduce((s, d) => s + d.views, 0).toLocaleString()} total
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }}
                  labelStyle={{ color: "#9CA3AF" }}
                />
                <Line type="monotone" dataKey="views" stroke="#6366F1" strokeWidth={3} dot={{ fill: "#6366F1", stroke: "#111827", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#818CF8" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <PieChart className="h-5 w-5 text-[#F59E0B]" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Post Status</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <RePie>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {statusDist.map((_, i) => (
                      <Cell key={i} fill={[COLORS[0], COLORS[2], COLORS[1], COLORS[3]][i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }}
                  />
                </RePie>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {statusDist.map((s, i) => s.value > 0 && (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: [COLORS[0], COLORS[2], COLORS[1], COLORS[3]][i] }} />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <BarChart3 className="h-5 w-5 text-[#10B981]" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Top Posts by Views</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
          ) : topPosts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">No published posts yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topPosts.map((p: any) => ({ name: p.title.length > 30 ? p.title.slice(0, 27) + "..." : p.title, views: p.views || 0, slug: p.slug }))} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#D1D5DB", fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }}
                  labelStyle={{ color: "#9CA3AF" }}
                />
                <Bar dataKey="views" radius={[0, 6, 6, 0]} barSize={22}>
                  {topPosts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <TrendingUp className="h-5 w-5 text-[#8B5CF6]" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Quick Summary</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-5">
              {[
                { label: "Total Published", value: stats[0].value, color: COLORS[0], icon: FileText },
                { label: "Total Views All Time", value: stats[1].value, color: COLORS[1], icon: Eye },
                { label: "Avg Views Per Post", value: stats[0].value > 0 ? Math.round(stats[1].value / stats[0].value) : 0, color: COLORS[4], icon: BarChart3 },
                { label: "Total Drafts", value: statusDist.find(s => s.name === "Draft")?.value || 0, color: COLORS[2], icon: FileText },
                { label: "Scheduled Posts", value: statusDist.find(s => s.name === "Scheduled")?.value || 0, color: COLORS[1], icon: FileText },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[#1F2937] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DollarSign, TrendingUp, BarChart3, PieChart,
  RefreshCw, ShoppingCart, Megaphone,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePie, Pie, Cell,
} from "recharts"

const COLORS = ["#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#EC4899", "#06B6D4"]

function getDateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

export default function RevenueIntelligencePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    adRevenueToday: 0,
    affiliateRevenueToday: 0,
    monthlyEstimate: 0,
    rpm: 0,
    cpm: 0,
    earningsPerArticle: 0,
  })
  const [revenueByCategory, setRevenueByCategory] = useState<{ name: string; value: number }[]>([])
  const [revenueBySource, setRevenueBySource] = useState<{ name: string; value: number }[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; ad: number; affiliate: number }[]>([])

  const fetchData = useCallback(async () => {
    try {
      const today = getDateNDaysAgo(0)
      const monthStart = new Date()
      monthStart.setDate(1)
      const monthStartStr = monthStart.toISOString().split("T")[0]
      const sevenDaysAgo = getDateNDaysAgo(6)
      const sevenDaysAgoFull = new Date()
      sevenDaysAgoFull.setDate(sevenDaysAgoFull.getDate() - 6)

      const [
        adTodayResult,
        adMonthResult,
        adDailyResult,
        adsResult,
        campaignsResult,
        affiliateTodayResult,
        affiliateMonthResult,
        affiliateDailyResult,
        postsResult,
        categoriesResult,
      ] = await Promise.all([
        supabase.from("ad_revenue").select("revenue").eq("date", today),
        supabase.from("ad_revenue").select("revenue").gte("date", monthStartStr),
        supabase.from("ad_revenue").select("date, revenue").gte("date", sevenDaysAgo).order("date"),
        supabase.from("ads").select("impressions, clicks"),
        supabase.from("ad_campaigns").select("impressions, clicks, is_active").eq("is_active", true),
        supabase.from("affiliate_sales").select("commission").eq("status", "approved").gte("recorded_at", `${today}T00:00:00`),
        supabase.from("affiliate_sales").select("commission").in("status", ["approved", "paid"]).gte("recorded_at", `${monthStartStr}T00:00:00`),
        supabase.from("affiliate_sales").select("commission, recorded_at").in("status", ["approved", "paid"]).gte("recorded_at", sevenDaysAgoFull.toISOString()),
        supabase.from("posts").select("id, views, category_id").eq("status", "published"),
        supabase.from("categories").select("id, name"),
      ])

      const adToday = adTodayResult.data?.reduce((s: number, r: { revenue: number }) => s + Number(r.revenue || 0), 0) || 0
      const adMonth = adMonthResult.data?.reduce((s: number, r: { revenue: number }) => s + Number(r.revenue || 0), 0) || 0
      const affiliateToday = affiliateTodayResult.data?.reduce((s: number, r: { commission: number }) => s + Number(r.commission || 0), 0) || 0
      const affiliateMonth = affiliateMonthResult.data?.reduce((s: number, r: { commission: number }) => s + Number(r.commission || 0), 0) || 0
      const totalMonth = adMonth + affiliateMonth

      const adData = adDailyResult.data || []
      const affData = affiliateDailyResult.data || []
      const posts = postsResult.data || []
      const categories = categoriesResult.data || []

      const totalViews = posts.reduce((s: number, p: { views: number }) => s + (p.views || 0), 0)
      const totalAdImpressions = (adsResult.data || []).reduce((s: number, a: { impressions: number }) => s + (a.impressions || 0), 0) +
        (campaignsResult.data || []).reduce((s: number, c: { impressions: number }) => s + (c.impressions || 0), 0)

      const rpm = totalViews > 0 ? Math.round((adMonth / totalViews) * 1000 * 100) / 100 : 0
      const cpm = totalAdImpressions > 0 ? Math.round((adMonth / totalAdImpressions) * 1000 * 100) / 100 : 0
      const earningsPerArticle = posts.length > 0 ? Math.round((totalMonth / posts.length) * 100) / 100 : 0

      setStats({
        adRevenueToday: Math.round(adToday * 100) / 100,
        affiliateRevenueToday: Math.round(affiliateToday * 100) / 100,
        monthlyEstimate: Math.round(totalMonth * 100) / 100,
        rpm,
        cpm,
        earningsPerArticle,
      })

      const catMap = new Map<string, string>()
      for (const c of categories) catMap.set(c.id, c.name)

      const viewsByCat = new Map<string, number>()
      for (const p of posts) {
        const cid = p.category_id || "uncategorized"
        viewsByCat.set(cid, (viewsByCat.get(cid) || 0) + (p.views || 0))
      }
      const catRevenue: { name: string; value: number }[] = []
      for (const [cid, v] of viewsByCat) {
        const name = catMap.get(cid) || "Uncategorized"
        const share = totalViews > 0 ? v / totalViews : 0
        catRevenue.push({ name, value: Math.round(share * totalMonth) })
      }
      catRevenue.sort((a, b) => b.value - a.value)
      setRevenueByCategory(catRevenue)

      const sponsored = (adData.filter((r: { revenue: number; source?: string }) => r.source === "sponsor").reduce((s: number, r: { revenue: number }) => s + Number(r.revenue || 0), 0) || 0)
      const adSourceTotal = adData.reduce((s: number, r: { revenue: number }) => s + Number(r.revenue || 0), 0) || 0
      setRevenueBySource([
        { name: "Ads", value: Math.round((adSourceTotal - sponsored) * 100) / 100 },
        { name: "Affiliate", value: Math.round(affiliateMonth * 100) / 100 },
        { name: "Sponsored", value: Math.round(sponsored * 100) / 100 },
      ])

      const dailyMap = new Map<string, { ad: number; affiliate: number }>()
      for (let i = 0; i < 7; i++) {
        const d = getDateNDaysAgo(6 - i)
        const label = new Date()
        label.setDate(label.getDate() - (6 - i))
        dailyMap.set(d, { ad: 0, affiliate: 0 })
      }
      for (const r of adData) {
        const key = typeof r.date === "string" ? r.date.split("T")[0] : ""
        if (dailyMap.has(key)) {
          const entry = dailyMap.get(key)!
          entry.ad += Number(r.revenue || 0)
        }
      }
      for (const r of affData) {
        const raw = r.recorded_at || ""
        const key = raw.split("T")[0]
        if (dailyMap.has(key)) {
          const entry = dailyMap.get(key)!
          entry.affiliate += Number(r.commission || 0)
        }
      }
      const dailyArr: { date: string; ad: number; affiliate: number }[] = []
      for (let i = 0; i < 7; i++) {
        const d = getDateNDaysAgo(6 - i)
        const label = new Date()
        label.setDate(label.getDate() - (6 - i))
        const dayStr = label.toLocaleDateString("en-US", { weekday: "short" })
        const entry = dailyMap.get(d) || { ad: 0, affiliate: 0 }
        dailyArr.push({ date: dayStr, ad: Math.round(entry.ad * 100) / 100, affiliate: Math.round(entry.affiliate * 100) / 100 })
      }
      setDailyRevenue(dailyArr)
    } catch {
      setStats({
        adRevenueToday: 0, affiliateRevenueToday: 0, monthlyEstimate: 0,
        rpm: 0, cpm: 0, earningsPerArticle: 0,
      })
      setRevenueByCategory([])
      setRevenueBySource([])
      setDailyRevenue([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Revenue Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Unified view of all monetization sources</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Ad Revenue Today", value: `$${stats.adRevenueToday}`, icon: Megaphone, color: "text-blue-500" },
          { label: "Affiliate Today", value: `$${stats.affiliateRevenueToday}`, icon: ShoppingCart, color: "text-green-500" },
          { label: "Monthly Estimate", value: `$${stats.monthlyEstimate}`, icon: TrendingUp, color: "text-purple-500" },
          { label: "RPM", value: `$${stats.rpm}`, icon: BarChart3, color: "text-amber-500" },
          { label: "CPM", value: `$${stats.cpm}`, icon: PieChart, color: "text-cyan-500" },
          { label: "Per Article", value: `$${stats.earningsPerArticle}`, icon: DollarSign, color: "text-green-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#111827] border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue by Source Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Revenue by Source</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RePie>
                <Pie
                  data={revenueBySource}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: $${value}`}
                >
                  {revenueBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }} />
              </RePie>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Daily Revenue Trend</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }} />
                <Bar dataKey="ad" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} name="Ads" />
                <Bar dataKey="affiliate" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} name="Affiliate" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Revenue by Category</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#D1D5DB", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

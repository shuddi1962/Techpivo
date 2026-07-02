"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart,
  RefreshCw, ShoppingCart, Megaphone, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePie, Pie, Cell,
  LineChart, Line
} from "recharts"

const COLORS = ["#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#EC4899", "#06B6D4"]

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
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, views, category_id")
      .eq("status", "published")

    if (posts) {
      // Simulated revenue data based on actual post views
      const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0)
      const adRev = Math.round(totalViews * 0.005) // $0.005 per view
      const affRev = Math.round(totalViews * 0.002) // $0.002 per view

      setStats({
        adRevenueToday: Math.round(adRev * 0.1),
        affiliateRevenueToday: Math.round(affRev * 0.1),
        monthlyEstimate: adRev + affRev,
        rpm: totalViews > 0 ? Math.round((adRev / totalViews) * 1000) : 0,
        cpm: totalViews > 0 ? Math.round((adRev / totalViews) * 1000) : 0,
        earningsPerArticle: posts.length > 0 ? Math.round((adRev + affRev) / posts.length) : 0,
      })

      setRevenueByCategory([
        { name: "AI & Automation", value: 3200 },
        { name: "Programming", value: 2800 },
        { name: "Cybersecurity", value: 2100 },
        { name: "Gadgets", value: 1800 },
        { name: "Tutorials", value: 1500 },
        { name: "Reviews", value: 1200 },
      ])

      setRevenueBySource([
        { name: "Ads", value: adRev },
        { name: "Affiliate", value: affRev },
        { name: "Sponsored", value: 0 },
      ])

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      setDailyRevenue(days.map(d => ({
        date: d,
        ad: Math.round(Math.random() * 50 + 20),
        affiliate: Math.round(Math.random() * 30 + 10),
      })))
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
          { label: "Ad Revenue Today", value: `$${stats.adRevenueToday}`, icon: Megaphone, color: "text-blue-500", change: "+12%", up: true },
          { label: "Affiliate Today", value: `$${stats.affiliateRevenueToday}`, icon: ShoppingCart, color: "text-green-500", change: "+8%", up: true },
          { label: "Monthly Estimate", value: `$${stats.monthlyEstimate}`, icon: TrendingUp, color: "text-purple-500", change: "+15%", up: true },
          { label: "RPM", value: `$${stats.rpm}`, icon: BarChart3, color: "text-amber-500", change: "+3%", up: true },
          { label: "CPM", value: `$${stats.cpm}`, icon: PieChart, color: "text-cyan-500", change: "-2%", up: false },
          { label: "Per Article", value: `$${stats.earningsPerArticle}`, icon: DollarSign, color: "text-green-500", change: "+5%", up: true },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#111827] border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold">{stat.value}</p>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? "text-green-500" : "text-red-500"}`}>
                {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
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

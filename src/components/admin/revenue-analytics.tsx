"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart,
  RefreshCw, BarChart3,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts"

interface RevenueData {
  date: string
  ad_revenue: number
  affiliate_revenue: number
  total: number
}

export function RevenueAnalytics() {
  const supabase = createClient()
  const [data, setData] = useState<RevenueData[]>([])
  const [totals, setTotals] = useState({ ad: 0, affiliate: 0, total: 0, rpm: 0 })
  const [loading, setLoading] = useState(true)

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const days30Ago = new Date(now)
    days30Ago.setDate(days30Ago.getDate() - 30)

    const [adsRes, affiliateRes, postsRes] = await Promise.all([
      supabase.from("ad_revenue").select("amount, created_at").gte("created_at", days30Ago.toISOString()),
      supabase.from("affiliate_sales").select("commission, created_at").gte("created_at", days30Ago.toISOString()),
      supabase.from("posts").select("views").eq("status", "published"),
    ])

    const dailyMap: Record<string, RevenueData> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      dailyMap[key] = { date: key, ad_revenue: 0, affiliate_revenue: 0, total: 0 }
    }

    let totalAd = 0
    ;(adsRes.data || []).forEach((r: any) => {
      const key = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (dailyMap[key]) { dailyMap[key].ad_revenue += r.amount || 0; totalAd += r.amount || 0 }
    })

    let totalAff = 0
    ;(affiliateRes.data || []).forEach((r: any) => {
      const key = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (dailyMap[key]) { dailyMap[key].affiliate_revenue += r.commission || 0; totalAff += r.commission || 0 }
    })

    const chartData = Object.values(dailyMap).map(d => ({ ...d, total: d.ad_revenue + d.affiliate_revenue }))
    setData(chartData)

    const totalViews = (postsRes.data || []).reduce((s: number, p: any) => s + (p.views || 0), 0)
    const totalRev = totalAd + totalAff
    setTotals({
      ad: totalAd,
      affiliate: totalAff,
      total: totalRev,
      rpm: totalViews > 0 ? (totalRev / totalViews) * 1000 : 0,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-[#10B981]" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ad Revenue (30d)</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">${totals.ad.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Affiliate Revenue (30d)</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">${totals.affiliate.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">${totals.total.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">RPM</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">${totals.rpm.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Revenue Trend (30 Days)</h3>
          <button onClick={fetchRevenue} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
            <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }} />
              <Bar dataKey="ad_revenue" fill="#F59E0B" stackId="a" radius={[0, 0, 0, 0]} name="Ads" />
              <Bar dataKey="affiliate_revenue" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} name="Affiliate" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

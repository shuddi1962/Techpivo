"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Cpu, DollarSign, Activity, CheckCircle, Clock,
  RefreshCw, BarChart3, Zap, TrendingUp
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts"

const GEMINI_COST_PER_REQ = 0.025
const FEATURE_COST_PER_REQ = 0.005
const GEMINI_DAILY_CAP = 100

const FEATURE_LABELS: Record<string, string> = {
  manual: "Manual Write",
  rewrite: "Article Rewrite",
  "write-keyword-article": "Keyword Article",
  "breaking-news": "Breaking News",
  web: "Web Fetch",
  search: "Web Search",
  youtube: "YouTube",
  github: "GitHub",
  rss: "RSS",
  linkedin: "LinkedIn",
  suggest: "Suggestions",
  trending: "Trending",
}

const featureLabel = (key: string) =>
  FEATURE_LABELS[key] ||
  key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

export default function AIUsageCenterPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    todayRequests: 0,
    monthlyCost: 0,
    avgResponseTime: 0,
    successRate: 0,
    quotaUsed: 0,
    quotaCap: GEMINI_DAILY_CAP,
  })
  const [usageByFeature, setUsageByFeature] = useState<{ name: string; requests: number; cost: number }[]>([])
  const [dailyUsage, setDailyUsage] = useState<{ date: string; requests: number; cost: number }[]>([])

  const fetchData = useCallback(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const [geminiRes, featureRes] = await Promise.all([
      supabase.from("gemini_usage_log").select("*").gte("created_at", thirtyDaysAgo),
      supabase.from("ai_feature_usage").select("*").gte("created_at", thirtyDaysAgo),
    ])

    const geminiLogs = (geminiRes.data || []) as any[]
    const featureLogs = (featureRes.data || []) as any[]
    const allLogs = [...geminiLogs, ...featureLogs]

    const geminiToday = geminiLogs.filter((l) => new Date(l.created_at) >= todayStart).length
    const featureToday = featureLogs.filter((l) => new Date(l.created_at) >= todayStart).length
    const todayCount = geminiToday + featureToday

    const monthlyCost =
      geminiLogs.length * GEMINI_COST_PER_REQ + featureLogs.length * FEATURE_COST_PER_REQ

    const durations = featureLogs
      .filter((l) => typeof l.duration_ms === "number" && l.duration_ms > 0)
      .map((l) => l.duration_ms as number)
    const avgResponseTime = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

    const featureSuccess = featureLogs.filter((l) => l.status !== "error").length
    const successRate = allLogs.length
      ? Math.round(((featureSuccess + geminiLogs.length) / allLogs.length) * 100)
      : 0

    setStats({
      totalRequests: allLogs.length,
      todayRequests: todayCount,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      avgResponseTime,
      successRate,
      quotaUsed: geminiToday,
      quotaCap: GEMINI_DAILY_CAP,
    })

    // Group by feature (both sources merged)
    const featureMap: Record<string, { requests: number; cost: number }> = {}
    geminiLogs.forEach((log) => {
      const feature = featureLabel(log.used_for || "unknown")
      featureMap[feature] = featureMap[feature] || { requests: 0, cost: 0 }
      featureMap[feature].requests++
      featureMap[feature].cost += GEMINI_COST_PER_REQ
    })
    featureLogs.forEach((log) => {
      const feature = featureLabel(log.feature || "unknown")
      featureMap[feature] = featureMap[feature] || { requests: 0, cost: 0 }
      featureMap[feature].requests++
      featureMap[feature].cost += FEATURE_COST_PER_REQ
    })
    setUsageByFeature(
      Object.entries(featureMap)
        .map(([name, data]) => ({
          name,
          requests: data.requests,
          cost: Math.round(data.cost * 100) / 100,
        }))
        .sort((a, b) => b.requests - a.requests)
    )

    // Daily usage (merged)
    const dailyMap: Record<string, { requests: number; cost: number }> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      dailyMap[key] = { requests: 0, cost: 0 }
    }
    allLogs.forEach((log) => {
      const key = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (dailyMap[key]) {
        dailyMap[key].requests++
        dailyMap[key].cost = Math.round(dailyMap[key].requests * (log.status ? FEATURE_COST_PER_REQ : GEMINI_COST_PER_REQ) * 100) / 100
      }
    })
    setDailyUsage(Object.entries(dailyMap).map(([date, data]) => ({ date, ...data })))

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const quotaPercentage = Math.round((stats.quotaUsed / stats.quotaCap) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-6 w-6 text-purple-500" />
            AI Usage Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track AI usage, costs, and performance across Gemini, Breaking News, Agent Reach &amp; more
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Quota Bar */}
      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Gemini Daily Quota</h3>
          <span className="text-sm text-muted-foreground">{stats.quotaUsed} / {stats.quotaCap} requests today</span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              quotaPercentage >= 90 ? "bg-red-500" : quotaPercentage >= 70 ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{ width: `${quotaPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Resets at midnight UTC</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Requests (30d)", value: stats.totalRequests, icon: Activity, color: "text-blue-500" },
          { label: "Today's Requests", value: stats.todayRequests, icon: Zap, color: "text-purple-500" },
          { label: "Monthly Cost", value: `$${stats.monthlyCost.toFixed(2)}`, icon: DollarSign, color: "text-green-500" },
          { label: "Avg Response Time", value: stats.avgResponseTime > 0 ? `${stats.avgResponseTime}ms` : "—", icon: Clock, color: "text-amber-500" },
          { label: "Success Rate", value: stats.successRate > 0 ? `${stats.successRate}%` : "—", icon: CheckCircle, color: "text-green-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#111827] border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Daily Request Volume</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "2px solid #374151", borderRadius: "12px", color: "#F9FAFB" }} />
                <Bar dataKey="requests" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Usage by Feature</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : usageByFeature.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <Cpu className="h-10 w-10 mb-3 opacity-30" />
              <p>No usage data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usageByFeature.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.requests} requests</p>
                  </div>
                  <p className="text-sm font-bold">${feature.cost.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

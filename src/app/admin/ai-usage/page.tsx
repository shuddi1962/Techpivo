"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Cpu, DollarSign, Activity, CheckCircle, Clock,
  RefreshCw, Zap, TrendingUp, Radio
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts"

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
  "ai-answer": "AI Answer",
  improve: "Improve",
}

const featureLabel = (key: string) =>
  FEATURE_LABELS[key] ||
  key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

const MODEL_LABELS: Record<string, string> = {
  "openrouter/google/gemini-2.5-flash": "Gemini 2.5 Flash (Free)",
  "openrouter/google/gemini-2.5-flash-preview": "Gemini 2.5 Flash Preview",
  "openrouter/google/gemini-2.5-pro": "Gemini 2.5 Pro (Paid)",
  "openrouter/openai/gpt-4o": "GPT-4o (Paid)",
  "openrouter/openai/gpt-4o-mini": "GPT-4o Mini (Free)",
  "openrouter/anthropic/claude-sonnet-4": "Claude Sonnet 4 (Paid)",
  "openrouter/deepseek/deepseek-chat": "DeepSeek Chat (Free)",
  "openrouter/meta-llama/llama-4-maverick": "Llama 4 Maverick (Free)",
  "openrouter/qwen/qwen3-235b-a22b": "Qwen 3 235B (Free)",
  "openrouter/moonshotai/kimi-k2": "Kimi K2 (Free)",
  "openrouter/nvidia/llama-3.1-nemotron-ultra-253b-v1": "Nemotron Ultra (Free)",
}

const modelLabel = (slug: string) =>
  MODEL_LABELS[slug] || slug.split("/").pop()?.replace(/-/g, " ") || slug

export default function AIUsageCenterPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    todayRequests: 0,
    avgResponseTime: 0,
    successRate: 0,
    uniqueModels: 0,
  })
  const [usageByFeature, setUsageByFeature] = useState<{ name: string; requests: number }[]>([])
  const [dailyUsage, setDailyUsage] = useState<{ date: string; requests: number }[]>([])
  const [modelUsage, setModelUsage] = useState<{ name: string; requests: number }[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchData = useCallback(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const [usageRes] = await Promise.all([
      supabase.from("ai_usage_log").select("*").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }).limit(1000),
    ])

    const logs = (usageRes.data || []) as any[]

    const todayLogs = logs.filter((l) => new Date(l.created_at) >= todayStart)
    const successLogs = logs.filter((l) => l.status !== "error")

    const durations = logs
      .filter((l) => typeof l.duration_ms === "number" && l.duration_ms > 0)
      .map((l) => l.duration_ms as number)
    const avgResponseTime = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

    const successRate = logs.length
      ? Math.round((successLogs.length / logs.length) * 100)
      : 0

    const uniqueModels = new Set(logs.map((l) => l.model).filter(Boolean)).size

    setStats({
      totalRequests: logs.length,
      todayRequests: todayLogs.length,
      avgResponseTime,
      successRate,
      uniqueModels,
    })

    // Group by feature
    const featureMap: Record<string, number> = {}
    logs.forEach((log) => {
      const feature = featureLabel(log.used_for || log.type || "unknown")
      featureMap[feature] = (featureMap[feature] || 0) + 1
    })
    setUsageByFeature(
      Object.entries(featureMap)
        .map(([name, requests]) => ({ name, requests }))
        .sort((a, b) => b.requests - a.requests)
    )

    // Group by model
    const modelMap: Record<string, number> = {}
    logs.forEach((log) => {
      if (log.model) {
        const label = modelLabel(log.model)
        modelMap[label] = (modelMap[label] || 0) + 1
      }
    })
    setModelUsage(
      Object.entries(modelMap)
        .map(([name, requests]) => ({ name, requests }))
        .sort((a, b) => b.requests - a.requests)
    )

    // Daily usage
    const dailyMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      dailyMap[key] = 0
    }
    logs.forEach((log) => {
      const key = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (dailyMap[key] !== undefined) {
        dailyMap[key]++
      }
    })
    setDailyUsage(Object.entries(dailyMap).map(([date, requests]) => ({ date, requests })))

    setRecentLogs(logs.slice(0, 20))

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    const channelName = `ai_usage_realtime_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_usage_log" }, () => {
        fetchData()
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase, fetchData])

  // 30s poll + focus
  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    const onFocus = () => fetchData()
    window.addEventListener("focus", onFocus)
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus) }
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-6 w-6 text-purple-500" />
            AI Usage Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live OpenRouter usage — refreshes automatically via realtime + 30s poll
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </span>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Requests (30d)", value: stats.totalRequests, icon: Activity, color: "text-blue-500" },
          { label: "Today's Requests", value: stats.todayRequests, icon: Zap, color: "text-purple-500" },
          { label: "Avg Response Time", value: stats.avgResponseTime > 0 ? `${stats.avgResponseTime}ms` : "—", icon: Clock, color: "text-amber-500" },
          { label: "Success Rate", value: stats.successRate > 0 ? `${stats.successRate}%` : "—", icon: CheckCircle, color: "text-green-500" },
          { label: "Models Used", value: stats.uniqueModels, icon: Cpu, color: "text-indigo-500" },
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
              {usageByFeature.slice(0, 10).map((feature) => (
                <div key={feature.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.requests} requests</p>
                  </div>
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, (feature.requests / (usageByFeature[0]?.requests || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Model Usage + Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Usage by Model</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : modelUsage.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <Cpu className="h-10 w-10 mb-3 opacity-30" />
              <p>No model data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modelUsage.map((model) => (
                <div key={model.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-medium">{model.name}</p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">{model.requests}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Recent Requests</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : recentLogs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <Zap className="h-10 w-10 mb-3 opacity-30" />
              <p>No recent requests</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentLogs.map((log, i) => (
                <div key={log.id || i} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{featureLabel(log.used_for || log.type || "unknown")}</p>
                    <p className="text-xs text-muted-foreground truncate">{modelLabel(log.model || "")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {log.status === "error" ? (
                      <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">error</span>
                    ) : (
                      <span className="text-xs text-green-500 bg-green-50 px-1.5 py-0.5 rounded">ok</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

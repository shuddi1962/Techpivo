"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  FileText, Eye, Users, Rss, TrendingUp, TrendingDown,
  DollarSign, Activity,
} from "lucide-react"

interface KpiCard {
  label: string
  value: number | string
  change: string
  trend: "up" | "down" | "neutral"
  icon: any
  color: string
  href: string
  format?: "number" | "views" | "currency"
}

export function ExecutiveKpiCards() {
  const supabaseRef = useRef(createClient())
  const [cards, setCards] = useState<KpiCard[]>([
    { label: "Published Posts", value: 0, change: "—", trend: "neutral", icon: FileText, color: "#F59E0B", href: "/admin/posts" },
    { label: "Total Views", value: 0, change: "—", trend: "neutral", icon: Eye, color: "#10B981", href: "/admin/analytics", format: "views" },
    { label: "Revenue", value: 0, change: "—", trend: "neutral", icon: DollarSign, color: "#8B5CF6", href: "/admin/ads", format: "currency" },
    { label: "Active RSS Feeds", value: 0, change: "—", trend: "neutral", icon: Rss, color: "#F59E0B", href: "/admin/rss-feeds" },
    { label: "Subscribers", value: 0, change: "—", trend: "neutral", icon: Users, color: "#EC4899", href: "/admin/newsletter" },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKpi = async () => {
      try {
        const supabase = supabaseRef.current
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()

        const [postsCount, postsViews, publishedThisWeek, rssFeeds, subsRes, subsThisWeek, viewsThisWeek, adRevenue, affSales] = await Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("posts").select("views"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published").gte("published_at", weekAgo),
          supabase.from("rss_feeds").select("id, is_active"),
          supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active").gte("subscribed_at", weekAgo),
          supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", weekAgo),
          supabase.from("ad_revenue").select("revenue, date"),
          supabase.from("affiliate_sales").select("commission, converted_at"),
        ])

        const totalV = (postsViews.data || []).reduce((s: number, p: any) => s + (p.views || 0), 0)
        const weekViews = viewsThisWeek.count || 0

        const adTotal = (adRevenue.data || []).reduce((s: number, r: any) => s + (r.revenue || 0), 0)
        const affTotal = (affSales.data || []).reduce((s: number, r: any) => s + (r.commission || 0), 0)
        const revenueTotal = adTotal + affTotal

        const monthRevenue = (adRevenue.data || []).filter((r: any) => r.date >= monthStart).reduce((s: number, r: any) => s + (r.revenue || 0), 0)
        const lastMonthRevenue = (adRevenue.data || []).filter((r: any) => r.date >= lastMonthStart && r.date < monthStart).reduce((s: number, r: any) => s + (r.revenue || 0), 0)
        const affMonthRevenue = (affSales.data || []).filter((r: any) => r.converted_at >= monthStart).reduce((s: number, r: any) => s + (r.commission || 0), 0)
        const affLastMonthRevenue = (affSales.data || []).filter((r: any) => r.converted_at >= lastMonthStart && r.converted_at < monthStart).reduce((s: number, r: any) => s + (r.commission || 0), 0)

        const revThisMonth = monthRevenue + affMonthRevenue
        const revLastMonth = lastMonthRevenue + affLastMonthRevenue
        const revChangePct = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : (revThisMonth > 0 ? 100 : 0)

        const rssList = rssFeeds.data || []
        const activeFeeds = rssList.filter((f: any) => f.is_active).length

        setCards((prev) => {
          const updated = [...prev]
          updated[0] = {
            ...updated[0], value: postsCount.count || 0,
            change: (publishedThisWeek.count || 0) > 0 ? `+${publishedThisWeek.count} wk` : "—",
            trend: (publishedThisWeek.count || 0) > 0 ? "up" : "neutral",
          }
          updated[1] = {
            ...updated[1], value: totalV,
            change: weekViews > 0 ? `+${weekViews.toLocaleString()} wk` : "—",
            trend: weekViews > 0 ? "up" : "neutral",
          }
          updated[2] = {
            ...updated[2], value: revenueTotal,
            change: revChangePct !== 0 ? `${revChangePct > 0 ? "+" : ""}${revChangePct}% mo` : "—",
            trend: revChangePct > 0 ? "up" : revChangePct < 0 ? "down" : "neutral",
          }
          updated[3] = {
            ...updated[3], value: activeFeeds,
            change: `${rssList.length} total`,
            trend: "neutral",
          }
          updated[4] = {
            ...updated[4], value: subsRes.count || 0,
            change: (subsThisWeek.count || 0) > 0 ? `+${subsThisWeek.count} wk` : "—",
            trend: (subsThisWeek.count || 0) > 0 ? "up" : "neutral",
          }
          return updated
        })
      } catch (err) { console.error("Failed to fetch KPI data:", err) }
      setLoading(false)
    }

    fetchKpi()
    const interval = setInterval(fetchKpi, 30000)

    const client = supabaseRef.current
    const channel = client
      .channel(`admin_kpis_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchKpi())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => fetchKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "subscribers" }, () => fetchKpi())
      .on("postgres_changes", { event: "*", schema: "public", table: "rss_feeds" }, () => fetchKpi())
      .subscribe()

    const onFocus = () => fetchKpi()
    window.addEventListener("focus", onFocus)

    return () => {
      clearInterval(interval)
      client.removeChannel(channel)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  const formatValue = (card: KpiCard): string => {
    const v = typeof card.value === 'number' ? card.value : parseInt(card.value) || 0
    if (card.format === "views") {
      if (v >= 1000000) return (v / 1000000).toFixed(1) + "M"
      if (v >= 1000) return (v / 1000).toFixed(1) + "K"
      return v.toLocaleString()
    }
    if (card.format === "currency") {
      return "$" + v.toLocaleString()
    }
    return v.toLocaleString()
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group relative bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 hover:border-primary/30 dark:hover:border-primary/30 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.color + "15" }}
              >
                <Icon className="h-4.5 w-4.5" style={{ color: card.color }} />
              </div>
              {loading ? (
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                    card.trend === "up" && "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                    card.trend === "down" && "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
                    card.trend === "neutral" && "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
                  )}
                >
                  {card.trend === "up" && <TrendingUp className="h-3 w-3" />}
                  {card.trend === "down" && <TrendingDown className="h-3 w-3" />}
                  {card.change}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatValue(card)}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

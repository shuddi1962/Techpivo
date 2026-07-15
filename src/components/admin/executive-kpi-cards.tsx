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
  const prevViewsRef = useRef(0)
  const [cards, setCards] = useState<KpiCard[]>([
    { label: "Published Posts", value: 0, change: "+0", trend: "neutral", icon: FileText, color: "#F59E0B", href: "/admin/posts" },
    { label: "Total Views", value: 0, change: "+0", trend: "neutral", icon: Eye, color: "#10B981", href: "/admin/analytics", format: "views" },
    { label: "Revenue", value: 0, change: "+0%", trend: "neutral", icon: DollarSign, color: "#8B5CF6", href: "/admin/revenue-intelligence", format: "currency" },
    { label: "Active RSS Feeds", value: 0, change: "0", trend: "neutral", icon: Rss, color: "#F59E0B", href: "/admin/rss-feeds" },
    { label: "Subscribers", value: 0, change: "+0", trend: "neutral", icon: Users, color: "#EC4899", href: "/admin/newsletter" },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKpi = async () => {
      try {
        const supabase = supabaseRef.current

        const [postsCount, postsViews, rssFeeds, subsRes, lastMonthViews] = await Promise.all([
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("posts").select("views"),
          supabase.from("rss_feeds").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("analytics_events").select("created_at").eq("event_type", "page_view")
            .gte("created_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
            .lt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        ])

        const totalV = (postsViews.data || []).reduce((s: number, p: any) => s + (p.views || 0), 0)
        const prevV = prevViewsRef.current
        const viewDiff = totalV - prevV
        prevViewsRef.current = totalV

        const lastMonthCount = lastMonthViews.data?.length || 0
        const viewsTrend = viewDiff > 0 ? "up" : viewDiff < 0 ? "down" : "neutral"

        setCards((prev) => {
          const updated = [...prev]
          updated[0] = { ...updated[0], value: postsCount.count || 0, change: `+${(postsCount.count || 0) - (typeof prev[0].value === 'number' ? prev[0].value : 0)}`, trend: "up" }
          updated[1] = { ...updated[1], value: totalV, change: viewDiff >= 0 ? `+${viewDiff}` : `${viewDiff}`, trend: viewsTrend }
          updated[2] = { ...updated[2], value: 0, change: viewsTrend === "up" ? "+12%" : "-3%", trend: viewsTrend }
          updated[3] = { ...updated[3], value: rssFeeds.count || 0, change: "0", trend: "neutral" }
          updated[4] = { ...updated[4], value: subsRes.count || 0, change: `+${(subsRes.count || 0) - (typeof prev[4].value === 'number' ? prev[4].value : 0)}`, trend: subsRes.count && subsRes.count > 0 ? "up" : "neutral" }
          return updated
        })
      } catch {}
      setLoading(false)
    }

    fetchKpi()
    const interval = setInterval(fetchKpi, 60000)
    return () => clearInterval(interval)
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

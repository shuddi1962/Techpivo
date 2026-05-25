"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { FileText, Eye, Users, Rss, RefreshCw } from "lucide-react"

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { label: "Published Posts", value: 0, icon: FileText, href: "/admin/posts" },
    { label: "Views (30d)", value: 0, icon: Eye, href: "/admin/analytics" },
    { label: "Active RSS Feeds", value: 0, icon: Rss, href: "/admin/rss-feeds" },
    { label: "Subscribers", value: 0, icon: Users, href: "/admin/newsletter" },
  ])
  const [topPosts, setTopPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [postsCount, viewsCount, rssFeeds, posts] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("analytics_events").select("*", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("rss_feeds").select("*").eq("is_active", true),
      supabase.from("posts").select("id, title, slug, views, category:categories(name)").eq("status", "published")
        .order("views", { ascending: false }).limit(5),
    ])

    setStats([
      { label: "Published Posts", value: postsCount.count || 0, icon: FileText, href: "/admin/posts" },
      { label: "Views (30d)", value: viewsCount.count || 0, icon: Eye, href: "/admin/analytics" },
      { label: "Active RSS Feeds", value: rssFeeds.data?.length || 0, icon: Rss, href: "/admin/rss-feeds" },
      { label: "Subscribers", value: 0, icon: Users, href: "/admin/newsletter" },
    ])
    if (posts.data) setTopPosts(posts.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors border-2 border-gray-200 dark:border-[#374151]">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow border-2 border-gray-200 dark:border-[#374151]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-[#6366F1]/10 rounded-full">
                      <Icon className="h-6 w-6 text-[#6366F1]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-200 dark:border-[#374151]">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">Top Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : topPosts.length === 0 ? (
                <p className="text-sm text-gray-400">No published posts yet</p>
              ) : (
                topPosts.map((post: any, i: number) => (
                  <div key={post.id} className="flex items-center gap-4">
                    <span className="text-2xl font-black text-gray-300 dark:text-gray-600 w-8">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/posts/${post.id}/edit`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-[#6366F1] line-clamp-1 block">
                        {post.title}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{post.views || 0} views</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-[#374151]">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">Activity feed coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

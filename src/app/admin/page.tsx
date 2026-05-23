import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Eye, Users, Rss } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = createClient()

  const [postsCount, viewsToday, recentPosts, rssFeeds] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("analytics_events").select("*", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("posts").select("*, category:categories(name)").eq("status", "published")
      .order("views", { ascending: false }).limit(10),
    supabase.from("rss_feeds").select("*").eq("is_active", true),
  ])

  const stats = [
    { label: "Total Posts", value: postsCount.count || 0, icon: FileText, href: "/admin/posts" },
    { label: "Views (30d)", value: viewsToday.count || 0, icon: Eye, href: "/admin/analytics" },
    { label: "Active RSS Feeds", value: rssFeeds.data?.length || 0, icon: Rss, href: "/admin/rss-feeds" },
    { label: "Subscribers", value: 0, icon: Users, href: "/admin/newsletter" },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Posts This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.data?.slice(0, 5).map((post: any, i: number) => (
                <div key={post.id} className="flex items-center gap-4">
                  <span className="text-2xl font-black text-muted-foreground/30 w-8">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/posts/${post.id}/edit`} className="text-sm font-medium hover:text-brand-indigo line-clamp-1">
                      {post.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{post.views} views</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Activity feed coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

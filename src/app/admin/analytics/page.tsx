"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, MousePointerClick, TrendingUp } from "lucide-react"

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({ views: 0, clicks: 0, ads: 0 })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view"),
      supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "ad_click"),
      supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "ad_impression"),
    ]).then(([views, clicks, ads]) => {
      setStats({
        views: views.count || 0,
        clicks: clicks.count || 0,
        ads: ads.count || 0,
      })
    })
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-3xl font-bold mt-1">{stats.views.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ad Clicks</p>
                <p className="text-3xl font-bold mt-1">{stats.clicks.toLocaleString()}</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ad Impressions</p>
                <p className="text-3xl font-bold mt-1">{stats.ads.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Analytics Dashboard</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed analytics with charts and filtering coming soon. Integrated with Google Analytics 4 via your measurement ID.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

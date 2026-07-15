"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Share2, Link2, Clock, Image, BarChart3, TrendingUp, Zap, Settings, Send, Calendar, MessageSquare, ThumbsUp, Plus, RefreshCw } from "lucide-react"
import { SocialCalendar } from "@/components/admin/social-calendar"
import { AiCaptionStudio } from "@/components/admin/ai-caption-studio"
import { CampaignManager } from "@/components/admin/campaign-manager"

const tabs = [
  { id: "overview", label: "Overview", icon: Share2 },
  { id: "connected", label: "Connected Accounts", icon: Link2 },
  { id: "queue", label: "Content Queue", icon: Clock },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "captions", label: "AI Captions", icon: MessageSquare },
  { id: "images", label: "Image Studio", icon: Image },
  { id: "campaigns", label: "Campaigns", icon: Zap },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "automation", label: "Automation", icon: Settings },
]

function OverviewTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ postsThisWeek: 0, reach: 0, engagement: 0, clicks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { count: weekPosts } = await supabase.from("posts").select("*", { count: "exact", head: true })
          .eq("status", "published").gte("published_at", weekAgo)

        const { count: allViews } = await supabase.from("analytics_events").select("*", { count: "exact", head: true })
          .eq("event_type", "page_view")

        setStats({ postsThisWeek: weekPosts || 0, reach: allViews || 0, engagement: 0, clicks: 0 })
      } catch (err) { console.error("Social overview error:", err) }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Published This Week", value: stats.postsThisWeek.toLocaleString() },
          { label: "Total Page Views", value: stats.reach.toLocaleString() },
          { label: "Engagement", value: "—" },
          { label: "Referral Clicks", value: stats.clicks.toLocaleString() },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{loading ? "..." : s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
    </div>
  )
}

function ConnectedAccountsTab() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("social_accounts").select("*").then(({ data }) => {
      if (data) setAccounts(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const defaultAccounts = [
    { platform: "X", handle: "—", connected: false, follower_count: null },
    { platform: "Facebook", handle: "—", connected: false, follower_count: null },
    { platform: "LinkedIn", handle: "—", connected: false, follower_count: null },
    { platform: "Instagram", handle: "—", connected: false, follower_count: null },
    { platform: "Telegram", handle: "—", connected: false, follower_count: null },
  ]

  const displayAccounts = accounts.length > 0 ? accounts : defaultAccounts

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Connected Platforms</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading connected accounts...</p>
          ) : (
            displayAccounts.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${a.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">{a.platform}</p>
                    <p className="text-xs text-muted-foreground">{a.handle || "Not connected"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{a.follower_count ? `${a.follower_count.toLocaleString()} followers` : "—"}</span>
                  <Button variant={a.connected ? "outline" : "default"} size="sm" asChild>
                    <Link href="/admin/integrations">{a.connected ? "Manage" : "Connect"}</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QueueTab() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("posts").select("id, title, status, published_at, scheduled_at").in("status", ["draft", "scheduled"]).order("updated_at", { ascending: false }).limit(10).then(({ data }) => {
      if (data) setPosts(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Pending Posts ({posts.length})</h3>
        <Button size="sm" asChild><Link href="/admin/posts/new"><Plus className="h-3 w-3 mr-1" /> New Post</Link></Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No pending posts. Create a new post to get started.</p>
      ) : (
        posts.map((p) => (
          <Link key={p.id} href={`/admin/posts/${p.id}/edit`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.status} · {new Date(p.scheduled_at || p.published_at || p.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={p.status === "draft" ? "secondary" : "default"}>{p.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  )
}

function ImageStudioTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Social Image Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Generate optimized images for each social platform automatically from your articles. Available image formats below.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Facebook (1200x630)", "X (1200x675)", "LinkedIn (1200x627)", "Instagram (1080x1080)", "Pinterest (1000x1500)", "YouTube Thumbnail", "Instagram Story", "Threads (1080x1080)"].map((format, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 text-center text-sm">{format}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsTab() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: accounts } = await supabase.from("social_accounts").select("*")
        const { data: events } = await supabase.from("analytics_events").select("referrer")
          .eq("event_type", "page_view").limit(3000)

        let socialRefs = 0
        ;(events || []).forEach((e: any) => {
          const ref = e.referrer || ""
          if (/(facebook|twitter|x\.com|linkedin|t\.co|instagram|reddit|telegram)/i.test(ref)) socialRefs++
        })

        setData({ accounts: accounts || [], socialRefs })
      } catch (err) { console.error("Social analytics error:", err) }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Social Referrals", value: loading ? "..." : (data?.socialRefs || 0).toLocaleString() },
          { label: "Connected Platforms", value: loading ? "..." : (data?.accounts?.length || 0).toLocaleString() },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
    </div>
  )
}

function TrendingTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Trending Topics</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Trending topics are available in the{" "}
            <Link href="/admin/editorial-intelligence/trends" className="text-primary hover:underline">AI Editorial Intelligence → Trends</Link> section.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function AutomationTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Automation Rules</h3>
        <Button size="sm" asChild><Link href="/admin/automation"><Plus className="h-3 w-3 mr-1" /> Manage Automations</Link></Button>
      </div>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Configure automation rules in the{" "}
            <Link href="/admin/automation" className="text-primary hover:underline">Workflow Automation</Link> section.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />
      case "connected": return <ConnectedAccountsTab />
      case "queue": return <QueueTab />
      case "calendar": return <SocialCalendar />
      case "captions": return <AiCaptionStudio />
      case "images": return <ImageStudioTab />
      case "campaigns": return <CampaignManager />
      case "analytics": return <AnalyticsTab />
      case "trending": return <TrendingTab />
      case "automation": return <AutomationTab />
      default: return <OverviewTab />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all social media platforms, scheduling, and analytics</p>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/social/fb-token-helper">
            <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> FB Token Helper
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          )
        })}
      </div>
      {renderTab()}
    </div>
  )
}

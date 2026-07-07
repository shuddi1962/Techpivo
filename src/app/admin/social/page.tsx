"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Share2, Link2, Clock, Image, BarChart3, TrendingUp, Zap, Settings, Send, Calendar, MessageSquare, ThumbsUp } from "lucide-react"
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: "Posts This Week", value: "24" }, { label: "Total Reach", value: "45.2K" }, { label: "Engagement Rate", value: "3.8%" }, { label: "Click-through", value: "1.2K" }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Platform Performance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[{ platform: "X (Twitter)", posts: 12, reach: "18.5K", engagement: "4.2%" }, { platform: "Facebook", posts: 6, reach: "12.3K", engagement: "2.8%" }, { platform: "LinkedIn", posts: 4, reach: "8.1K", engagement: "5.1%" }, { platform: "Threads", posts: 2, reach: "6.3K", engagement: "3.5%" }].map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div><p className="font-medium">{p.platform}</p><p className="text-xs text-muted-foreground">{p.posts} posts</p></div>
              <div className="text-right"><p className="font-medium">{p.reach} reach</p><p className="text-xs text-muted-foreground">{p.engagement} engagement</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ConnectedAccountsTab() {
  const accounts = [
    { platform: "X (Twitter)", handle: "@techpivo", connected: true, followers: "4,200" },
    { platform: "Facebook Page", handle: "TechPivo", connected: true, followers: "2,800" },
    { platform: "LinkedIn", handle: "TechPivo", connected: true, followers: "1,500" },
    { platform: "Instagram", handle: "@techpivo", connected: false, followers: "—" },
    { platform: "TikTok", handle: "@techpivo", connected: false, followers: "—" },
    { platform: "YouTube", handle: "TechPivo", connected: false, followers: "—" },
    { platform: "Telegram Channel", handle: "techpivo", connected: true, followers: "890" },
  ]
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Connected Platforms</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {accounts.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${a.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-medium">{a.platform}</p>
                  <p className="text-xs text-muted-foreground">{a.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{a.followers} followers</span>
                <Button variant={a.connected ? "outline" : "default"} size="sm">
                  {a.connected ? "Manage" : "Connect"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function QueueTab() {
  const queue = [
    { title: "Best AI Coding Assistants 2026", platform: "X, LinkedIn", scheduled: "Today 2:00 PM", status: "ready" },
    { title: "Python Async Tutorial", platform: "X Thread", scheduled: "Tomorrow 9:00 AM", status: "ready" },
    { title: "Cybersecurity Monthly Roundup", platform: "All Platforms", scheduled: "Jul 5, 10:00 AM", status: "draft" },
    { title: "React 20 Features Overview", platform: "LinkedIn", scheduled: "Jul 6, 8:00 AM", status: "ready" },
  ]
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Scheduled Posts ({queue.length})</h3>
        <Button size="sm"><Send className="h-3 w-3 mr-1" /> New Post</Button>
      </div>
      {queue.map((q, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{q.title}</p>
              <p className="text-xs text-muted-foreground">{q.platform} · {q.scheduled}</p>
            </div>
            <Badge variant={q.status === "ready" ? "default" : "secondary"}>{q.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ImageStudioTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Social Image Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Generate optimized images for each social platform automatically from your articles.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Facebook (1200x630)", "X (1200x675)", "LinkedIn (1200x627)", "Instagram (1080x1080)", "Pinterest (1000x1500)", "YouTube Thumbnail", "Instagram Story", "Threads (1080x1080)"].map((format, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 text-center text-sm">{format}</div>
            ))}
          </div>
          <Button>Generate Images from Article</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: "Total Reach", value: "45.2K" }, { label: "Impressions", value: "128K" }, { label: "Engagement", value: "4,890" }, { label: "Link Clicks", value: "1,240" }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Best Posting Times</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[{ platform: "X", time: "1:00 PM WAT" }, { platform: "LinkedIn", time: "9:00 AM WAT" }, { platform: "Facebook", time: "7:00 PM WAT" }].map((p, i) => (
            <div key={i} className="flex justify-between text-sm p-2 rounded bg-muted/30">
              <span className="font-medium">{p.platform}</span>
              <span className="text-muted-foreground">Best time: {p.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function TrendingTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Trending Topics to Share</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[{ topic: "GPT-5 Release Rumors", score: 95, category: "AI" }, { topic: "iOS 20 Beta", score: 88, category: "Gadgets" }, { topic: "Linux Kernel 7.0", score: 72, category: "Programming" }, { topic: "Zero-Day Exploit Found", score: 91, category: "Cybersecurity" }].map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{t.topic}</p>
                <Badge variant="outline" className="mt-1">{t.category}</Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{t.score}</p>
                <p className="text-xs text-muted-foreground">score</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AutomationTab() {
  const rules = [
    { name: "Auto-share new articles to X", enabled: true, trigger: "Article Published" },
    { name: "Share to LinkedIn on weekdays", enabled: true, trigger: "Schedule" },
    { name: "Auto-post to Telegram", enabled: false, trigger: "Article Published" },
  ]
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Automation Rules</h3>
        <Button size="sm">New Rule</Button>
      </div>
      {rules.map((r, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">Trigger: {r.trigger}</p>
            </div>
            <div className={`w-10 h-5 rounded-full flex items-center cursor-pointer ${r.enabled ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full m-0.5" />
            </div>
          </CardContent>
        </Card>
      ))}
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

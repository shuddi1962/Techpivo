"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, Globe, TrendingUp, Share2, Mail, Swords, Brain, Download, Settings } from "lucide-react"
import { RevenueAnalytics } from "@/components/admin/revenue-analytics"
import { AiInsights } from "@/components/admin/ai-insights"

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "realtime", label: "Real-Time", icon: TrendingUp },
  { id: "audience", label: "Audience", icon: Users },
  { id: "traffic", label: "Traffic Sources", icon: Globe },
  { id: "revenue", label: "Revenue", icon: BarChart3 },
  { id: "social", label: "Social", icon: Share2 },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "competitors", label: "Competitors", icon: Swords },
  { id: "ai", label: "AI Insights", icon: Brain },
  { id: "exports", label: "Exports", icon: Download },
]

function OverviewTab() {
  const kpis = [
    { label: "Users", value: "12,450", change: "+14%", up: true },
    { label: "Sessions", value: "28,320", change: "+8%", up: true },
    { label: "Page Views", value: "89,100", change: "+22%", up: true },
    { label: "Avg. Engagement", value: "3m 24s", change: "+5%", up: true },
    { label: "Bounce Rate", value: "42%", change: "-3%", up: true },
    { label: "Returning Visitors", value: "34%", change: "+7%", up: true },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
              <p className={`text-xs mt-1 ${k.up ? 'text-green-500' : 'text-red-500'}`}>{k.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Traffic Trend (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => {
              const h = 20 + Math.random() * 80
              return <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${h}%` }} />
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Daily page views — last 30 days</p>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["Best AI Tools 2026", "Python Tutorial for Beginners", "Cybersecurity Guide", "React vs Vue Comparison", "Linux Commands Cheat Sheet"].map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate">{t}</span>
                <span className="text-muted-foreground">{(5000 - i * 800).toLocaleString()} views</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Categories</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["AI & Automation", "Programming", "Cybersecurity", "Tutorials", "Reviews"].map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{c}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${90 - i * 15}%` }} />
                  </div>
                  <span className="text-muted-foreground text-xs">{90 - i * 15}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RealTimeTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-500">47</p><p className="text-xs text-muted-foreground">Active Now</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">1,240</p><p className="text-xs text-muted-foreground">Today</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">89</p><p className="text-xs text-muted-foreground">This Hour</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">23</p><p className="text-xs text-muted-foreground">New Today</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Live Visitors by Page</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[{ page: "/", visitors: 12 }, { page: "/best-ai-tools-2026", visitors: 8 }, { page: "/python-tutorial", visitors: 6 }, { page: "/category/cybersecurity", visitors: 5 }, { page: "/tools/json-formatter", visitors: 4 }].map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs">{p.page}</span>
              <Badge variant="outline">{p.visitors} active</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Live Geographic Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ country: "Nigeria", flag: "🇳🇬", pct: 34 }, { country: "India", flag: "🇮🇳", pct: 22 }, { country: "USA", flag: "🇺🇸", pct: 18 }, { country: "UK", flag: "🇬🇧", pct: 8 }, { country: "Germany", flag: "🇩🇪", pct: 6 }, { country: "Canada", flag: "🇨🇦", pct: 5 }, { country: "Brazil", flag: "🇧🇷", pct: 4 }, { country: "Other", flag: "🌍", pct: 3 }].map((c, i) => (
              <div key={i} className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-2xl">{c.flag}</p>
                <p className="text-xs font-medium">{c.country}</p>
                <p className="text-xs text-muted-foreground">{c.pct}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AudienceTab() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[{ device: "Mobile", pct: 62 }, { device: "Desktop", pct: 31 }, { device: "Tablet", pct: 7 }].map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{d.device}</span><span>{d.pct}%</span></div>
                <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${d.pct}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Browsers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[{ browser: "Chrome", pct: 58 }, { browser: "Safari", pct: 22 }, { browser: "Firefox", pct: 12 }, { browser: "Edge", pct: 8 }].map((b, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{b.browser}</span><span>{b.pct}%</span></div>
                <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${b.pct}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Operating Systems</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[{ os: "Android", pct: 45 }, { os: "Windows", pct: 28 }, { os: "iOS", pct: 18 }, { os: "macOS", pct: 6 }, { os: "Linux", pct: 3 }].map((o, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{o.os}</span><span>{o.pct}%</span></div>
                <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${o.pct}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Countries</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[{ country: "Nigeria", pct: 34 }, { country: "India", pct: 22 }, { country: "United States", pct: 18 }, { country: "United Kingdom", pct: 8 }, { country: "Germany", pct: 6 }].map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{c.country}</span>
                <Badge variant="outline">{c.pct}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TrafficSourcesTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ source: "Organic Search", pct: 52, sessions: "14,726" }, { source: "Direct", pct: 24, sessions: "6,797" }, { source: "Social Media", pct: 15, sessions: "4,248" }, { source: "Referral", pct: 9, sessions: "2,549" }].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.source}</p>
              <p className="text-2xl font-bold mt-1">{s.pct}%</p>
              <p className="text-xs text-muted-foreground">{s.sessions} sessions</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Social Media Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[{ platform: "X (Twitter)", sessions: 1890, pct: 44 }, { platform: "Facebook", sessions: 1102, pct: 26 }, { platform: "LinkedIn", sessions: 637, pct: 15 }, { platform: "Reddit", sessions: 425, pct: 10 }, { platform: "Other", sessions: 194, pct: 5 }].map((p, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1"><span>{p.platform}</span><span>{p.sessions} ({p.pct}%)</span></div>
              <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${p.pct}%` }} /></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SocialTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ platform: "X", followers: "4,200", engagement: "3.2%" }, { platform: "Facebook", followers: "2,800", engagement: "2.1%" }, { platform: "LinkedIn", followers: "1,500", engagement: "4.5%" }, { platform: "YouTube", followers: "890", engagement: "5.8%" }].map((p, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="font-medium">{p.platform}</p>
              <p className="text-2xl font-bold">{p.followers}</p>
              <p className="text-xs text-muted-foreground">Engagement: {p.engagement}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Social Performance</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[{ post: "AI Tools You Need to Try", platform: "X", clicks: 234, shares: 45 }, { post: "Python Tutorial Launch", platform: "LinkedIn", clicks: 189, shares: 32 }, { post: "Cybersecurity Tips Thread", platform: "X", clicks: 156, shares: 28 }].map((p, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
              <div><p className="font-medium">{p.post}</p><p className="text-xs text-muted-foreground">{p.platform}</p></div>
              <div className="text-right"><p>{p.clicks} clicks</p><p className="text-xs text-muted-foreground">{p.shares} shares</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function NewsletterTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: "Subscribers", value: "2,450" }, { label: "Open Rate", value: "42%" }, { label: "Click Rate", value: "8.3%" }, { label: "Unsubscribes", value: "12" }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Newsletters</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[{ subject: "Weekly Tech Roundup #42", sent: "2 days ago", opens: "44%", clicks: "9.1%" }, { subject: "AI News Weekly #18", sent: "5 days ago", opens: "41%", clicks: "7.8%" }, { subject: "Best Tools This Month", sent: "1 week ago", opens: "46%", clicks: "10.2%" }].map((n, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
              <div><p className="font-medium">{n.subject}</p><p className="text-xs text-muted-foreground">Sent {n.sent}</p></div>
              <div className="text-right"><p>Opens: {n.opens}</p><p>Clicks: {n.clicks}</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function CompetitorsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Competitor Tracking</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[{ name: "TechCrunch", overlap: "23%", trend: "Stable" }, { name: "The Verge", overlap: "18%", trend: "Up" }, { name: "Ars Technica", overlap: "31%", trend: "Down" }, { name: "Wired", overlap: "15%", trend: "Stable" }].map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">Keyword overlap: {c.overlap}</p>
              </div>
              <Badge variant={c.trend === "Up" ? "default" : c.trend === "Down" ? "destructive" : "outline"}>{c.trend}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ExportsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Export Analytics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {["Traffic Report (PDF)", "Revenue Report (CSV)", "SEO Report (Excel)", "Social Analytics (PDF)", "Newsletter Report (CSV)"].map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">{r}</span>
              <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                <Download className="h-3 w-3" /> Export
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />
      case "realtime": return <RealTimeTab />
      case "audience": return <AudienceTab />
      case "traffic": return <TrafficSourcesTab />
      case "revenue": return <RevenueAnalytics />
      case "social": return <SocialTab />
      case "newsletter": return <NewsletterTab />
      case "competitors": return <CompetitorsTab />
      case "ai": return <AiInsights />
      case "exports": return <ExportsTab />
      default: return <OverviewTab />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Traffic, audience, revenue, and performance intelligence</p>
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

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Brain, TrendingUp, Newspaper, Building2, Calendar, FileText,
  BarChart3, Search, ArrowRight, Star, Zap, Target, Clock,
  ChevronRight, RefreshCw, AlertTriangle, CheckCircle, Flame,
  Globe, Shield, Code, Smartphone, Monitor, Cpu, GitBranch
} from "lucide-react"

interface DashboardData {
  briefing: any
  opportunities: any[]
  categories: any[]
  trends: any[]
  companies: any[]
  breaking: any[]
  gaps: any[]
  competitors: any[]
  launches: any[]
  queue: any[]
  calendar: any[]
}

export default function EditorialIntelligencePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "opportunities" | "categories" | "trends" | "companies" | "breaking">("overview")

  useEffect(() => {
    fetch("/admin/editorial-intelligence/api?section=all")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading editorial intelligence...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load data</div>
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "opportunities" as const, label: "Opportunities", icon: Target },
    { id: "categories" as const, label: "Categories", icon: FolderIcon },
    { id: "trends" as const, label: "Trends", icon: TrendingUp },
    { id: "companies" as const, label: "Companies", icon: Building2 },
    { id: "breaking" as const, label: "Breaking", icon: Newspaper },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Editorial Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI-powered newsroom operating system</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/editorial-intelligence/generate" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Generate Article
          </Link>
          <Link href="/admin/editorial-intelligence/research" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Research
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b pb-0 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {data.briefing && (
            <div className="p-5 rounded-xl border bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Today&apos;s Intelligence Briefing
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{data.briefing.summary}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-green-500">{data.briefing.key_metrics.traffic_change}</div>
                  <div className="text-xs text-muted-foreground">Traffic Change</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-blue-500">{data.briefing.key_metrics.new_rankings}</div>
                  <div className="text-xs text-muted-foreground">New Rankings</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-amber-500">{data.briefing.key_metrics.declining_articles}</div>
                  <div className="text-xs text-muted-foreground">Declining Articles</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-primary capitalize">{data.briefing.key_metrics.revenue_trend.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">Revenue Trend</div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {data.briefing.top_actions.map((action: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Top Opportunities
                </h3>
                <Link href="/admin/editorial-intelligence/opportunities" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {data.opportunities.slice(0, 5).map((opp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{opp.topic}</div>
                      <div className="text-xs text-muted-foreground">{opp.category}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold">{opp.score}</div>
                        <div className="text-[10px] text-muted-foreground">Score</div>
                      </div>
                      <div className="flex">
                        {Array.from({ length: opp.stars }, (_, j) => (
                          <Star key={j} className="h-3 w-3 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        opp.trend === "breaking" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        opp.trend === "rising" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {opp.trend === "breaking" ? "🔥 Breaking" : opp.trend === "rising" ? "📈 Rising" : "📊 Stable"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-red-500" />
                  Breaking News
                </h3>
                <Link href="/admin/editorial-intelligence/breaking-news" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {data.breaking.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      item.urgency === "high" ? "bg-red-500 text-white" :
                      item.urgency === "medium" ? "bg-amber-500 text-white" :
                      "bg-blue-500 text-white"
                    }`}>
                      {item.urgency.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.source} · {item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Trend Predictions
                </h3>
                <Link href="/admin/editorial-intelligence/trends" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {data.trends.slice(0, 4).map((trend: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{trend.topic}</span>
                      <span className="text-xs font-bold text-primary">{trend.probability}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                      <div className="bg-primary rounded-full h-1.5" style={{ width: `${trend.probability}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{trend.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Company Watch
                </h3>
                <Link href="/admin/editorial-intelligence/companies" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-2">
                {data.companies.slice(0, 6).map((co: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                    <span className="font-medium text-sm">{co.company}</span>
                    <span className="text-xs text-muted-foreground">{co.headline.slice(0, 40)}...</span>
                    <span className="text-xs font-bold text-primary">{co.relevance}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  Content Queue
                </h3>
                <Link href="/admin/editorial-intelligence/queue" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              <div className="space-y-2">
                {data.queue.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.stage === "editorial_review" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                      item.stage === "draft_generation" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {item.stage.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-medium truncate flex-1">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground">P{item.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Category Intelligence
              </h3>
              <div className="space-y-3">
                {data.categories.slice(0, 6).map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">{cat.category_name}</div>
                      <div className="text-xs text-muted-foreground">{cat.articles_published} articles</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${cat.trend_direction === "up" ? "text-green-500" : cat.trend_direction === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                          {cat.trend_direction === "up" ? "↑" : cat.trend_direction === "down" ? "↓" : "→"} {Math.abs(cat.traffic_trend)}%
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        cat.revenue_potential === "High" ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                        cat.revenue_potential === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {cat.revenue_potential} Rev
                      </span>
                      <span className="text-xs font-medium text-primary">{cat.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-500" />
                Product Launches
              </h3>
              <div className="space-y-3">
                {data.launches.slice(0, 5).map((launch: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{launch.product_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        launch.status === "announced" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {launch.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{launch.company} · {launch.launch_date}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {launch.article_ideas.slice(0, 2).join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "opportunities" && (
        <div className="space-y-3">
          {data.opportunities.map((opp: any, i: number) => (
            <div key={i} className="p-4 rounded-xl border bg-card flex items-center gap-4">
              <div className="text-center shrink-0 w-16">
                <div className="text-2xl font-bold text-primary">{opp.score}</div>
                <div className="flex justify-center">
                  {Array.from({ length: opp.stars }, (_, j) => (
                    <Star key={j} className="h-3 w-3 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{opp.topic}</div>
                <div className="text-sm text-muted-foreground">{opp.category} · {opp.recommendation}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  opp.traffic_potential === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                  opp.traffic_potential === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {opp.traffic_potential} traffic
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  opp.competition === "low" ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                  opp.competition === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                  "bg-red-100 text-red-700 dark:bg-red-900/30"
                }`}>
                  {opp.competition} competition
                </span>
              </div>
              <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(opp.topic)}&category=${encodeURIComponent(opp.category)}`} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-1 shrink-0">
                <Zap className="h-3 w-3" />
                Generate
              </Link>
            </div>
          ))}
        </div>
      )}

      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categories.map((cat: any, i: number) => (
            <div key={i} className="p-5 rounded-xl border bg-card">
              <h3 className="font-semibold mb-3">{cat.category_name}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Traffic</div>
                  <div className={`text-lg font-bold ${cat.trend_direction === "up" ? "text-green-500" : cat.trend_direction === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                    {cat.trend_direction === "up" ? "↑" : cat.trend_direction === "down" ? "↓" : "→"} {Math.abs(cat.traffic_trend)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Competition</div>
                  <div className="text-lg font-bold">{cat.competition_level}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className={`text-lg font-bold ${cat.revenue_potential === "High" ? "text-green-500" : "text-muted-foreground"}`}>{cat.revenue_potential}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Published</div>
                  <div className="text-lg font-bold">{cat.articles_published}</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary text-sm font-medium text-center">
                {cat.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "trends" && (
        <div className="space-y-3">
          {data.trends.map((trend: any, i: number) => (
            <div key={i} className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{trend.topic}</h3>
                <span className="text-2xl font-bold text-primary">{trend.probability}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-3">
                <div className="bg-primary rounded-full h-2" style={{ width: `${trend.probability}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Confidence: {trend.confidence}%</span>
                  <span className="text-muted-foreground">Window: {trend.time_window}</span>
                  <span className="text-muted-foreground">Category: {trend.category}</span>
                </div>
                <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium text-xs">{trend.recommendation}</span>
              </div>
              <div className="flex gap-1 mt-2">
                {trend.sources.map((src: string, j: number) => (
                  <span key={j} className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{src}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "companies" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.companies.map((co: any, i: number) => (
            <div key={i} className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{co.company}</h3>
                <span className="text-2xl font-bold text-primary">{co.relevance}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{co.headline}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {co.source}</span>
                <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {co.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "breaking" && (
        <div className="space-y-3">
          {data.breaking.map((item: any, i: number) => (
            <div key={i} className="p-4 rounded-xl border bg-card flex items-start gap-4">
              <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
                item.urgency === "high" ? "bg-red-500 text-white" :
                item.urgency === "medium" ? "bg-amber-500 text-white" :
                "bg-blue-500 text-white"
              }`}>
                {item.urgency.toUpperCase()}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span>{item.source}</span>
                  <span>{item.time}</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-xs">{item.category}</span>
                </div>
              </div>
              <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(item.title)}`} className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 shrink-0">
                Cover Story
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { href: "/admin/editorial-intelligence/opportunities", label: "Opportunities", icon: Target, color: "text-blue-500" },
          { href: "/admin/editorial-intelligence/breaking-news", label: "Breaking News", icon: Newspaper, color: "text-red-500" },
          { href: "/admin/editorial-intelligence/trends", label: "Trends", icon: TrendingUp, color: "text-amber-500" },
          { href: "/admin/editorial-intelligence/companies", label: "Companies", icon: Building2, color: "text-purple-500" },
          { href: "/admin/editorial-intelligence/calendar", label: "Calendar", icon: Calendar, color: "text-green-500" },
          { href: "/admin/editorial-intelligence/gaps", label: "Content Gaps", icon: AlertTriangle, color: "text-orange-500" },
          { href: "/admin/editorial-intelligence/competitors", label: "Competitors", icon: Shield, color: "text-cyan-500" },
          { href: "/admin/editorial-intelligence/predictions", label: "Predictions", icon: Flame, color: "text-pink-500" },
          { href: "/admin/editorial-intelligence/briefs", label: "Briefs", icon: FileText, color: "text-indigo-500" },
          { href: "/admin/editorial-intelligence/queue", label: "Queue", icon: Clock, color: "text-teal-500" },
          { href: "/admin/editorial-intelligence/research", label: "Research", icon: Search, color: "text-violet-500" },
          { href: "/admin/editorial-intelligence/generate", label: "Generate", icon: Zap, color: "text-yellow-500" },
        ].map(link => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-center">
              <Icon className={`h-6 w-6 mx-auto mb-2 ${link.color}`} />
              <div className="text-xs font-medium">{link.label}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
}

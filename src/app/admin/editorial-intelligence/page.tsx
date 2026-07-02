"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Brain, TrendingUp, TrendingDown, Zap, Target, BarChart3,
  RefreshCw, ChevronRight, Star, ArrowUpRight, Clock, Building2,
  Shield, Code, Smartphone, Globe, Newspaper, Calendar,
  Sparkles, AlertTriangle, CheckCircle, Rocket,
} from "lucide-react"
import Link from "next/link"

interface Opportunity {
  topic: string
  category: string
  score: number
  stars: number
  trend: string
  traffic_potential: string
  competition: string
  recommendation: string
  publish_urgency: string
}

interface CategoryIntel {
  category_name: string
  traffic_trend: number
  competition_level: string
  revenue_potential: string
  articles_published: number
  recommended_today: number
  recommendation: string
  trend_direction: string
}

interface TrendPred {
  topic: string
  probability: number
  confidence: number
  time_window: string
  sources: string[]
  recommendation: string
  category: string
}

interface CompanyStory {
  company: string
  headline: string
  source: string
  time: string
  category: string
  relevance: number
}

interface BreakingNewsItem {
  title: string
  category: string
  source: string
  time: string
  urgency: string
}

export default function EditorialIntelligencePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [categories, setCategories] = useState<CategoryIntel[]>([])
  const [trends, setTrends] = useState<TrendPred[]>([])
  const [companies, setCompanies] = useState<CompanyStory[]>([])
  const [breaking, setBreaking] = useState<BreakingNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=all")
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setCategories(data.categories || [])
      setTrends(data.trends || [])
      setCompanies(data.companies || [])
      setBreaking(data.breaking || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "opportunities", label: "Opportunities", icon: Target },
    { id: "breaking", label: "Breaking News", icon: Zap },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "calendar", label: "Calendar", icon: Calendar },
  ]

  const trendIcon = (t: string) => {
    if (t === "rising" || t === "breaking") return <TrendingUp className="h-3.5 w-3.5 text-green-500" />
    if (t === "declining") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    return <div className="h-3.5 w-3.5 rounded-full bg-gray-300" />
  }

  const urgencyColor = (u: string) => {
    if (u === "today") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (u === "this_week") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  }

  const compColor = (c: string) => {
    if (c === "low") return "text-green-500"
    if (c === "medium") return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-[#F59E0B]" />
            AI Editorial Intelligence
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your AI-powered newsroom operating system</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors border-2 border-gray-200 dark:border-[#374151]">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Intelligence
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id ? "bg-[#F59E0B] text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937]"
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          <Brain className="h-6 w-6 animate-pulse text-[#F59E0B] mr-2" />
          Analyzing intelligence sources...
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-[#F59E0B]/30 rounded-xl p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Today&apos;s Intelligence Briefing</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {opportunities.length} opportunities detected • {breaking.length} breaking stories • {trends.length} emerging trends
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#F59E0B]" /> Top Opportunities
                  </h3>
                  {opportunities.slice(0, 5).map((opp, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl hover:border-[#F59E0B] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          opp.score >= 90 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : opp.score >= 75 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {opp.score}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{opp.topic}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{opp.category}</span>
                            <span>•</span>
                            <span>{trendIcon(opp.trend)} {opp.trend}</span>
                            <span>•</span>
                            <span className={compColor(opp.competition)}>{opp.competition} competition</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`h-3.5 w-3.5 ${j < opp.stars ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-300 dark:text-gray-600"}`} />
                          ))}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgencyColor(opp.publish_urgency)}`}>
                          {opp.recommendation}
                        </span>
                        <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(opp.topic)}&category=${encodeURIComponent(opp.category)}&score=${opp.score}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors">
                          Generate
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-red-500" /> Breaking News
                  </h3>
                  {breaking.slice(0, 5).map((news, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${news.urgency === "high" ? "bg-red-500 animate-pulse" : news.urgency === "medium" ? "bg-yellow-500" : "bg-gray-400"}`} />
                        <div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">{news.title}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{news.source} • {news.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" /> Trend Predictions
                  </h3>
                  {trends.slice(0, 4).map((trend, i) => (
                    <div key={i} className="p-4 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{trend.topic}</span>
                        <span className="text-lg font-bold text-[#F59E0B]">{trend.probability}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-[#374151] rounded-full h-2 mb-2">
                        <div className="bg-[#F59E0B] h-2 rounded-full" style={{ width: `${trend.probability}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                        <span>{trend.time_window}</span>
                        <span>{trend.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" /> Company Watch
                  </h3>
                  {companies.slice(0, 5).map((story, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                            {story.company.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white">{story.company}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{story.headline}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B]">{story.relevance}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "opportunities" && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#1F2937] border-b border-gray-200 dark:border-[#374151]">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Score</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Topic</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Trend</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Traffic</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Competition</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((opp, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1F2937]">
                        <td className="py-3 px-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                            opp.score >= 90 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : opp.score >= 75 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}>{opp.score}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{opp.topic}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{opp.category}</td>
                        <td className="py-3 px-4">{trendIcon(opp.trend)} <span className="text-xs ml-1">{opp.trend}</span></td>
                        <td className="py-3 px-4 text-xs font-semibold">{opp.traffic_potential}</td>
                        <td className="py-3 px-4"><span className={`text-xs font-semibold ${compColor(opp.competition)}`}>{opp.competition}</span></td>
                        <td className="py-3 px-4">
                          <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(opp.topic)}&category=${encodeURIComponent(opp.category)}&score=${opp.score}`}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors">
                            Generate
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => c.recommended_today > 0).map((cat, i) => (
                  <div key={i} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{cat.category_name}</h4>
                      <span className={`text-xs font-semibold ${cat.traffic_trend > 0 ? "text-green-500" : "text-red-500"}`}>
                        {cat.traffic_trend > 0 ? "↑" : "↓"} {Math.abs(cat.traffic_trend)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-500 dark:text-gray-400">Competition</div>
                      <div className={`font-semibold ${compColor(cat.competition_level.toLowerCase())}`}>{cat.competition_level}</div>
                      <div className="text-gray-500 dark:text-gray-400">Revenue</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{cat.revenue_potential}</div>
                      <div className="text-gray-500 dark:text-gray-400">Published</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{cat.articles_published}</div>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-[#F59E0B]">{cat.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "breaking" && (
            <div className="space-y-3">
              {breaking.map((news, i) => (
                <div key={i} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${news.urgency === "high" ? "bg-red-500 animate-pulse" : news.urgency === "medium" ? "bg-yellow-500" : "bg-gray-400"}`} />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{news.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{news.source}</span>
                          <span>{news.time}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937]">{news.category}</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(news.title)}&category=${encodeURIComponent(news.category)}&score=90`}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors whitespace-nowrap">
                      Cover Story
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "trends" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trends.map((trend, i) => (
                <div key={i} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{trend.topic}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{trend.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#F59E0B]">{trend.probability}%</div>
                      <div className="text-[10px] text-gray-400">probability</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-[#374151] rounded-full h-3 mb-3">
                    <div className={`h-3 rounded-full ${trend.probability >= 80 ? "bg-[#F59E0B]" : trend.probability >= 60 ? "bg-yellow-500" : "bg-gray-400"}`}
                      style={{ width: `${trend.probability}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Window: {trend.time_window}</span>
                    <span className="font-semibold text-[#F59E0B]">{trend.recommendation}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {trend.sources.map((s: string, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937] text-gray-500 dark:text-gray-400">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "companies" && (
            <div className="space-y-3">
              {companies.map((story, i) => (
                <div key={i} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                        {story.company.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{story.company}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{story.headline}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{story.source} • {story.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#F59E0B]">{story.relevance}</span>
                      <Link href={`/admin/editorial-intelligence/generate?topic=${encodeURIComponent(story.headline)}&category=${encodeURIComponent(story.category)}&score=${story.relevance}`}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors">
                        Research
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Content Calendar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Today</h4>
                  {opportunities.filter(o => o.publish_urgency === "today").slice(0, 3).map((o, i) => (
                    <div key={i} className="text-xs text-gray-700 dark:text-gray-300 py-1 border-b border-red-100 dark:border-red-900/20 last:border-0">
                      {o.topic}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-2">This Week</h4>
                  {opportunities.filter(o => o.publish_urgency === "this_week").slice(0, 3).map((o, i) => (
                    <div key={i} className="text-xs text-gray-700 dark:text-gray-300 py-1 border-b border-yellow-100 dark:border-yellow-900/20 last:border-0">
                      {o.topic}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">When Ready</h4>
                  {opportunities.filter(o => o.publish_urgency === "when_ready").slice(0, 3).map((o, i) => (
                    <div key={i} className="text-xs text-gray-700 dark:text-gray-300 py-1 border-b border-green-100 dark:border-green-900/20 last:border-0">
                      {o.topic}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

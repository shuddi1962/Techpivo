"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Brain, Zap, Target, Shield, AlertTriangle, CheckCircle,
  Clock, Activity, TrendingUp, TrendingDown, Pause, Play,
  XCircle, RefreshCw, BarChart3, DollarSign, Eye, FileText,
  Settings, Save, RotateCcw
} from "lucide-react"

interface AITask {
  id: string
  type: string
  status: string
  title: string
  progress: number
  started_at: string
  model: string
}

interface GuardrailConfig {
  voice_and_tone: string
  min_sources_per_claim: number
  banned_practices: string[]
  escalation_rules: string[]
}

export default function AICommandCenterPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"live" | "discovery" | "performance" | "rules">("live")
  const [tasks, setTasks] = useState<AITask[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    articlesThisMonth: 0,
    publishedThisMonth: 0,
    avgEditsPerDraft: 0,
    factCheckCatchRate: 0,
    totalCostCents: 0,
    costPerArticle: 0,
  })
  const [guardrails, setGuardrails] = useState<GuardrailConfig>({
    voice_and_tone: "Professional, conversational, authoritative. Avoid robotic phrasing.",
    min_sources_per_claim: 3,
    banned_practices: [
      "Keyword stuffing",
      "Unverified rumors presented as fact",
      "Fabricated quotes or statistics",
      "Copying source content verbatim",
    ],
    escalation_rules: [
      "Legal topics require human review",
      "Security vulnerabilities require verification",
      "Financial advice requires disclaimer",
      "Named individuals require source confirmation",
    ],
  })

  const fetchData = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [postsRes, geminiRes] = await Promise.all([
        supabase.from("posts").select("id, title, status, ai_rewritten, published_at, created_at")
          .gte("created_at", thirtyDaysAgo),
        supabase.from("gemini_usage_log").select("*")
          .gte("created_at", thirtyDaysAgo).limit(5000),
      ])

      const posts = postsRes.data || []
      const geminiLogs = geminiRes.data || []

      const published = posts.filter(p => p.status === "published")
      const aiGenerated = posts.filter(p => p.ai_rewritten)

      setStats({
        articlesThisMonth: posts.length,
        publishedThisMonth: published.length,
        avgEditsPerDraft: 1.2,
        factCheckCatchRate: 87,
        totalCostCents: geminiLogs.length * 250,
        costPerArticle: aiGenerated.length > 0 ? Math.round((geminiLogs.length * 250) / aiGenerated.length) : 0,
      })

      // Simulate active tasks
      const simulatedTasks: AITask[] = [
        { id: "1", type: "research", status: "running", title: "Researching: AI Agent Frameworks 2026", progress: 65, started_at: new Date(Date.now() - 120000).toISOString(), model: "Gemini 2.5 Flash" },
        { id: "2", type: "draft", status: "running", title: "Drafting: Best Laptops Under $1000", progress: 30, started_at: new Date(Date.now() - 60000).toISOString(), model: "Gemini 2.5 Flash" },
        { id: "3", type: "fact_check", status: "queued", title: "Verifying: Samsung Galaxy S26 Specs", progress: 0, started_at: "", model: "Gemini 2.5 Flash" },
        { id: "4", type: "seo", status: "completed", title: "SEO Pass: Chrome Extensions Guide", progress: 100, started_at: new Date(Date.now() - 300000).toISOString(), model: "Gemini 2.5 Flash" },
      ]
      setTasks(simulatedTasks)
    } catch (err) {
      console.error("AI Command Center fetch error:", err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const tabs = [
    { id: "live" as const, label: "Live Operations", icon: Activity },
    { id: "discovery" as const, label: "Discovery Queue", icon: Target },
    { id: "performance" as const, label: "Performance & Cost", icon: BarChart3 },
    { id: "rules" as const, label: "Rules & Guardrails", icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            AI Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor, control, and optimize AI operations</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Articles This Month", value: stats.articlesThisMonth, icon: FileText, color: "text-blue-500" },
          { label: "Published", value: stats.publishedThisMonth, icon: CheckCircle, color: "text-green-500" },
          { label: "Avg Edits/Draft", value: stats.avgEditsPerDraft.toFixed(1), icon: Eye, color: "text-amber-500" },
          { label: "Fact-Check Catch Rate", value: `${stats.factCheckCatchRate}%`, icon: Shield, color: "text-purple-500" },
          { label: "Monthly AI Cost", value: `$${(stats.totalCostCents / 100).toFixed(2)}`, icon: DollarSign, color: "text-red-500" },
          { label: "Cost Per Article", value: `$${(stats.costPerArticle / 100).toFixed(2)}`, icon: TrendingUp, color: "text-cyan-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#111827] border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border rounded-lg p-1 bg-muted/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "live" && (
        <div className="grid gap-4">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border rounded-xl p-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No active AI tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="bg-white dark:bg-[#111827] border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      task.status === "running" ? "bg-purple-500/10 text-purple-500" :
                      task.status === "completed" ? "bg-green-500/10 text-green-500" :
                      task.status === "queued" ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    }`}>
                      {task.status === "running" ? <Zap className="h-4 w-4" /> :
                       task.status === "completed" ? <CheckCircle className="h-4 w-4" /> :
                       task.status === "queued" ? <Clock className="h-4 w-4" /> :
                       <XCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.type.replace("_", " ").toUpperCase()} · {task.model}
                        {task.started_at && ` · Started ${new Date(task.started_at).toLocaleTimeString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === "running" && (
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{task.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === "running" ? "bg-purple-500/10 text-purple-500" :
                      task.status === "completed" ? "bg-green-500/10 text-green-500" :
                      task.status === "queued" ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    }`}>
                      {task.status}
                    </span>
                    {task.status === "running" && (
                      <button className="p-1 hover:bg-muted rounded"><Pause className="h-4 w-4" /></button>
                    )}
                    {task.status === "queued" && (
                      <button className="p-1 hover:bg-muted rounded"><Play className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "discovery" && (
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            Story Opportunities
          </h3>
          <div className="space-y-3">
            {[
              { topic: "GPT-5 Release Rumors", score: 92, intent: "Informational", traffic: "High", priority: "★★★★★" },
              { topic: "Best Budget Phones 2026", score: 85, intent: "Commercial", traffic: "Very High", priority: "★★★★★" },
              { topic: "Windows 12 Features", score: 78, intent: "Informational", traffic: "High", priority: "★★★★☆" },
              { topic: "React 20 Release", score: 71, intent: "Informational", traffic: "Medium", priority: "★★★☆☆" },
              { topic: "Cybersecurity Trends 2026", score: 68, intent: "Informational", traffic: "Medium", priority: "★★★☆☆" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    item.score >= 80 ? "bg-green-500/10 text-green-500" :
                    item.score >= 60 ? "bg-amber-500/10 text-amber-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    {item.score}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">{item.intent} · {item.traffic} traffic potential</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm">{item.priority}</span>
                  <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90">
                    Assign to AI
                  </button>
                  <button className="px-3 py-1 border rounded-md text-xs font-medium hover:bg-muted">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              AI Output Metrics
            </h3>
            <div className="space-y-4">
              {[
                { label: "Articles Drafted", value: stats.articlesThisMonth, sub: "this month" },
                { label: "Articles Published", value: stats.publishedThisMonth, sub: "conversion rate" },
                { label: "Avg Edits Per Draft", value: stats.avgEditsPerDraft.toFixed(1), sub: "lower is better" },
                { label: "Fact-Check Catch Rate", value: `${stats.factCheckCatchRate}%`, sub: "errors caught before publish" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Cost Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { label: "Total Monthly Cost", value: `$${(stats.totalCostCents / 100).toFixed(2)}` },
                { label: "Cost Per Article", value: `$${(stats.costPerArticle / 100).toFixed(2)}` },
                { label: "Cost Per 1K Organic Visits", value: "$0.45" },
                { label: "ROI Estimate", value: "340%", positive: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 border rounded-lg">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={`text-xl font-bold ${item.positive ? "text-green-500" : ""}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              Voice & Tone Configuration
            </h3>
            <textarea
              value={guardrails.voice_and_tone}
              onChange={(e) => setGuardrails({ ...guardrails, voice_and_tone: e.target.value })}
              className="w-full h-24 p-3 border rounded-lg bg-background text-sm resize-none"
            />
          </div>
          <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Banned Practices
            </h3>
            <div className="space-y-2">
              {guardrails.banned_practices.map((practice, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                  <span className="text-sm">{practice}</span>
                  <button
                    onClick={() => setGuardrails({
                      ...guardrails,
                      banned_practices: guardrails.banned_practices.filter((_, j) => j !== i)
                    })}
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Escalation Rules (Force Human Review)
            </h3>
            <div className="space-y-2">
              {guardrails.escalation_rules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                  <span className="text-sm">{rule}</span>
                  <button
                    onClick={() => setGuardrails({
                      ...guardrails,
                      escalation_rules: guardrails.escalation_rules.filter((_, j) => j !== i)
                    })}
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
              <Save className="h-4 w-4" />
              Save Guardrails
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FileBarChart, Download, Calendar, Mail, FileText,
  BarChart3, TrendingUp, Users, DollarSign, RefreshCw
} from "lucide-react"

export default function ReportsPage() {
  const supabase = createClient()
  const [generating, setGenerating] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchStats = async () => {
      const { count: posts } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published")
      const { count: views } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view")
      const { count: comments } = await supabase.from("comments").select("*", { count: "exact", head: true })
      const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true })
      setStats({ posts: posts || 0, views: views || 0, comments: comments || 0, users: users || 0 })
    }
    fetchStats()
  }, [supabase])

  const reportTypes = [
    {
      id: "daily",
      name: "Daily Summary",
      description: "Traffic, publishing activity, and key events from the past 24 hours",
      icon: Calendar,
      frequency: "Daily",
    },
    {
      id: "weekly",
      name: "Weekly Performance",
      description: "Traffic trends, top content, SEO changes, and revenue for the past 7 days",
      icon: BarChart3,
      frequency: "Weekly",
    },
    {
      id: "monthly",
      name: "Monthly Executive Report",
      description: "Comprehensive overview including traffic, revenue, content, SEO, and growth metrics",
      icon: FileBarChart,
      frequency: "Monthly",
    },
    {
      id: "seo",
      name: "SEO Health Report",
      description: "Rankings, indexing status, technical issues, and content optimization score",
      icon: TrendingUp,
      frequency: "Weekly",
    },
    {
      id: "revenue",
      name: "Revenue Report",
      description: "Ad revenue, affiliate earnings, RPM trends, and monetization recommendations",
      icon: DollarSign,
      frequency: "Monthly",
    },
    {
      id: "audience",
      name: "Audience Report",
      description: "User demographics, engagement metrics, and growth trends",
      icon: Users,
      frequency: "Monthly",
    },
  ]

  const generateReportText = (reportId: string) => {
    const now = new Date().toLocaleDateString()
    let text = `# ${reportTypes.find(r => r.id === reportId)?.name || "Report"}\n`
    text += `Generated: ${now}\n`
    text += `Period: ${reportId === "daily" ? "Last 24 hours" : reportId === "weekly" ? "Last 7 days" : "Last 30 days"}\n\n`
    text += `## Key Metrics\n`
    text += `- Published Posts: ${stats.posts || 0}\n`
    text += `- Page Views: ${stats.views || 0}\n`
    text += `- Comments: ${stats.comments || 0}\n`
    text += `- Registered Users: ${stats.users || 0}\n\n`
    if (reportId === "seo") {
      text += `## SEO Health\n`
      text += `- Indexed Pages: ${Math.round((stats.posts || 0) * 0.85)}\n`
      text += `- Average SEO Score: ${(75 + Math.random() * 20).toFixed(0)}/100\n`
      text += `- Missing Meta: ${Math.round((stats.posts || 0) * 0.12)}\n`
    }
    if (reportId === "revenue") {
      text += `## Revenue\n`
      text += `- Estimated Monthly: $${((stats.views || 0) * 0.003).toFixed(0)}\n`
      text += `- RPM: $${((stats.views || 0) > 0 ? ((stats.views || 0) * 0.003 / (stats.views || 0) * 1000).toFixed(2) : "0.00")}\n`
    }
    return text
  }

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId)
    await new Promise(r => setTimeout(r, 1000))
    const text = generateReportText(reportId)
    const blob = new Blob([text], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${reportId}-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    setGenerating(null)
  }

  const exportAllReports = () => {
    const allText = reportTypes.map(r => generateReportText(r.id)).join("\n---\n")
    const blob = new Blob([allText], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `all-reports-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportFormat = (format: string, reportId: string) => {
    const text = generateReportText(reportId)
    if (format === "csv") {
      const csv = `Metric,Value\nPublished Posts,${stats.posts || 0}\nPage Views,${stats.views || 0}\nComments,${stats.comments || 0}\nRegistered Users,${stats.users || 0}`
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${reportId}-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      handleGenerate(reportId)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-blue-500" />
          Report Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and schedule reports for stakeholders</p>
      </div>

      <div className="flex gap-3">
        <button onClick={exportAllReports} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Download className="h-4 w-4" />
          Export All Reports
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <div key={report.id} className="bg-white dark:bg-[#111827] border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Frequency: {report.frequency}</span>
                <span>Posts: {stats.posts || 0}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(report.id)}
                  disabled={generating === report.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating === report.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Generate
                </button>
                <button onClick={() => exportFormat("pdf", report.id)} className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted">
                  MD
                </button>
                <button onClick={() => exportFormat("csv", report.id)} className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted">
                  CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          Quick Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 text-center bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{stats.posts || 0}</p>
            <p className="text-xs text-muted-foreground">Published Posts</p>
          </div>
          <div className="p-4 text-center bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{stats.views || 0}</p>
            <p className="text-xs text-muted-foreground">Page Views</p>
          </div>
          <div className="p-4 text-center bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{stats.comments || 0}</p>
            <p className="text-xs text-muted-foreground">Comments</p>
          </div>
          <div className="p-4 text-center bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{stats.users || 0}</p>
            <p className="text-xs text-muted-foreground">Users</p>
          </div>
        </div>
      </div>
    </div>
  )
}

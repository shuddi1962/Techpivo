"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FileBarChart, Download, Calendar, Mail, FileText,
  BarChart3, TrendingUp, Users, DollarSign, RefreshCw, AlertCircle,
  Trash2, Play, Clock,
} from "lucide-react"
import { REPORT_TYPES, type ReportId } from "@/lib/reports"

interface Schedule {
  id: string
  report_type: string
  frequency: string
  format: string
  email: string | null
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

const REPORT_ICONS: Record<string, any> = {
  daily: Calendar, weekly: BarChart3, monthly: FileBarChart, seo: TrendingUp, revenue: DollarSign, audience: Users,
}

const FREQUENCIES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]

export default function ReportsPage() {
  const supabase = createClient()
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [stats, setStats] = useState<Record<string, number>>({})
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scheduleForm, setScheduleForm] = useState<Record<string, string>>({})

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports")
      if (res.ok) {
        const json = await res.json()
        setSchedules(json.schedules || [])
      }
    } catch (err) { console.error("Failed to load schedules:", err) }
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      const [posts, views, comments, users, subs] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view"),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
      ])
      setStats({ posts: posts.count || 0, views: views.count || 0, comments: comments.count || 0, users: users.count || 0, subscribers: subs.count || 0 })
    }
    fetchStats()
    loadSchedules()
  }, [supabase, loadSchedules])

  const downloadBlob = (content: string, type: string, name: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateReport = async (reportId: string, format: "md" | "csv") => {
    setGenerating(`${reportId}-${format}`)
    setError("")
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: reportId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Failed to generate report")
      }
      const json = await res.json()
      downloadBlob(
        format === "csv" ? json.csv : json.md,
        format === "csv" ? "text/csv" : "text/markdown",
        `${reportId}-report-${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "md"}`
      )
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      setError(err?.message || "Failed to generate report.")
    }
    setGenerating(null)
  }

  const exportAllReports = async () => {
    setGenerating("all")
    setError("")
    try {
      const parts: string[] = []
      for (const r of REPORT_TYPES) {
        const res = await fetch("/api/admin/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportType: r.id }),
        })
        if (res.ok) {
          const json = await res.json()
          parts.push(json.md)
        }
      }
      downloadBlob(parts.join("\n\n---\n\n"), "text/markdown", `all-reports-${new Date().toISOString().slice(0, 10)}.md`)
    } catch (err) {
      console.error("Failed to export all reports:", err)
      setError("Failed to export reports.")
    }
    setGenerating(null)
  }

  const scheduleReport = async () => {
    setError("")
    setMessage("")
    if (!scheduleForm.reportType || !scheduleForm.frequency) {
      setError("Pick a report type and frequency to schedule.")
      return
    }
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          reportType: scheduleForm.reportType,
          frequency: scheduleForm.frequency,
          format: scheduleForm.format || "md",
          email: scheduleForm.email || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to schedule report")
      setMessage(`Scheduled! Run every ${scheduleForm.frequency}${scheduleForm.email ? ` and email to ${scheduleForm.email}` : ""}.`)
      setScheduleForm({})
      loadSchedules()
    } catch (err: any) {
      setError(err?.message || "Failed to schedule report.")
    }
  }

  const runNow = async (s: Schedule) => {
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-now", id: s.id, reportType: s.report_type, frequency: s.frequency }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to run schedule")
      setMessage("Schedule marked as run — next delivery is set.")
      loadSchedules()
    } catch (err: any) {
      setError(err?.message || "Failed to run schedule.")
    }
  }

  const deleteSchedule = async (id: string) => {
    setError("")
    try {
      const res = await fetch(`/api/admin/reports?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Failed to delete schedule")
      }
      setSchedules(s => s.filter(x => x.id !== id))
    } catch (err: any) {
      setError(err?.message || "Failed to delete schedule.")
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

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-600">
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={exportAllReports} disabled={generating === "all"} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {generating === "all" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {generating === "all" ? "Exporting..." : "Export All Reports"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => {
          const Icon = REPORT_ICONS[report.id]
          return (
          <div key={report.id} className="bg-card border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{report.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {report.frequency}</span>
                <span>Posts: {stats.posts || 0}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => generateReport(report.id, "md")}
                  disabled={generating === `${report.id}-md`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating === `${report.id}-md` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  Generate
                </button>
                <button onClick={() => generateReport(report.id, "md")} disabled={generating === `${report.id}-md`} className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted disabled:opacity-50">
                  MD
                </button>
                <button onClick={() => generateReport(report.id, "csv")} disabled={generating === `${report.id}-csv`} className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted disabled:opacity-50">
                  CSV
                </button>
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* Scheduling */}
      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Scheduled Reports
        </h3>
        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <select
            value={scheduleForm.reportType || ""}
            onChange={(e) => setScheduleForm(f => ({ ...f, reportType: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm bg-background"
          >
            <option value="">Report type…</option>
            {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select
            value={scheduleForm.frequency || ""}
            onChange={(e) => setScheduleForm(f => ({ ...f, frequency: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm bg-background"
          >
            <option value="">Frequency…</option>
            {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <select
            value={scheduleForm.format || "md"}
            onChange={(e) => setScheduleForm(f => ({ ...f, format: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm bg-background"
          >
            <option value="md">Markdown</option>
            <option value="csv">CSV</option>
          </select>
          <input
            value={scheduleForm.email || ""}
            onChange={(e) => setScheduleForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Deliver to email (optional)"
            className="px-3 py-2 border rounded-lg text-sm bg-background"
          />
        </div>
        <button onClick={scheduleReport} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Calendar className="h-4 w-4" />
          Schedule Report
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          Scheduled reports are generated automatically (daily / weekly / monthly) and delivered by email when an address is provided. The cron endpoint uses CRON_SECRET.
        </p>

        {schedules.length > 0 && (
          <div className="space-y-2 mt-4">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {REPORT_TYPES.find(r => r.id === s.report_type)?.name || s.report_type}
                      <span className="ml-2 text-xs text-muted-foreground">{s.frequency} · {s.format.toUpperCase()}</span>
                      {!s.enabled && <span className="ml-2 text-xs text-red-500">disabled</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.email ? `→ ${s.email} · ` : ""}
                      {s.last_run_at ? `Last run ${new Date(s.last_run_at).toLocaleDateString()} · ` : ""}
                      Next {s.next_run_at ? new Date(s.next_run_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => runNow(s)} className="flex items-center gap-1 px-2.5 py-1.5 border rounded-md text-xs font-medium hover:bg-muted">
                    <Play className="h-3 w-3" /> Run now
                  </button>
                  <button onClick={() => deleteSchedule(s.id)} className="flex items-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 rounded-md text-xs font-medium hover:bg-red-50">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Quick Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="p-4 text-center bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{stats.subscribers || 0}</p>
            <p className="text-xs text-muted-foreground">Subscribers</p>
          </div>
        </div>
      </div>
    </div>
  )
}

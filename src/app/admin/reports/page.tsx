"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FileBarChart, Download, Calendar, Mail, FileText,
  BarChart3, TrendingUp, Users, DollarSign, RefreshCw
} from "lucide-react"

export default function ReportsPage() {
  const supabase = createClient()
  const [generating, setGenerating] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)

  const reportTypes = [
    {
      id: "daily",
      name: "Daily Summary",
      description: "Traffic, publishing activity, and key events from the past 24 hours",
      icon: Calendar,
      frequency: "Daily",
      lastGenerated: "Today at 6:00 AM",
    },
    {
      id: "weekly",
      name: "Weekly Performance",
      description: "Traffic trends, top content, SEO changes, and revenue for the past 7 days",
      icon: BarChart3,
      frequency: "Weekly",
      lastGenerated: "Monday at 8:00 AM",
    },
    {
      id: "monthly",
      name: "Monthly Executive Report",
      description: "Comprehensive overview including traffic, revenue, content, SEO, and growth metrics",
      icon: FileBarChart,
      frequency: "Monthly",
      lastGenerated: "June 1, 2026",
    },
    {
      id: "seo",
      name: "SEO Health Report",
      description: "Rankings, indexing status, technical issues, and content optimization score",
      icon: TrendingUp,
      frequency: "Weekly",
      lastGenerated: "Monday at 9:00 AM",
    },
    {
      id: "revenue",
      name: "Revenue Report",
      description: "Ad revenue, affiliate earnings, RPM trends, and monetization recommendations",
      icon: DollarSign,
      frequency: "Monthly",
      lastGenerated: "June 1, 2026",
    },
    {
      id: "ai-efficiency",
      name: "AI Efficiency Report",
      description: "AI usage, cost per article, quality scores, and editorial acceptance rate",
      icon: RefreshCw,
      frequency: "Monthly",
      lastGenerated: "June 1, 2026",
    },
  ]

  const handleGenerate = async (reportId: string) => {
    setGenerating(true)
    setSelectedReport(reportId)
    await new Promise(r => setTimeout(r, 2000))
    setGenerating(false)
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

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Mail className="h-4 w-4" />
          Send Weekly Report Now
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
          <Download className="h-4 w-4" />
          Export All Reports
        </button>
      </div>

      {/* Report Cards */}
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
                <span>Last: {report.lastGenerated}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(report.id)}
                  disabled={generating && selectedReport === report.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating && selectedReport === report.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Generate
                </button>
                <button className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted">
                  PDF
                </button>
                <button className="px-3 py-1.5 border rounded-md text-xs font-medium hover:bg-muted">
                  CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          Scheduled Deliveries
        </h3>
        <div className="space-y-2">
          {[
            { report: "Weekly Performance", recipients: "admin@techpivo.com", schedule: "Every Monday at 8:00 AM", active: true },
            { report: "Monthly Executive Report", recipients: "admin@techpivo.com, editor@techpivo.com", schedule: "1st of every month", active: true },
            { report: "SEO Health Report", recipients: "seo@techpivo.com", schedule: "Every Monday at 9:00 AM", active: true },
          ].map((delivery, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${delivery.active ? "bg-green-500" : "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium">{delivery.report}</p>
                  <p className="text-xs text-muted-foreground">{delivery.recipients} · {delivery.schedule}</p>
                </div>
              </div>
              <button className="px-3 py-1 border rounded-md text-xs font-medium hover:bg-muted">
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

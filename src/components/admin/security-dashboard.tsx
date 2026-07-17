"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Eye,
  Key, Users, Activity, RefreshCw, Lock,
} from "lucide-react"

interface SecurityMetric {
  label: string
  value: string | number
  status: "good" | "warning" | "danger"
  icon: any
}

export function SecurityDashboard() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState<SecurityMetric[]>([])
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSecurityData = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const dayAgo = new Date(now)
    dayAgo.setDate(dayAgo.getDate() - 1)

    const [sessionsRes, keysRes, usersRes, auditRes, logsRes] = await Promise.all([
      supabase.from("user_sessions").select("id").gte("created_at", dayAgo.toISOString()),
      supabase.from("api_keys").select("id, disabled"),
      supabase.from("user_profiles").select("id"),
      supabase.from("audit_logs").select("id, action").gte("created_at", dayAgo.toISOString()),
      supabase.from("audit_logs").select("id, user_id, action, created_at, details").order("created_at", { ascending: false }).limit(20),
    ])

    const activeSessions = sessionsRes.data?.length || 0
    const totalKeys = keysRes.data?.length || 0
    const activeKeys = keysRes.data?.filter(k => !k.disabled).length || 0
    const totalUsers = usersRes.data?.length || 0
    const dailyActions = auditRes.data?.length || 0

    setMetrics([
      {
        label: "Active Sessions (24h)",
        value: activeSessions,
        status: activeSessions > 50 ? "warning" : "good",
        icon: Eye,
      },
      {
        label: "API Keys",
        value: `${activeKeys}/${totalKeys}`,
        status: totalKeys > 20 ? "warning" : "good",
        icon: Key,
      },
      {
        label: "Total Users",
        value: totalUsers,
        status: "good",
        icon: Users,
      },
      {
        label: "Audit Events (24h)",
        value: dailyActions,
        status: dailyActions > 500 ? "warning" : "good",
        icon: Activity,
      },
    ])

    setRecentEvents(logsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSecurityData() }, [fetchSecurityData])

  const statusIcon = (status: string) => {
    switch (status) {
      case "good": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "danger": return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Shield className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-4 w-4 text-gray-400" />
                {statusIcon(metric.status)}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metric.label}</div>
            </div>
          )
        })}
      </div>

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#F59E0B]" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Security Events</h2>
          </div>
          <button onClick={fetchSecurityData} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
            <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
        ) : recentEvents.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">No events in the last 24 hours</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#374151]">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">User</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event: any) => (
                  <tr key={event.id} className="border-b border-gray-100 dark:border-[#374151] last:border-0">
                    <td className="py-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        event.action?.includes("delete") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : event.action?.includes("create") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : event.action?.includes("login") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {event.action}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-300 text-xs">{event.user_id?.slice(0, 8) || "System"}</td>
                    <td className="py-2 text-gray-400 dark:text-gray-500 text-xs">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

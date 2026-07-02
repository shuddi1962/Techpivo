"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  ScrollText, Filter, Download, RefreshCw, Search,
  ChevronLeft, ChevronRight, User, Clock,
} from "lucide-react"

interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  details: any
  ip_address: string
  created_at: string
}

export function AuditLogViewer() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const limit = 25

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const offset = (page - 1) * limit

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (actionFilter) query = query.eq("action", actionFilter)

    const { data, count } = await query
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const exportLogs = () => {
    const csv = ["ID,User,Action,Resource,Time,IP"].concat(
      logs.map(l => `${l.id},${l.user_id},${l.action},${l.resource_type || ""},${l.created_at},${l.ip_address || ""}`)
    ).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "audit-logs.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const actionColor = (action: string) => {
    if (action?.includes("delete")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (action?.includes("create") || action?.includes("publish")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    if (action?.includes("update") || action?.includes("edit")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    if (action?.includes("login")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <ScrollText className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Audit Logs</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">({total} total)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportLogs} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-[#374151]">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={fetchLogs} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
            <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-700 dark:text-gray-300"
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="create_post">Create Post</option>
          <option value="update_post">Update Post</option>
          <option value="delete_post">Delete Post</option>
          <option value="publish">Publish</option>
          <option value="create_user">Create User</option>
          <option value="update_settings">Update Settings</option>
        </select>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">No audit logs found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#374151]">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">User</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Resource</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Time</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-[#374151] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1F2937]">
                    <td className="py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-600 dark:text-gray-300">{log.user_id?.slice(0, 8) || "—"}</td>
                    <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400">{log.resource_type || "—"}</td>
                    <td className="py-2.5 text-xs text-gray-400 dark:text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5 text-xs text-gray-400 dark:text-gray-500">{log.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-[#374151]">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

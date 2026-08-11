"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, ExternalLink, Power, PowerOff, Activity, Hash, Check, Loader2, Pencil, Trash2, Plus } from "lucide-react"
import { ToolView, getToolDef } from "@/lib/tools"
import { TOOL_CATEGORY_LABEL } from "@/lib/tools-metadata"
import ToolEditModal, { EditableTool } from "@/components/admin/tool-edit-modal"

interface DbTool {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  icon: string | null
  is_active: boolean
  is_ai_tool: boolean
  usage_count: number
  meta_title: string | null
  meta_description: string | null
  api_endpoint: string | null
  created_at: string
  updated_at: string
}

interface UsageRow {
  id: string
  user_ip: string | null
  country: string | null
  created_at: string
}

export default function ToolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const supabase = createClient()
  const def = getToolDef(slug)

  const [dbTool, setDbTool] = useState<DbTool | null>(null)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTool = useCallback(async () => {
    const { data } = await supabase.from("tools").select("*").eq("slug", slug).maybeSingle()
    if (data) setDbTool(data as DbTool)
  }, [supabase, slug])

  const fetchUsage = useCallback(async () => {
    const { data } = await supabase
      .from("tool_usage")
      .select("id, user_ip, country, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
    setUsage((data as UsageRow[]) || [])
  }, [supabase])

  useEffect(() => {
    fetchTool()
    fetchUsage()
    const channel = supabase
      .channel(`admin_tool_${slug}_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tools", filter: `slug=eq.${slug}` }, () => fetchTool())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tool_usage" }, () => fetchUsage())
      .subscribe()
    channelRef.current = channel
    const poll = setInterval(() => {
      fetchTool()
      fetchUsage()
    }, 30000)
    const onFocus = () => {
      fetchTool()
      fetchUsage()
    }
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, fetchTool, fetchUsage, slug])

  const postAction = async (body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/admin/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data?.error || res.statusText }
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" }
    }
  }

  const toggleActive = async () => {
    if (!dbTool) return
    setBusy(true)
    setError("")
    const res = await postAction({ slug, is_active: !dbTool.is_active })
    if (!res.ok) setError(res.error || "Update failed")
    setBusy(false)
  }

  const seed = async () => {
    setBusy(true)
    setError("")
    const res = await postAction({ action: "seed", slug })
    if (!res.ok) setError(res.error || "Seed failed")
    setBusy(false)
  }

  const doDelete = async () => {
    setBusy(true)
    setError("")
    const res = await postAction({ action: "delete", slug })
    if (!res.ok) {
      setError(res.error || "Delete failed")
      setConfirmingDelete(false)
      setBusy(false)
      return
    }
    router.push("/admin/tools")
  }

  if (!def) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Tool Not Found</h1>
        <p className="text-muted-foreground mt-2">The tool &quot;{slug}&quot; is not in the registry</p>
        <Link href="/admin/tools" className="inline-flex items-center gap-1 mt-4 text-[#F59E0B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Tools
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{def.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {TOOL_CATEGORY_LABEL[def.category]} · /tools/{slug}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/tools/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#374151] text-gray-500 hover:text-[#F59E0B] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View on site
          </Link>
          {dbTool && !dbTool.is_active && (
            <button
              onClick={toggleActive}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
              Activate
            </button>
          )}
          {dbTool && dbTool.is_active && (
            <button
              onClick={toggleActive}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
              Deactivate
            </button>
          )}
          {!dbTool && (
            <button
              onClick={seed}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Seed into database
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#374151] text-gray-500 hover:text-[#F59E0B] transition-colors disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          {dbTool && (
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">{error}</div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Activity className="h-4 w-4 text-blue-500" /> Usage
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {(dbTool?.usage_count ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">lifetime uses (bumped on open)</div>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Hash className="h-4 w-4 text-purple-500" /> Status
          </div>
          <div className={`text-2xl font-bold mt-1 ${dbTool ? (dbTool.is_active ? "text-green-500" : "text-red-500") : "text-gray-400"}`}>
            {dbTool ? (dbTool.is_active ? "Active" : "Inactive") : "Not seeded"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {dbTool ? (dbTool.is_ai_tool ? "AI tool · " : "") + "row exists in tools table" : "click Seed into database to make it live"}
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ExternalLink className="h-4 w-4 text-green-500" /> SEO overrides
          </div>
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {dbTool?.meta_title || <span className="text-gray-400">Meta title: (registry default)</span>}
          </div>
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {dbTool?.meta_description || <span className="text-gray-400">Meta description: (registry default)</span>}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="mt-2 text-xs font-semibold text-[#F59E0B] hover:underline"
          >
            Edit SEO fields →
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Live Tool</h2>
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-6">
          <ToolView slug={slug} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Recent Usage</h2>
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl overflow-hidden">
          {usage.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No usage yet — usage is tracked when someone opens the tool.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F2937]">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">IP</th>
                  <th className="px-4 py-2.5">Country</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 dark:border-[#1F2937] last:border-0">
                    <td className="px-4 py-2 text-gray-900 dark:text-white">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{row.user_ip || "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{row.country || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && dbTool && (
        <ToolEditModal
          tool={{
            slug: dbTool.slug,
            name: dbTool.name,
            description: dbTool.description || "",
            category: dbTool.category,
            icon: dbTool.icon || "",
            is_ai_tool: dbTool.is_ai_tool,
            meta_title: dbTool.meta_title || "",
            meta_description: dbTool.meta_description || "",
            api_endpoint: dbTool.api_endpoint || "",
          }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            fetchTool()
          }}
        />
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24" style={{ background: "rgba(15,23,42,.55)" }}>
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-2xl shadow-2xl p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete &quot;{def.name}&quot;?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              The database row will be removed and the tool will become unavailable on the live site. This cannot be
              undone — use Seed to bring it back.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#374151] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937]"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
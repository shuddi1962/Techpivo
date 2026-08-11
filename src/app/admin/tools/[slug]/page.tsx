"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, ExternalLink, Power, PowerOff, Activity, Hash, Check, Loader2 } from "lucide-react"
import { ToolView, getToolDef } from "@/lib/tools"
import { TOOL_CATEGORY_LABEL } from "@/lib/tools-metadata"

interface DbTool {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  is_active: boolean
  is_ai_tool: boolean
  usage_count: number
  meta_title: string | null
  meta_description: string | null
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
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDesc, setMetaDesc] = useState("")
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTool = useCallback(async () => {
    const { data } = await supabase.from("tools").select("*").eq("slug", slug).maybeSingle()
    if (data) {
      setDbTool(data as DbTool)
      setMetaTitle((data as DbTool).meta_title || "")
      setMetaDesc((data as DbTool).meta_description || "")
    }
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

  const toggleActive = async () => {
    if (!dbTool) return
    setBusy(true)
    setError("")
    const { error: updateError } = await supabase.from("tools").update({ is_active: !dbTool.is_active }).eq("slug", slug)
    if (updateError) setError(updateError.message)
    else fetchTool()
    setBusy(false)
  }

  const saveMeta = async () => {
    if (!dbTool) return
    setSaving(true)
    setError("")
    setSaved(false)
    const { error: updateError } = await supabase
      .from("tools")
      .update({ meta_title: metaTitle || null, meta_description: metaDesc || null })
      .eq("slug", slug)
    if (updateError) setError(updateError.message)
    else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
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
          {dbTool && (
            <button
              onClick={toggleActive}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                dbTool.is_active
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : dbTool.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              {dbTool.is_active ? "Deactivate" : "Activate"}
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
            {dbTool ? (dbTool.is_ai_tool ? "AI tool · " : "") + "row exists in tools table" : "run migration 050 to seed"}
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ExternalLink className="h-4 w-4 text-green-500" /> SEO
          </div>
          <div className="mt-1 space-y-1">
            <input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Meta title (optional)"
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded text-gray-900 dark:text-white"
            />
            <input
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              placeholder="Meta description (optional)"
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded text-gray-900 dark:text-white"
            />
            <button
              onClick={saveMeta}
              disabled={saving || !dbTool}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : null}
              {saved ? "Saved" : "Save override"}
            </button>
          </div>
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
    </div>
  )
}
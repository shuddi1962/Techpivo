"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Search, Wrench, Power, PowerOff, ExternalLink, Activity, Cpu, Layers } from "lucide-react"
import { TOOL_LIST, getToolDef } from "@/lib/tools"
import { TOOL_CATEGORY_LABEL, ToolCategory } from "@/lib/tools-metadata"

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
  created_at: string
  updated_at: string
}

function dbToRegistryCat(dbCat: string): ToolCategory {
  if (dbCat === "networking") return "network"
  const known: ToolCategory[] = ["developer", "security", "network", "seo", "image", "pdf", "calculator", "ai"]
  return known.includes(dbCat as ToolCategory) ? (dbCat as ToolCategory) : "developer"
}

export default function ToolsAdminPage() {
  const supabase = createClient()
  const [dbTools, setDbTools] = useState<DbTool[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [busySlug, setBusySlug] = useState("")
  const [error, setError] = useState("")
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTools = useCallback(async () => {
    const { data } = await supabase
      .from("tools")
      .select("*")
      .order("name", { ascending: true })
    if (data) setDbTools(data as DbTool[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTools()
    const channel = supabase
      .channel(`admin_tools_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tools" }, () => fetchTools())
      .subscribe()
    channelRef.current = channel
    const poll = setInterval(() => fetchTools(), 30000)
    const onFocus = () => fetchTools()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, fetchTools])

  const toggleActive = async (tool: DbTool) => {
    setBusySlug(tool.slug)
    setError("")
    try {
      const res = await fetch("/api/admin/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: tool.slug, is_active: !tool.is_active }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(`Failed to update "${tool.name}": ${data?.error || res.statusText}`)
      } else {
        setDbTools((prev) => prev.map((t) => (t.slug === tool.slug ? { ...t, is_active: !!data.tool?.is_active } : t)))
        fetchTools()
      }
    } catch (e: any) {
      setError(`Failed to update "${tool.name}": ${e?.message || "Network error"}`)
    }
    setBusySlug("")
  }

  const knownSlugs = new Set(TOOL_LIST.map((t) => t.slug))
  const dbOnly = dbTools.filter((t) => !knownSlugs.has(t.slug))
  const registryOnly = TOOL_LIST.filter((t) => !dbTools.some((d) => d.slug === t.slug))

  const merged = TOOL_LIST.map((t) => {
    const db = dbTools.find((d) => d.slug === t.slug)
    return {
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      is_active: db ? db.is_active : true,
      is_ai_tool: db ? db.is_ai_tool : false,
      usage_count: db ? db.usage_count : 0,
      inDb: !!db,
    }
  })

  const categories = ["All", ...Array.from(new Set(merged.map((t) => TOOL_CATEGORY_LABEL[t.category])))]

  const filtered = merged.filter((t) => {
    const cat = TOOL_CATEGORY_LABEL[t.category]
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === "All" || cat === category
    return matchSearch && matchCat
  })

  const totalUsage = merged.reduce((sum, t) => sum + t.usage_count, 0)
  const activeCount = merged.filter((t) => t.is_active).length
  const aiCount = merged.filter((t) => t.is_ai_tool).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tools &amp; Utilities</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {TOOL_LIST.length} tools in the registry · {dbTools.length} in database · LIVE
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE · realtime + 30s poll
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active tools", value: activeCount, icon: Power, color: "text-green-500" },
          { label: "Inactive", value: merged.length - activeCount, icon: PowerOff, color: "text-red-500" },
          { label: "Total usage", value: totalUsage.toLocaleString(), icon: Activity, color: "text-blue-500" },
          { label: "AI tools", value: aiCount, icon: Cpu, color: "text-purple-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-4">
            <div className="flex items-center gap-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                category === cat
                  ? "bg-[#F59E0B] text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-gray-200 dark:border-[#374151]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900">{error}</div>
      )}

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tool) => {
            const def = getToolDef(tool.slug)
            const Icon = def ? def.icon : Layers
            return (
              <div
                key={tool.slug}
                className={`bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-xl p-5 transition-all group ${
                  tool.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg bg-gray-50 dark:bg-[#1F2937] ${tool.is_active ? "text-blue-500" : "text-gray-400"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{tool.name}</h3>
                      {!tool.inDb && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          not seeded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{tool.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937]">
                        {TOOL_CATEGORY_LABEL[tool.category]}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937]">
                        {tool.usage_count.toLocaleString()} uses
                      </span>
                      {tool.is_ai_tool && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          AI
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          tool.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {tool.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={`/admin/tools/${tool.slug}`}
                    className="flex-1 text-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors"
                  >
                    Open
                  </Link>
                  <Link
                    href={`/tools/${tool.slug}`}
                    target="_blank"
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-[#374151] text-gray-500 hover:text-[#F59E0B] transition-colors"
                    title="View on site"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  {tool.inDb && tool.is_active && (
                    <button
                      onClick={() => toggleActive({ ...tool, id: "", name: tool.name, description: tool.description, category: tool.category, icon: null, usage_count: tool.usage_count, is_active: tool.is_active, is_ai_tool: tool.is_ai_tool, meta_title: null, meta_description: null, created_at: "", updated_at: "" } as DbTool)}
                      disabled={busySlug === tool.slug}
                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Deactivate tool"
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {tool.inDb && !tool.is_active && (
                    <button
                      onClick={() => toggleActive({ ...tool, id: "", name: tool.name, description: tool.description, category: tool.category, icon: null, usage_count: tool.usage_count, is_active: tool.is_active, is_ai_tool: tool.is_ai_tool, meta_title: null, meta_description: null, created_at: "", updated_at: "" } as DbTool)}
                      disabled={busySlug === tool.slug}
                      className="p-1.5 rounded-lg border border-green-200 dark:border-green-900 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                      title="Activate tool"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-400">
          <Wrench className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No tools found matching &quot;{search}&quot;</p>
        </div>
      )}

      {(dbOnly.length > 0 || registryOnly.length > 0) && (
        <div className="text-xs text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
          {dbOnly.length > 0 && (
            <p>
              In database but not in registry (no UI component):{" "}
              {dbOnly.map((t) => (
                <span key={t.slug} className="font-mono">{t.slug}</span>
              )).reduce<any>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
            </p>
          )}
          {registryOnly.length > 0 && (
            <p className={dbOnly.length > 0 ? "mt-1" : ""}>
              In registry but not seeded in database:{" "}
              {registryOnly.map((t) => (
                <span key={t.slug} className="font-mono">{t.slug}</span>
              )).reduce<any>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
            </p>
          )}
          <p className="mt-1">Run migration 050 to seed new tools and deactivate removed ones. Tool toggles require the admin role (RLS).</p>
        </div>
      )}
    </div>
  )
}
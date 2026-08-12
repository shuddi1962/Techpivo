"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { renderMarkdown } from "@/lib/markdown"
import { SITE_BLOCKS, type SiteBlockDef } from "@/lib/site-blocks"
import { ArrowLeft, Check, Loader2, RotateCcw, Save, Eye } from "lucide-react"

interface DbBlock {
  block_key: string
  title: string | null
  content_md: string | null
  is_active: boolean
  updated_at: string | null
}

const MODE_LABELS: Record<string, string> = {
  banner: "Announcement strip (top of every page)",
  intro: "Content band (homepage)",
  text: "Text block (footer)",
  links: "Link list (footer)",
}

export default function SiteBlocksAdminPage() {
  const supabase = createClient()
  const [db, setDb] = useState<Record<string, DbBlock>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [edits, setEdits] = useState<Record<string, { content: string; dirty: boolean }>>({})
  const [saveStates, setSaveStates] = useState<Record<string, "" | "saving" | "saved" | "error">>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchBlocks = useCallback(async () => {
    const { data } = await supabase.from("site_blocks").select("*").order("block_key")
    const map: Record<string, DbBlock> = {}
    if (data) for (const row of data as DbBlock[]) map[row.block_key] = row
    setDb(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchBlocks()
    const channel = supabase
      .channel(`admin_site_blocks_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_blocks" }, () => fetchBlocks())
      .subscribe()
    channelRef.current = channel
    const poll = setInterval(() => fetchBlocks(), 30000)
    const onFocus = () => fetchBlocks()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, fetchBlocks])

  const postAction = async (body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> => {
    try {
      const res = await fetch("/api/admin/site-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data?.error || res.statusText }
      return { ok: true, data }
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" }
    }
  }

  const saveBlock = async (blockKey: string, active: boolean) => {
    const content = edits[blockKey]?.content ?? db[blockKey]?.content_md ?? ""
    const def = SITE_BLOCKS.find((b) => b.blockKey === blockKey)
    const title = db[blockKey]?.title ?? def?.label ?? undefined
    setSaveStates((s) => ({ ...s, [blockKey]: "saving" }))
    const res = await postAction({
      action: "upsert",
      block_key: blockKey,
      title,
      content_md: content,
      is_active: active,
    })
    if (!res.ok) {
      setSaveStates((s) => ({ ...s, [blockKey]: "error" }))
      setError(`Failed to save block: ${res.error}`)
      return
    }
    setSaveStates((s) => ({ ...s, [blockKey]: "saved" }))
    setEdits((e) => ({ ...e, [blockKey]: { content, dirty: false } }))
    fetchBlocks()
    setTimeout(() => setSaveStates((s) => ({ ...s, [blockKey]: "" })), 2500)
  }

  const handleChange = (blockKey: string, value: string) => {
    setEdits((e) => ({ ...e, [blockKey]: { content: value, dirty: true } }))
    setSaveStates((s) => ({ ...s, [blockKey]: "" }))
    if (timers.current[blockKey]) clearTimeout(timers.current[blockKey])
    timers.current[blockKey] = setTimeout(() => saveBlock(blockKey, db[blockKey]?.is_active ?? true), 800)
  }

  const toggleActive = async (block: SiteBlockDef) => {
    const active = db[block.blockKey]?.is_active ?? true
    if (!db[block.blockKey]) {
      await saveBlock(block.blockKey, !active)
      return
    }
    const res = await postAction({ action: "toggle", block_key: block.blockKey, is_active: !active })
    if (!res.ok) {
      setError(`Failed to update block: ${res.error}`)
      return
    }
    fetchBlocks()
  }

  const resetBlock = async (blockKey: string) => {
    if (!window.confirm(`Reset "${blockKey}" to defaults? The block will be hidden until you save new content.`)) return
    const res = await postAction({ action: "reset", block_key: blockKey })
    if (!res.ok) {
      setError(`Failed to reset block: ${res.error}`)
      return
    }
    setEdits((e) => ({ ...e, [blockKey]: { content: "", dirty: false } }))
    fetchBlocks()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="w-4 h-4" /> Back to Pages
          </Link>
          <h1 className="text-2xl font-bold">Site Blocks</h1>
          <p className="text-sm text-muted-foreground">
            Editable content blocks for the homepage, header and footer. Changes go live the moment you stop typing.
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
          LIVE · realtime
        </span>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading blocks…</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {SITE_BLOCKS.map((block) => {
            const row = db[block.blockKey]
            const content = edits[block.blockKey]?.content ?? row?.content_md ?? block.contentMd
            const active = row?.is_active ?? true
            const hasRow = !!row
            const preview = renderMarkdown(content)
            return (
              <div key={block.blockKey} className="bg-card border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-semibold">{block.label}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{block.description}</p>
                    <span className="text-[11px] text-muted-foreground mt-1 inline-block">
                      {MODE_LABELS[block.mode] || block.mode} · key: <code className="bg-muted px-1 rounded">{block.blockKey}</code>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {saveStates[block.blockKey] === "saving" && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>
                    )}
                    {saveStates[block.blockKey] === "saved" && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600"><Check className="w-3 h-3" /> Saved</span>
                    )}
                    {saveStates[block.blockKey] === "error" && <span className="text-xs text-red-600">Failed</span>}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleActive(block)}
                        className="accent-green-600"
                      />
                      Active
                    </label>
                    {hasRow && (
                      <button
                        onClick={() => resetBlock(block.blockKey)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
                        title="Reset to defaults"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => handleChange(block.blockKey, e.target.value)}
                  rows={block.mode === "banner" ? 2 : 6}
                  placeholder="Leave empty to hide this block…"
                  className="w-full bg-background border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
                />
                {edits[block.blockKey]?.dirty && <span className="text-xs text-amber-600">· unsaved changes</span>}

                {content.trim() !== "" && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </div>
                    <div
                      className="border rounded-lg bg-background px-4 py-3 prose prose-slate dark:prose-invert max-w-none prose-sm prose-a:text-accent prose-p:text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => saveBlock(block.blockKey, active)}
                    className="inline-flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                    disabled={saveStates[block.blockKey] === "saving"}
                  >
                    <Save className="w-4 h-4" /> Save {hasRow ? "" : "(publish)"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Blocks are hidden until you save content for them. The header banner appears above the header, the homepage intro sits below the hero slider, and footer blocks render in the footer columns.
      </p>
    </div>
  )
}
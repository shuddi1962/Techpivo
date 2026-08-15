"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { renderMarkdown } from "@/lib/markdown"
import { SITE_BLOCKS, normalizeBlockStyle, type SiteBlockDef, type SiteBlockStyle } from "@/lib/site-blocks"
import {
  ArrowLeft, Check, Eraser, LayoutTemplate, Loader2, Megaphone, Palette, RotateCcw, Save, Sparkles,
} from "lucide-react"

interface DbBlock {
  block_key: string
  title: string | null
  content_md: string | null
  is_active: boolean
  style: SiteBlockStyle | null
  updated_at: string | null
}

const MODE_LABELS: Record<string, { label: string; hint: string }> = {
  banner: { label: "Announcement strip", hint: "Top of every page" },
  intro: { label: "Content band", hint: "Homepage" },
  text: { label: "Text block", hint: "Footer" },
  links: { label: "Link list", hint: "Footer" },
}

const VARIANT_LABELS: Record<string, string> = {
  ticker: "Moving ticker",
  blinkbg: "Blinking background",
  solid: "Colored strip",
}

export default function SiteBlocksAdminPage() {
  const supabase = createClient()
  const [db, setDb] = useState<Record<string, DbBlock>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [edits, setEdits] = useState<Record<string, { content: string; dirty: boolean }>>({})
  const [styles, setStyles] = useState<Record<string, SiteBlockStyle>>({})
  const [saveStates, setSaveStates] = useState<Record<string, "" | "saving" | "saved" | "error">>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const stylesRef = useRef<Record<string, SiteBlockStyle>>({})
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchBlocks = useCallback(async () => {
    const { data } = await supabase.from("site_blocks").select("*").order("block_key")
    const map: Record<string, DbBlock> = {}
    if (data) for (const row of data as DbBlock[]) map[row.block_key] = row
    setDb(map)
    const normalized: Record<string, SiteBlockStyle> = {}
    for (const b of SITE_BLOCKS) normalized[b.blockKey] = normalizeBlockStyle(map[b.blockKey]?.style)
    stylesRef.current = normalized
    setStyles(normalized)
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
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      const res = await fetch("/api/admin/site-blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data?.error || res.statusText }
      return { ok: true, data }
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" }
    }
  }

  const saveBlock = async (blockKey: string, active: boolean, contentOverride?: string, styleOverride?: SiteBlockStyle) => {
    const content = contentOverride !== undefined ? contentOverride : (edits[blockKey]?.content ?? db[blockKey]?.content_md ?? "")
    const style = styleOverride ?? styles[blockKey]
    const def = SITE_BLOCKS.find((b) => b.blockKey === blockKey)
    const title = db[blockKey]?.title ?? def?.label ?? undefined
    setSaveStates((s) => ({ ...s, [blockKey]: "saving" }))
    const res = await postAction({
      action: "upsert",
      block_key: blockKey,
      title,
      content_md: content,
      style,
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

  const updateStyle = (blockKey: string, patch: Partial<SiteBlockStyle>) => {
    const next = { ...(stylesRef.current[blockKey] || {}), ...patch }
    stylesRef.current = { ...stylesRef.current, [blockKey]: next }
    setStyles(stylesRef.current)
    if (timers.current[blockKey]) clearTimeout(timers.current[blockKey])
    timers.current[blockKey] = setTimeout(() => saveBlock(blockKey, db[blockKey]?.is_active ?? true, undefined, next), 400)
  }

  const handleChange = (blockKey: string, value: string) => {
    setEdits((e) => ({ ...e, [blockKey]: { content: value, dirty: true } }))
    setSaveStates((s) => ({ ...s, [blockKey]: "" }))
    if (timers.current[blockKey]) clearTimeout(timers.current[blockKey])
    timers.current[blockKey] = setTimeout(() => saveBlock(blockKey, db[blockKey]?.is_active ?? true, value), 800)
  }

  const flushSave = (blockKey: string) => {
    if (timers.current[blockKey]) {
      clearTimeout(timers.current[blockKey])
      delete timers.current[blockKey]
    }
    if (edits[blockKey]?.dirty) saveBlock(blockKey, db[blockKey]?.is_active ?? true, edits[blockKey].content)
  }

  const clearBlock = async (blockKey: string) => {
    if (!window.confirm(`Clear "${blockKey}" content? The block will be hidden on the site until you add new content.`)) return
    if (timers.current[blockKey]) {
      clearTimeout(timers.current[blockKey])
      delete timers.current[blockKey]
    }
    setEdits((e) => ({ ...e, [blockKey]: { content: "", dirty: false } }))
    await saveBlock(blockKey, db[blockKey]?.is_active ?? true, "")
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

  const activeCount = SITE_BLOCKS.filter((b) => db[b.blockKey]?.is_active ?? true).length
  const bannerVariant = (blockKey: string) => styles[blockKey]?.variant || "ticker"

  function MiniPreview({ block, content, style }: { block: SiteBlockDef; content: string; style: SiteBlockStyle }) {
    if (!content.trim()) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/30 py-5 text-center text-[11px] text-muted-foreground">
          Empty block — hidden on the site until you add content.
        </div>
      )
    }
    const text = content.replace(/[#*`>[\]|_-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120)
    if (block.mode === "banner" && style.variant === "ticker") {
      return (
        <div className="relative rounded-lg overflow-hidden border bg-slate-950 text-white text-xs py-2.5 px-3 flex items-center gap-2">
          <span className="shrink-0 rounded bg-red-600 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider animate-pulse">
            {style.label || "NEW"}
          </span>
          <span className="truncate text-white/85">{text}</span>
        </div>
      )
    }
    if (block.mode === "banner" && style.variant === "blinkbg") {
      return (
        <div
          className={`rounded-lg border text-xs px-3 py-2.5 font-medium ${style.blink ? "animate-pulse" : ""}`}
          style={{ backgroundColor: style.bg ?? "#f59e0b", color: style.text ?? "#ffffff" }}
        >
          {text}
        </div>
      )
    }
    if (block.mode === "banner" && style.variant === "solid") {
      return (
        <div
          className="rounded-lg border text-xs px-3 py-2.5 font-medium"
          style={{ backgroundColor: style.bg ?? "#0ea5e9", color: style.text ?? "#ffffff" }}
        >
          {text}
        </div>
      )
    }
    if (block.mode === "intro") {
      return (
        <div
          className="rounded-lg border px-4 py-4"
          style={{ backgroundColor: style.bg ?? "#fef3c7", color: style.text ?? "#1e293b", textAlign: style.align ?? "left" }}
        >
          <p className="text-[11px] font-semibold opacity-70 mb-0.5">Homepage intro band</p>
          <p className="text-xs">{text}</p>
        </div>
      )
    }
    return (
      <div className="rounded-lg border bg-background px-3 py-2.5 text-[11px] text-muted-foreground">
        <p className="font-semibold text-foreground mb-0.5">{block.label} — {MODE_LABELS[block.mode]?.label}</p>
        {text || <span className="italic">No content</span>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero band */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] text-white p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.2),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
                <Sparkles className="w-3 h-3 text-amber-300" /> Site Blocks Studio
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[11px] font-medium text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                LIVE · realtime
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2.5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                <LayoutTemplate className="h-5 w-5 text-amber-300" />
              </span>
              Site Blocks
            </h1>
            <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
              Editable content blocks for the homepage, header and footer — ticker banners, intro bands and footer
              columns. Changes go live the moment you stop typing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] text-white/60 uppercase tracking-wide mb-0.5">Blocks</p>
              <p className="text-2xl font-bold tabular-nums">{SITE_BLOCKS.length}</p>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-white/70"><Check className="w-3.5 h-3.5 text-emerald-400" /> Active</span>
                <span className="text-sm font-bold tabular-nums">{activeCount}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-white/70"><Eraser className="w-3.5 h-3.5 text-sky-300" /> Hidden</span>
                <span className="text-sm font-bold tabular-nums">{SITE_BLOCKS.length - activeCount}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-950 text-sm font-semibold px-4 py-2 shadow-lg shadow-black/20 hover:bg-amber-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Pages
          </Link>
          <span className="text-xs text-white/60">
            Blocks are hidden until you save content — the header banner sits above the header, the homepage intro below
            the hero, footer blocks in the footer columns.
          </span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl border bg-card" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {SITE_BLOCKS.map((block) => {
            const row = db[block.blockKey]
            const content = edits[block.blockKey]?.content ?? row?.content_md ?? block.contentMd
            const active = row?.is_active ?? true
            const hasRow = !!row
            const preview = renderMarkdown(content)
            const mode = MODE_LABELS[block.mode]
            return (
              <div key={block.blockKey} className="bg-card border rounded-xl overflow-hidden flex flex-col">
                {/* Card header */}
                <div className="border-b bg-muted/20 px-5 py-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] text-white shrink-0">
                      <Megaphone className="h-4 w-4 text-amber-300" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold truncate">{block.label}</h2>
                        <span className="shrink-0 rounded-full bg-accent/10 text-accent text-[10px] font-semibold px-2 py-0.5 border border-accent/20">
                          {mode?.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{block.description} · {mode?.hint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {saveStates[block.blockKey] === "saving" && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>
                    )}
                    {saveStates[block.blockKey] === "saved" && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><Check className="w-3 h-3" /> Saved</span>
                    )}
                    {saveStates[block.blockKey] === "error" && <span className="text-xs text-red-600">Failed</span>}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleActive(block)}
                        className="accent-emerald-600 w-3.5 h-3.5"
                      />
                      Active
                    </label>
                    {hasRow && (
                      <button
                        onClick={() => resetBlock(block.blockKey)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Reset to defaults"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => clearBlock(block.blockKey)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Clear content (hides the block on the site)"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1">
                  {/* Live mini preview */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      <Sparkles className="w-3 h-3 text-accent" /> Style preview
                    </div>
                    <MiniPreview block={block} content={content} style={styles[block.blockKey] || { variant: "ticker" } as SiteBlockStyle} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Content <span className="text-muted-foreground font-normal">(Markdown)</span></label>
                    <textarea
                      value={content}
                      onChange={(e) => handleChange(block.blockKey, e.target.value)}
                      onBlur={() => flushSave(block.blockKey)}
                      rows={block.mode === "banner" ? 2 : 5}
                      placeholder="Leave empty to hide this block…"
                      className="w-full bg-background border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
                    />
                    {edits[block.blockKey]?.dirty && <span className="text-[11px] text-amber-600">· unsaved changes</span>}
                  </div>

                  {block.mode === "banner" && (
                    <div className="border rounded-lg bg-muted/20 p-3.5 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Palette className="w-3.5 h-3.5 text-accent" /> Banner style
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Variant</span>
                          <select
                            value={styles[block.blockKey]?.variant}
                            onChange={(e) => updateStyle(block.blockKey, { variant: e.target.value as any })}
                            className="bg-background border rounded-md px-2 py-1.5"
                          >
                            <option value="ticker">Moving ticker</option>
                            <option value="blinkbg">Blinking background</option>
                            <option value="solid">Colored strip</option>
                          </select>
                        </label>
                        {(styles[block.blockKey]?.variant === "ticker" || styles[block.blockKey]?.variant === "blinkbg") && (
                          <label className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Label</span>
                            <input
                              type="text"
                              value={styles[block.blockKey]?.label ?? ""}
                              placeholder="NEW"
                              maxLength={24}
                              onChange={(e) => updateStyle(block.blockKey, { label: e.target.value || null })}
                              className="bg-background border rounded-md px-2 py-1.5"
                            />
                          </label>
                        )}
                        {styles[block.blockKey]?.variant === "ticker" && (
                          <label className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Speed</span>
                            <select
                              value={styles[block.blockKey]?.speed}
                              onChange={(e) => updateStyle(block.blockKey, { speed: e.target.value as any })}
                              className="bg-background border rounded-md px-2 py-1.5"
                            >
                              <option value="slow">Slow</option>
                              <option value="normal">Normal</option>
                              <option value="fast">Fast</option>
                            </select>
                          </label>
                        )}
                        {(styles[block.blockKey]?.variant === "blinkbg" || styles[block.blockKey]?.variant === "solid") && (
                          <label className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Background</span>
                            <input
                              type="color"
                              value={styles[block.blockKey]?.bg ?? "#f59e0b"}
                              onChange={(e) => updateStyle(block.blockKey, { bg: e.target.value })}
                              className="h-8 w-full cursor-pointer bg-background border rounded-md p-0.5"
                            />
                          </label>
                        )}
                        {(styles[block.blockKey]?.variant === "blinkbg" || styles[block.blockKey]?.variant === "solid") && (
                          <label className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Text</span>
                            <input
                              type="color"
                              value={styles[block.blockKey]?.text ?? "#ffffff"}
                              onChange={(e) => updateStyle(block.blockKey, { text: e.target.value })}
                              className="h-8 w-full cursor-pointer bg-background border rounded-md p-0.5"
                            />
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 text-muted-foreground pt-5">
                          <input
                            type="checkbox"
                            checked={styles[block.blockKey]?.blink ?? false}
                            onChange={(e) => updateStyle(block.blockKey, { blink: e.target.checked })}
                            className="accent-emerald-600"
                          />
                          Blinking
                        </label>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Active variant: <span className="font-semibold text-foreground">{VARIANT_LABELS[bannerVariant(block.blockKey)]}</span>
                      </p>
                    </div>
                  )}

                  {block.mode === "intro" && (
                    <div className="border rounded-lg bg-muted/20 p-3.5 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Palette className="w-3.5 h-3.5 text-accent" /> Intro style
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Text alignment</span>
                          <select
                            value={styles[block.blockKey]?.align}
                            onChange={(e) => updateStyle(block.blockKey, { align: e.target.value as any })}
                            className="bg-background border rounded-md px-2 py-1.5"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Background</span>
                          <input
                            type="color"
                            value={styles[block.blockKey]?.bg ?? "#fef3c7"}
                            onChange={(e) => updateStyle(block.blockKey, { bg: e.target.value })}
                            className="h-8 w-full cursor-pointer bg-background border rounded-md p-0.5"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Text</span>
                          <input
                            type="color"
                            value={styles[block.blockKey]?.text ?? "#1e293b"}
                            onChange={(e) => updateStyle(block.blockKey, { text: e.target.value })}
                            className="h-8 w-full cursor-pointer bg-background border rounded-md p-0.5"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {content.trim() !== "" && block.mode !== "banner" && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        <Sparkles className="w-3 h-3 text-accent" /> Markdown preview
                      </div>
                      <div
                        className="border rounded-lg bg-background px-4 py-3 prose prose-slate dark:prose-invert max-w-none prose-sm prose-a:text-accent prose-p:text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: preview }}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t bg-muted/20 px-5 py-3 flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">
                    key: <code className="bg-background border rounded px-1 py-0.5">{block.blockKey}</code>
                    {row?.updated_at && <> · updated {new Date(row.updated_at).toLocaleString()}</>}
                  </span>
                  <button
                    onClick={() => saveBlock(block.blockKey, active)}
                    className="inline-flex items-center gap-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
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
    </div>
  )
}

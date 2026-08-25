"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getSitePage } from "@/lib/pages"
import { renderMarkdown } from "@/lib/markdown"
import { sanitizeHtml, preserveHtml } from "@/lib/sanitize"
import {
  ArrowLeft, Check, ExternalLink, Eye, ImagePlus, LayoutPanelLeft, Loader2, Palette, RotateCcw, Save, Search, Trash2, Wand2,
} from "lucide-react"
import type { DesignSettings } from "@/lib/pages"

interface DbPage {
  slug: string
  title: string | null
  subtitle: string | null
  content_md: string | null
  hero_image: string | null
  meta_title: string | null
  meta_description: string | null
  is_published: boolean
  placement: string | null
  design_settings: DesignSettings | null
  updated_at: string | null
}

const TITLE_MAX = 60
const DESC_MAX = 160

const EMOJI_OPTIONS = [
  "📄", "📝", "📰", "📋", "📌", "📎", "🔔", "💡",
  "🔍", "🛠️", "⚙️", "🔧", "💻", "🖥️", "📱", "🌐",
  "🛡️", "🔒", "📊", "📈", "🎯", "🚀", "🤖", "🧠",
  "📚", "🎓", "🏆", "⚡", "🔥", "💰", "📣", "🎉",
  "🏠", "👤", "👥", "💬", "✉️", "📩", "📅", "⏰",
  "✅", "❌", "⚠️", "❗", "❓", "🔗", "📁", "🗂️",
]

export default function PageEditor() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const def = getSitePage(slug)
  const supabase = createClient()

  const [db, setDb] = useState<DbPage | null>(null)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [content, setContent] = useState("")
  const [published, setPublished] = useState(true)
  const [placement, setPlacement] = useState("both")
  const [designSettings, setDesignSettings] = useState<DesignSettings>({})
  const [contentMode, setContentMode] = useState<"markdown" | "html">("markdown")
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "error">("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [heroSearchQuery, setHeroSearchQuery] = useState("")
  const [heroSearchResults, setHeroSearchResults] = useState<{ src: string; alt: string; link?: string; license?: string }[]>([])
  const [heroSearching, setHeroSearching] = useState(false)
  const [heroSearchError, setHeroSearchError] = useState("")
  const [heroSearchSource, setHeroSearchSource] = useState<"web" | "pexels">("web")
  const [heroActiveSource, setHeroActiveSource] = useState<"google" | "bing" | "wikimedia" | "pexels" | null>(null)
  const [dirtyRef, setDirtyRef] = useState(false)
  const dirtyFlag = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const resetFrom = useCallback((row: DbPage | null) => {
    setDb(row)
    setTitle(row?.title ?? def?.hero.title ?? slug)
    setSubtitle(row?.subtitle != null && row.subtitle !== "" ? row.subtitle : def?.hero.subtitle ?? "")
    setHeroImage(row?.hero_image ?? def?.hero.heroImage ?? "")
    setMetaTitle(row?.meta_title ?? def?.metaTitle ?? "")
    setMetaDescription(row?.meta_description ?? def?.metaDescription ?? "")
    setContent(row?.content_md ?? def?.contentMd ?? "")
    setPublished(row ? row.is_published : true)
    setPlacement(row?.placement ?? "both")
    setDesignSettings(row?.design_settings ?? {})
    setContentMode((row?.design_settings as Record<string, unknown>)?.content_mode === "html" ? "html" : "markdown")
    setLoaded(true)
  }, [def, slug])

  const fetchPage = useCallback(async () => {
    const { data } = await supabase.from("site_pages").select("*").eq("slug", slug).maybeSingle()
    resetFrom(data as DbPage | null)
  }, [supabase, slug, resetFrom])

  useEffect(() => {
    fetchPage()
    const channel = supabase
      .channel(`admin_page_editor_${slug}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_pages", filter: `slug=eq.${slug}` }, () => {
        if (dirtyFlag.current) return
        fetchPage()
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, slug, fetchPage])

  const markDirty = () => {
    dirtyFlag.current = true
    setDirtyRef(true)
    setSaveState("")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => savePage(true), 800)
  }

  const savePage = async (silent = false) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState("saving")
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
          body: JSON.stringify({
            action: "upsert",
            slug,
            title,
            subtitle,
            hero_image: heroImage,
            content_md: content,
            meta_title: metaTitle,
            meta_description: metaDescription,
            is_published: published,
            placement,
            design_settings: Object.keys(designSettings).length ? { ...designSettings, content_mode: contentMode } : { content_mode: contentMode },
          }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveState("error")
        setError(data?.error || res.statusText)
        return
      }
      dirtyFlag.current = false
      setDirtyRef(false)
      setSaveState("saved")
      setDb(data.page as DbPage)
      if (!silent) setTimeout(() => setSaveState(""), 2500)
    } catch (e: any) {
      setSaveState("error")
      setError(e?.message || "Network error")
    }
  }

  const uploadHeroImage = async (file: File) => {
    setUploading(true)
    setError("")
    try {
      let uploadFile = file
      if (file.type.startsWith("image/")) {
        uploadFile = await new Promise<File>((resolve) => {
          const img = new window.Image()
          img.onload = () => {
            const MAX_W = 1920
            const MAX_H = 810
            let w = img.naturalWidth
            let h = img.naturalHeight
            if (w > MAX_W || h > MAX_H) {
              const ratio = Math.min(MAX_W / w, MAX_H / h)
              w = Math.round(w * ratio)
              h = Math.round(h * ratio)
            }
            const canvas = document.createElement("canvas")
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext("2d")!
            ctx.drawImage(img, 0, 0, w, h)
            canvas.toBlob((blob) => {
              resolve(new File([blob!], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }))
            }, "image/webp", 0.9)
          }
          img.src = URL.createObjectURL(file)
        })
      }
      const fd = new FormData()
      fd.append("file", uploadFile)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      setHeroImage(data.url)
      markDirty()
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const searchHeroImages = async () => {
    if (!heroSearchQuery) return
    setHeroSearching(true)
    setHeroSearchError("")
    setHeroActiveSource(null)
    try {
      if (heroSearchSource === "pexels") {
        const res = await fetch(`/api/pexels?query=${encodeURIComponent(heroSearchQuery)}`)
        const data = await res.json()
        if (data.photos) {
          setHeroSearchResults(data.photos.map((p: any) => ({ src: p.src.large2x || p.src.large, alt: p.alt, link: p.url, license: "Free (Pexels)" })))
          setHeroActiveSource("pexels")
        } else {
          setHeroSearchResults([])
          setHeroSearchError("No Pexels results. Try different keywords.")
        }
      } else {
        const res = await fetch(`/api/google-images?query=${encodeURIComponent(heroSearchQuery)}&engine=auto`)
        const data = await res.json()
        if (data.items?.length) {
          setHeroSearchResults(data.items.map((p: any) => ({ src: p.src, alt: p.alt, link: p.link, license: p.license })))
          setHeroActiveSource(data.source === "bing" ? "bing" : data.source === "google" ? "google" : data.source === "wikimedia" ? "wikimedia" : null)
        } else {
          setHeroSearchResults([])
          setHeroSearchError("No image results. Try different keywords.")
        }
      }
    } catch {
      setHeroSearchResults([])
      setHeroSearchError("Search failed. Please try again.")
    }
    setHeroSearching(false)
  }

  const resetToDefault = async () => {
    if (!window.confirm("Reset this page to its built-in default content? Any custom edits will be lost.")) return
    const { data: sess } = await supabase.auth.getSession()
    const token = sess?.session?.access_token
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action: "reset", slug }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || res.statusText)
      return
    }
    dirtyFlag.current = false
    setDirtyRef(false)
    await fetchPage()
    setSaveState("")
  }

  const deletePage = async () => {
    if (!window.confirm(`Delete "${title || def?.label || slug}" permanently? This cannot be undone.`)) return
    setSaveState("saving")
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "delete", slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveState("error")
        setError(data?.error || res.statusText)
        return
      }
      window.location.href = "/admin/pages"
    } catch (e: any) {
      setSaveState("error")
      setError(e?.message || "Network error")
    }
  }

  if (!def && !db && loaded) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Pages
        </Link>
        <div className="text-red-600">Page not found: {slug}</div>
      </div>
    )
  }
  if (!loaded) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Pages
        </Link>
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading page…</div>
      </div>
    )
  }

  const previewHtml = contentMode === "html" ? preserveHtml(content) : renderMarkdown(content)
  const titleRemaining = TITLE_MAX - metaTitle.length
  const descRemaining = DESC_MAX - metaDescription.length
  const counterColor = (remaining: number) =>
    remaining < 0 ? "text-red-600" : remaining < 20 ? "text-amber-600" : "text-muted-foreground"

  return (
    <div className="space-y-6">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 bg-background/95 backdrop-blur border-b border-border py-3 flex items-center gap-3 flex-wrap">
        <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Pages
        </Link>
        <span className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] text-lg border border-white/10 shrink-0">
            {def?.icon ?? "📄"}
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{def?.label ?? (title || slug)}</h1>
            <p className="text-[11px] text-muted-foreground truncate">/{def?.path ?? slug}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {dirtyRef && <span className="text-[11px] text-amber-600 font-medium">Unsaved changes</span>}
          {saveState === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><Check className="w-3.5 h-3.5" /> Saved — live on the site</span>
          )}
          {saveState === "error" && <span className="text-xs text-red-600">Save failed</span>}
          <Link
            href={`/${def?.path || slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-2 hover:border-accent transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open page
          </Link>
          <button
            onClick={() => savePage(false)}
            disabled={saveState === "saving"}
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {/* Publish + reset row */}
      <div className="flex flex-wrap items-center gap-4 bg-card border rounded-xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-semibold">{published ? "Published" : "Unpublished"}</p>
            <p className="text-[11px] text-muted-foreground">
              {published ? "Visible to visitors right now" : "Hidden on the public site (admins can still edit)"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setPublished(!published)
            markDirty()
          }}
          className={`relative rounded-full transition-colors ${published ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
          style={{ width: 44, height: 24 }}
          aria-pressed={published}
          title={published ? "Click to unpublish" : "Click to publish"}
        >
          <span
            className="absolute rounded-full bg-white shadow transition-all"
            style={{ left: published ? 22 : 2, width: 20, height: 20, top: 2 }}
          />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wand2 className="w-3.5 h-3.5 text-accent" /> Autosaves while you type
          </span>
          <button
            onClick={resetToDefault}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 border border-border rounded-lg px-3 py-2 hover:border-red-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset to default
          </button>
          <button
            onClick={deletePage}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-3 py-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Placement + Design Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placement selector */}
        <div className="bg-card border rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <LayoutPanelLeft className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">Page Placement</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Choose where this page appears in the site navigation.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "both", label: "Header + Footer", desc: "Shown everywhere" },
              { value: "header", label: "Header only", desc: "Top navigation bar" },
              { value: "footer", label: "Footer only", desc: "Bottom links" },
              { value: "menu", label: "Menu", desc: "Main site menu" },
              { value: "none", label: "Hidden", desc: "Not in any nav" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setPlacement(opt.value); markDirty() }}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  placement === opt.value
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Design settings */}
        <div className="bg-card border rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">Design Settings</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Customize the page appearance. Leave empty for defaults.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Hero Background</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={designSettings.hero_bg ?? "#192537"}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, hero_bg: e.target.value })); markDirty() }}
                  className="w-8 h-8 rounded-lg border cursor-pointer"
                />
                <input
                  value={designSettings.hero_bg ?? ""}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, hero_bg: e.target.value || undefined })); markDirty() }}
                  placeholder="#192537"
                  className="flex-1 bg-background border rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Text Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={designSettings.text_color ?? "#ffffff"}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, text_color: e.target.value })); markDirty() }}
                  className="w-8 h-8 rounded-lg border cursor-pointer"
                />
                <input
                  value={designSettings.text_color ?? ""}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, text_color: e.target.value || undefined })); markDirty() }}
                  placeholder="#ffffff"
                  className="flex-1 bg-background border rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Content Max Width</label>
              <input
                value={designSettings.content_width ?? ""}
                onChange={(e) => { setDesignSettings((s) => ({ ...s, content_width: e.target.value || undefined })); markDirty() }}
                placeholder="800px"
                className="w-full bg-background border rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Hero Height</label>
              <input
                value={designSettings.hero_height ?? ""}
                onChange={(e) => { setDesignSettings((s) => ({ ...s, hero_height: e.target.value || undefined })); markDirty() }}
                placeholder="320px"
                className="w-full bg-background border rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">Hero Alignment</label>
              <div className="flex gap-1.5 mt-1">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    onClick={() => { setDesignSettings((s) => ({ ...s, hero_alignment: align })); markDirty() }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                      designSettings.hero_alignment === align
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {align}
                  </button>
                ))}
                {designSettings.hero_alignment && (
                  <button
                    onClick={() => { setDesignSettings((s) => ({ ...s, hero_alignment: undefined })); markDirty() }}
                    className="rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={designSettings.show_breadcrumb !== false}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, show_breadcrumb: e.target.checked ? undefined : false })); markDirty() }}
                  className="rounded border-border"
                />
                <span className="text-[11px] font-medium text-muted-foreground">Show breadcrumb navigation</span>
              </label>
              <p className="text-[10px] text-muted-foreground mt-1 ml-5">Uncheck to hide the breadcrumb trail on this page.</p>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={designSettings.full_width === true}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, full_width: e.target.checked || undefined })); markDirty() }}
                  className="rounded border-border"
                />
                <span className="text-[11px] font-medium text-muted-foreground">Full-width layout</span>
              </label>
              <p className="text-[10px] text-muted-foreground mt-1 ml-5">Remove the container box so the page content spans the full width.</p>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={designSettings.show_icon !== false}
                    onChange={(e) => { setDesignSettings((s) => ({ ...s, show_icon: e.target.checked ? undefined : false })); markDirty() }}
                    className="rounded border-border"
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">Show page icon</span>
                </label>
                <span className="text-[10px] text-muted-foreground">Toggle to show/hide the icon in hero</span>
              </div>
              {designSettings.show_icon !== false && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Page Icon</label>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPickerOpen((v) => !v)
                      }}
                      className="w-full bg-background border rounded-lg px-3 py-1.5 text-xs text-left focus:border-accent outline-none flex items-center gap-2"
                    >
                      <span className="text-base">{designSettings.icon || ""}</span>
                      <span className="text-muted-foreground">{designSettings.icon ? "Change emoji" : "Pick an emoji"}</span>
                    </button>
                    {designSettings.icon && (
                      <button
                        type="button"
                        onClick={() => { setDesignSettings((s) => ({ ...s, icon: undefined })); markDirty() }}
                        className="text-xs text-muted-foreground hover:text-destructive px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {emojiPickerOpen && (
                    <div className="absolute z-50 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg p-2 max-h-52 overflow-y-auto">
                      <div className="grid grid-cols-8 gap-0.5">
                        {EMOJI_OPTIONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setDesignSettings((s) => ({ ...s, icon: em }))
                              setEmojiPickerOpen(false)
                              markDirty()
                            }}
                            className={`text-lg p-1 rounded hover:bg-muted transition-colors ${designSettings.icon === em ? "bg-accent/20 ring-1 ring-accent" : ""}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">An emoji shown in the hero banner above the title.</p>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={designSettings.show_updated !== false}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, show_updated: e.target.checked ? undefined : false })); markDirty() }}
                  className="rounded border-border"
                />
                <span className="text-[11px] font-medium text-muted-foreground">Show &quot;last updated&quot; date</span>
              </label>
              <p className="text-[10px] text-muted-foreground mt-1 ml-5">Display the page&apos;s last-updated date in the hero banner.</p>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">
                Image Temperature <span className="text-muted-foreground/60">(warm ↔ cool)</span>
              </label>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-muted-foreground">Cool</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={designSettings.hero_temperature ?? 0}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, hero_temperature: Number(e.target.value) || undefined })); markDirty() }}
                  className="flex-1 accent-accent"
                />
                <span className="text-[10px] text-muted-foreground">Warm</span>
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{designSettings.hero_temperature ?? 0}%</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">
                Image Brightness
              </label>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-muted-foreground">Dark</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={designSettings.hero_brightness ?? 100}
                  onChange={(e) => { setDesignSettings((s) => ({ ...s, hero_brightness: Number(e.target.value) || undefined })); markDirty() }}
                  className="flex-1 accent-accent"
                />
                <span className="text-[10px] text-muted-foreground">Bright</span>
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{designSettings.hero_brightness ?? 100}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Page title</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty() }}
              className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => { setSubtitle(e.target.value); markDirty() }}
              placeholder="A one-line description shown under the page title"
              className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Hero image</label>
            <div className="flex gap-2 items-start">
              <input
                value={heroImage}
                onChange={(e) => { setHeroImage(e.target.value); markDirty() }}
                placeholder="https://… or upload below"
                className="flex-1 bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
              <label className="inline-flex items-center gap-1.5 bg-background border rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50 shrink-0">
                <ImagePlus className="w-4 h-4" />
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadHeroImage(f)
                    e.target.value = ""
                  }}
                />
              </label>
              {heroImage && (
                <button
                  onClick={() => { setHeroImage(""); markDirty() }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-red-600 shrink-0 pt-2.5 px-1"
                  title="Remove hero image"
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
            {heroImage ? (
              <div className="mt-2.5 relative rounded-xl overflow-hidden border aspect-[21/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="Hero preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mt-2.5 rounded-xl border border-dashed bg-muted/30 h-20 flex items-center justify-center text-xs text-muted-foreground">
                No hero image — the page will use the gradient banner.
              </div>
            )}
            {/* Web Image Search */}
            <div className="mt-3 border rounded-xl p-3 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Search for an image</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => { setHeroSearchSource("web"); setHeroSearchResults([]); setHeroSearchError(""); setHeroActiveSource(null) }}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${heroSearchSource === "web" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    Web
                  </button>
                  <button
                    onClick={() => { setHeroSearchSource("pexels"); setHeroSearchResults([]); setHeroSearchError(""); setHeroActiveSource(null) }}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${heroSearchSource === "pexels" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    Pexels
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={heroSearchQuery}
                  onChange={(e) => setHeroSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchHeroImages() } }}
                  placeholder={heroSearchSource === "pexels" ? "Search Pexels for free photos…" : "Search the live web for any image…"}
                  className="flex-1 bg-card border rounded-lg px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
                <button
                  onClick={searchHeroImages}
                  disabled={heroSearching || !heroSearchQuery}
                  className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  {heroSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>
              {heroSearchError && (
                <p className="text-xs text-red-500 mt-2">{heroSearchError}</p>
              )}
              {heroActiveSource && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {heroActiveSource === "bing" && "Live web search (Bing)"}
                  {heroActiveSource === "google" && "Google Custom Search"}
                  {heroActiveSource === "wikimedia" && "Wikimedia Commons (free license)"}
                  {heroActiveSource === "pexels" && "Pexels (free license)"}
                  {" — hover for details"}
                </p>
              )}
              {heroSearchResults.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 mt-3 max-h-56 overflow-y-auto">
                  {heroSearchResults.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setHeroImage(img.src); markDirty() }}
                      className={`relative rounded-lg overflow-hidden border-2 aspect-square group transition-all ${heroImage === img.src ? "border-accent ring-2 ring-accent/30" : "border-transparent hover:border-accent/50"}`}
                      title={img.alt || "Image"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.alt || ""} className="w-full h-full object-cover" loading="lazy" />
                      {img.license && (
                        <span className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/70 text-white px-1 py-0.5 truncate text-center">
                          {img.license}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Meta title <span className="text-muted-foreground font-normal">(SEO)</span>
              </label>
              <input
                value={metaTitle}
                onChange={(e) => { setMetaTitle(e.target.value); markDirty() }}
                className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
              <p className={`text-[11px] mt-1 ${counterColor(titleRemaining)}`}>
                {Math.abs(titleRemaining)} character(s) {titleRemaining < 0 ? "over" : "remaining"} · {metaTitle.length} / {TITLE_MAX}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Meta description <span className="text-muted-foreground font-normal">(SEO)</span>
              </label>
              <input
                value={metaDescription}
                onChange={(e) => { setMetaDescription(e.target.value); markDirty() }}
                className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
              <p className={`text-[11px] mt-1 ${counterColor(descRemaining)}`}>
                {Math.abs(descRemaining)} character(s) {descRemaining < 0 ? "over" : "remaining"} · {metaDescription.length} / {DESC_MAX}
              </p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold">
                Content
              </label>
              <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg border">
                <button
                  type="button"
                  onClick={() => { setContentMode("markdown"); markDirty() }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${contentMode === "markdown" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => { setContentMode("html"); markDirty() }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${contentMode === "html" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  HTML
                </button>
              </div>
            </div>
            {contentMode === "markdown" ? (
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); markDirty() }}
                rows={26}
                className="w-full bg-card border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
                placeholder="Write your page content in Markdown…"
              />
            ) : (
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); markDirty() }}
                rows={26}
                className="w-full bg-card border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
                placeholder="<h2>Title</h2>&#10;<p>Your HTML content here…</p>"
              />
            )}
            <p className="text-[11px] mt-1 text-muted-foreground">
              {contentMode === "markdown"
                ? "Supports images, links, tables, headings, and {html}…{/html} raw blocks."
                : "Raw HTML — wrap content in standard tags. The {html}…{/html} wrapper is not needed."}
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-16 self-start">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
            <Eye className="w-4 h-4 text-accent" /> Live preview
            <span className="text-xs text-muted-foreground font-normal">(rendered from {contentMode} content)</span>
            {dirtyRef && <span className="text-xs text-amber-600 font-normal">· unsaved changes</span>}
          </div>
          <div className="border rounded-xl bg-background overflow-hidden">
            {heroImage ? (
              <div
                className="relative overflow-hidden"
                style={{
                  height: designSettings.hero_height || undefined,
                  minHeight: designSettings.hero_height ? undefined : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ height: "100%" }} />
                <div className="absolute inset-0 bg-black/30" />
                <div
                  className="relative z-10 p-6 h-full flex flex-col justify-end"
                  style={{
                    color: designSettings.text_color || "#ffffff",
                    textAlign: (designSettings.hero_alignment as "left" | "center" | "right") || "left",
                  }}
                >
                  <div className="text-2xl mb-1">{def?.icon ?? "📄"}</div>
                  <div className="text-lg font-bold leading-tight">{title || def?.hero?.title || slug}</div>
                  <p className="text-xs mt-1 line-clamp-2 opacity-75">{subtitle || def?.hero?.subtitle || ""}</p>
                </div>
              </div>
            ) : (
              <div
                className="px-6 py-8 relative overflow-hidden"
                style={{
                  background: designSettings.hero_bg
                    ? `linear-gradient(135deg, ${designSettings.hero_bg}, ${designSettings.hero_bg}dd)`
                    : "linear-gradient(135deg, #0f172a, #0b1035, #1b1b4b)",
                  height: designSettings.hero_height || undefined,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.16),transparent_55%)]" />
                <div
                  className="relative"
                  style={{
                    color: designSettings.text_color || "#ffffff",
                    textAlign: (designSettings.hero_alignment as "left" | "center" | "right") || "left",
                  }}
                >
                  <div className="text-2xl mb-2">{def?.icon ?? "📄"}</div>
                  <div className="text-xl font-bold mb-1.5">{title || def?.hero?.title || slug}</div>
                  <p className="text-xs opacity-70 max-w-md leading-relaxed">{subtitle || def?.hero?.subtitle || ""}</p>
                </div>
              </div>
            )}
            <article
              className="px-6 py-6 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-accent prose-strong:text-foreground prose-blockquote:border-accent prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <div className="border-t px-6 py-3 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" /> This preview mirrors the exact public rendering on /{def?.path || slug}
              </span>
              <span className="capitalize px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                {placement || "both"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  )
}

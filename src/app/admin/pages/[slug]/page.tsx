"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getSitePage } from "@/lib/pages"
import { renderMarkdown } from "@/lib/markdown"
import {
  ArrowLeft, Check, ExternalLink, Eye, ImagePlus, Loader2, RotateCcw, Save, Search, Trash2, Wand2,
} from "lucide-react"

interface DbPage {
  slug: string
  title: string | null
  subtitle: string | null
  content_md: string | null
  hero_image: string | null
  meta_title: string | null
  meta_description: string | null
  is_published: boolean
  updated_at: string | null
}

const TITLE_MAX = 60
const DESC_MAX = 160

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
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "error">("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [dirtyRef, setDirtyRef] = useState(false)
  const dirtyFlag = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const resetFrom = useCallback((row: DbPage | null) => {
    if (!def) return
    setDb(row)
    setTitle(row?.title ?? def.hero.title)
    setSubtitle(row?.subtitle != null && row.subtitle !== "" ? row.subtitle : def.hero.subtitle)
    setHeroImage(row?.hero_image ?? def.hero.heroImage ?? "")
    setMetaTitle(row?.meta_title ?? def.metaTitle)
    setMetaDescription(row?.meta_description ?? def.metaDescription)
    setContent(row?.content_md ?? def.contentMd)
    setPublished(row ? row.is_published : true)
    setLoaded(true)
  }, [def])

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
      const fd = new FormData()
      fd.append("file", file)
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

  if (!def) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Pages
        </Link>
        <div className="text-red-600">Unknown page slug: {slug}</div>
      </div>
    )
  }

  const previewHtml = renderMarkdown(content)
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
            {def.icon}
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{def.label}</h1>
            <p className="text-[11px] text-muted-foreground truncate">/{def.path}</p>
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
            href={def.path}
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
            <label className="block text-sm font-semibold mb-1.5">
              Content <span className="text-muted-foreground font-normal">(Markdown — supports images, links, tables)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); markDirty() }}
              rows={26}
              className="w-full bg-card border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
            />
          </div>
        </div>

        <div className="lg:sticky lg:top-16 self-start">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
            <Eye className="w-4 h-4 text-accent" /> Live preview
            <span className="text-xs text-muted-foreground font-normal">(rendered from current markdown)</span>
            {dirtyRef && <span className="text-xs text-amber-600 font-normal">· unsaved changes</span>}
          </div>
          <div className="border rounded-xl bg-background overflow-hidden">
            {heroImage ? (
              <div className="relative h-44 md:h-52 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
                <div className="relative z-10 p-6 h-full flex flex-col justify-end text-white">
                  <div className="text-2xl mb-1">{def.icon}</div>
                  <div className="text-lg font-bold leading-tight">{title || def.hero.title}</div>
                  <p className="text-xs text-white/75 mt-1 line-clamp-2">{subtitle || def.hero.subtitle}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] px-6 py-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.16),transparent_55%)]" />
                <div className="relative">
                  <div className="text-2xl mb-2">{def.icon}</div>
                  <div className="text-xl font-bold text-white mb-1.5">{title || def.hero.title}</div>
                  <p className="text-xs text-white/70 max-w-md leading-relaxed">{subtitle || def.hero.subtitle}</p>
                </div>
              </div>
            )}
            <article
              className="px-6 py-6 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-accent prose-strong:text-foreground prose-blockquote:border-accent prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <div className="border-t px-6 py-3 flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20">
              <Search className="w-3.5 h-3.5" /> This preview mirrors the exact public rendering on /{def.path}
            </div>
          </div>
        </div>
      </div>

      {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  )
}

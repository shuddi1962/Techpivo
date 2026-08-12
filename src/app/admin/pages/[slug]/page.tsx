"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getSitePage } from "@/lib/pages"
import { renderMarkdown } from "@/lib/markdown"
import { ArrowLeft, Check, ExternalLink, Eye, Loader2, RotateCcw, Save, ImagePlus, Trash2 } from "lucide-react"

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
      .channel(`admin_page_editor_${slug}_${Date.now()}`)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Pages
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">{def.icon}</span> {def.label}
            </h1>
            <p className="text-xs text-muted-foreground">/{def.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600"><Check className="w-3.5 h-3.5" /> Saved</span>
          )}
          {saveState === "error" && <span className="text-xs text-red-600">Save failed</span>}
          <Link
            href={def.path}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-4 h-4" /> Open page
          </Link>
          <button
            onClick={() => savePage(false)}
            className="inline-flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-3">
        <label className="text-sm font-medium">Published</label>
        <button
          onClick={() => {
            setPublished(!published)
            markDirty()
          }}
          className={`relative w-10 h-5.5 rounded-full transition-colors ${published ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
          style={{ width: 40, height: 22 }}
          aria-pressed={published}
        >
          <span
            className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all"
            style={{ left: published ? 20 : 2, width: 18, height: 18, top: 2 }}
          />
        </button>
        <span className="text-xs text-muted-foreground">
          {published ? "Visible to visitors" : "Hidden on the public site (admins can still edit)"}
        </span>
        <button
          onClick={resetToDefault}
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600"
        >
          <RotateCcw className="w-4 h-4" /> Reset to default
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty() }}
              className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => { setSubtitle(e.target.value); markDirty() }}
              className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero image</label>
            <div className="flex gap-2 items-start">
              <input
                value={heroImage}
                onChange={(e) => { setHeroImage(e.target.value); markDirty() }}
                placeholder="Image URL"
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
            {heroImage && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="Hero preview" className="h-24 rounded-lg border object-cover" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Meta title <span className="text-muted-foreground font-normal">(SEO)</span></label>
              <input
                value={metaTitle}
                onChange={(e) => { setMetaTitle(e.target.value); markDirty() }}
                className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meta description <span className="text-muted-foreground font-normal">(SEO)</span></label>
              <input
                value={metaDescription}
                onChange={(e) => { setMetaDescription(e.target.value); markDirty() }}
                className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content <span className="text-muted-foreground font-normal">(Markdown)</span></label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); markDirty() }}
              rows={24}
              className="w-full bg-card border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <Eye className="w-4 h-4" /> Live preview
            <span className="text-xs text-muted-foreground font-normal">(rendered from current markdown)</span>
            {dirtyRef && <span className="text-xs text-amber-600 font-normal">· unsaved changes</span>}
          </div>
          <div className="border rounded-xl bg-background">
            <div className="border-b bg-gradient-to-br from-[#FFF7E6] via-card to-card dark:from-[#1a1606] rounded-t-xl px-6 py-8">
              <div className="text-4xl mb-3">{def.icon}</div>
              <div className="text-2xl font-bold mb-2">{title || def.hero.title}</div>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{subtitle || def.hero.subtitle}</p>
            </div>
            <article
              className="px-6 py-6 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-accent prose-strong:text-foreground prose-blockquote:border-accent prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>

      {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  )
}
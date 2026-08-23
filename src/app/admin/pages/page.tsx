"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowUpRight, CheckCircle2, Globe, LayoutTemplate, Loader2, Lock, Pencil, Plus, RotateCcw, Search, Sparkles,
} from "lucide-react"
import { SITE_PAGES, type SitePageDef } from "@/lib/pages"

interface DbPage {
  slug: string
  title: string | null
  subtitle: string | null
  content_md: string | null
  hero_image: string | null
  is_published: boolean
  updated_at: string | null
}

export default function PagesAdminPage() {
  const supabase = createClient()
  const [dbPages, setDbPages] = useState<Record<string, DbPage>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busySlug, setBusySlug] = useState("")
  const [query, setQuery] = useState("")
  const [onlyCustom, setOnlyCustom] = useState<"all" | "custom" | "defaults">("all")
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchPages = useCallback(async () => {
    const { data } = await supabase.from("site_pages").select("*").order("slug")
    const map: Record<string, DbPage> = {}
    if (data) for (const row of data as DbPage[]) map[row.slug] = row
    setDbPages(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPages()
    const channel = supabase
      .channel(`admin_pages_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_pages" }, () => fetchPages())
      .subscribe()
    channelRef.current = channel
    const poll = setInterval(() => fetchPages(), 30000)
    const onFocus = () => fetchPages()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, fetchPages])

  const postAction = async (body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data?.error || res.statusText }
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" }
    }
  }

  const resetPage = async (slug: string) => {
    if (!window.confirm(`Reset "${slug}" to its default content? Any custom edits will be lost.`)) return
    setBusySlug(slug)
    setError("")
    const res = await postAction({ action: "reset", slug })
    if (!res.ok) setError(`Failed to reset "${slug}": ${res.error}`)
    else fetchPages()
    setBusySlug("")
  }

  const createPage = async () => {
    const title = newTitle.trim()
    if (!title) { setError("Title is required."); return }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (slug.length < 2) { setError("Slug must be at least 2 characters."); return }
    setCreating(true)
    setError("")
    const res = await postAction({ action: "upsert", slug, title, content_md: "", is_published: false, placement: "none" })
    setCreating(false)
    if (!res.ok) setError(`Failed to create page: ${res.error}`)
    else { setShowCreate(false); setNewTitle(""); window.location.href = `/admin/pages/${slug}` }
  }

  const customized = SITE_PAGES.filter((p) => dbPages[p.slug])
  const liveCount = customized.filter((p) => dbPages[p.slug].is_published).length
  const hiddenCount = customized.filter((p) => !dbPages[p.slug].is_published).length

  const customSlugs = Object.keys(dbPages).filter((s) => !SITE_PAGES.find((p) => p.slug === s))

  const allPages: (SitePageDef & { isCustom: boolean })[] = [
    ...SITE_PAGES.map((p) => ({ ...p, isCustom: !!dbPages[p.slug] })),
    ...customSlugs.map((s) => ({
      slug: s,
      path: s,
      label: dbPages[s].title || s,
      icon: "📄",
      hero: { title: dbPages[s].title || s, subtitle: "", heroImage: undefined as string | undefined },
      contentMd: "",
      metaTitle: "",
      metaDescription: "",
      isCustom: true,
    })),
  ]

  const usingDefaults = allPages.length - customized.length

  const filtered = allPages.filter((p) => {
    const db = dbPages[p.slug]
    const matchesQuery =
      query.trim() === "" ||
      p.label.toLowerCase().includes(query.toLowerCase()) ||
      p.path.toLowerCase().includes(query.toLowerCase()) ||
      p.slug.includes(query.toLowerCase())
    const matchesFilter =
      onlyCustom === "all" || (onlyCustom === "custom" ? !!db : !db)
    return matchesQuery && matchesFilter
  })

  const totalPageCount = allPages.length
  const progress = Math.round((customized.length / totalPageCount) * 100)

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
                <Sparkles className="w-3 h-3 text-amber-300" /> Pages Center
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
                <Globe className="h-5 w-5 text-amber-300" />
              </span>
              Site Pages
            </h1>
            <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
              Edit the static pages of the site. Changes go live instantly on the public pages — no redeploys, no cache
              waits. Manage content, hero images and SEO fields for every page from one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] text-white/60 uppercase tracking-wide mb-0.5">Total pages</p>
              <p className="text-2xl font-bold tabular-nums">{totalPageCount}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-white/60 mt-1.5">{progress}% customized</p>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-white/70"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Live</span>
                <span className="text-sm font-bold tabular-nums">{liveCount}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-white/70"><Lock className="w-3.5 h-3.5 text-amber-300" /> Hidden</span>
                <span className="text-sm font-bold tabular-nums">{hiddenCount}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-white/70"><LayoutTemplate className="w-3.5 h-3.5 text-sky-300" /> Defaults</span>
                <span className="text-sm font-bold tabular-nums">{usingDefaults}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-950 text-sm font-semibold px-4 py-2 shadow-lg shadow-black/20 hover:bg-amber-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Page
          </button>
          <Link
            href="/admin/pages/blocks"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm font-medium px-4 py-2 hover:bg-white/20 transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" /> Manage Site Blocks
          </Link>
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm font-medium px-4 py-2 hover:bg-white/20 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" /> View live site
          </Link>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages by name, path or slug…"
            className="w-full bg-card border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 text-xs font-medium">
          {(["all", "custom", "defaults"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setOnlyCustom(f)}
              className={`px-3 py-1.5 rounded-md transition-colors ${onlyCustom === f ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f === "custom" ? "Customized" : "Using defaults"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} page(s)</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((page) => {
            const db = dbPages[page.slug]
            const isCustom = !!db
            const published = !db || db.is_published
            const image = db?.hero_image ?? page.hero.heroImage
            return (
              <div
                key={page.slug}
                className="group bg-card border rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5"
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={page.label} className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.2),transparent_60%)]" />
                    <span className="relative text-4xl drop-shadow-lg">{page.icon}</span>
                  </div>
                )}
                <div className="p-4 flex flex-col gap-2.5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate group-hover:text-accent transition-colors">{page.label}</h2>
                      <p className="text-xs text-muted-foreground">/{page.path}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        !isCustom
                          ? "bg-muted/50 text-muted-foreground border-border"
                          : published
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                      }`}
                    >
                      {!isCustom ? "Using defaults" : published ? "Live" : "Unpublished"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {db ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Globe className="w-3 h-3 text-slate-400" />}
                      {db ? "Custom content" : "Registry default"}
                    </span>
                    {db?.updated_at && (
                      <span className="truncate">Updated {new Date(db.updated_at).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-3 border-t">
                    <Link
                      href={`/admin/pages/${page.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
                    >
                      <Pencil className="w-3 h-3" /> Edit page
                    </Link>
                    <Link
                      href={page.path}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 hover:border-accent transition-colors"
                    >
                      <ArrowUpRight className="w-3 h-3" /> View
                    </Link>
                    {isCustom && (
                      <button
                        onClick={() => resetPage(page.slug)}
                        disabled={busySlug === page.slug}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 rounded-lg px-2 py-1.5 disabled:opacity-50 ml-auto"
                        title="Reset to default content"
                      >
                        {busySlug === page.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-muted-foreground">
              No pages match your search.
            </div>
          )}
        </div>
      )}

      {usingDefaults > 0 && (
        <div className="bg-card border rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-3">
          <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
          <p>
            <span className="font-semibold text-foreground">Tip:</span> {usingDefaults} page(s) are still showing the
            built-in default content. Open any page and press <span className="font-medium">Save</span> to customize it —
            or use <Link href="/admin/pages/blocks" className="text-accent hover:underline">Site Blocks</Link> for the
            homepage, header and footer.
          </p>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create New Page</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Page Name</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="My New Page"
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none mt-1"
                  autoFocus
                />
                {newTitle.trim() && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    URL will be /{newTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
              <button
                onClick={createPage}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

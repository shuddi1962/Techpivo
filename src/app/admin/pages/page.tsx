"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ExternalLink, PanelsTopLeft, Pencil, RotateCcw } from "lucide-react"
import { SITE_PAGES, getSitePage } from "@/lib/pages"

interface DbPage {
  slug: string
  title: string | null
  subtitle: string | null
  content_md: string | null
  is_published: boolean
  updated_at: string | null
}

export default function PagesAdminPage() {
  const supabase = createClient()
  const [dbPages, setDbPages] = useState<Record<string, DbPage>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busySlug, setBusySlug] = useState("")
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
      .channel(`admin_pages_${Date.now()}`)
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

  const customized = SITE_PAGES.filter((p) => dbPages[p.slug])
  const usingDefaults = SITE_PAGES.filter((p) => !dbPages[p.slug])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Edit the static pages of the site. Changes go live instantly on the public pages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages/blocks"
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-card border rounded-lg px-4 py-2 hover:bg-muted/50"
          >
            <PanelsTopLeft className="w-4 h-4" /> Site Blocks (homepage · header · footer)
          </Link>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            LIVE · {customized.length}/{SITE_PAGES.length} customized
          </span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading pages…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SITE_PAGES.map((page) => {
            const db = dbPages[page.slug]
            const isCustom = !!db
            const published = !db || db.is_published
            return (
              <div key={page.slug} className="bg-card border rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-2xl">{page.icon}</div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      !isCustom
                        ? "bg-muted text-muted-foreground"
                        : published
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    }`}
                  >
                    {!isCustom ? "Using defaults" : published ? "Live" : "Unpublished"}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold">{page.label}</h2>
                  <p className="text-xs text-muted-foreground mt-1">/{page.path}</p>
                  {db?.updated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(db.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-2 border-t">
                  <Link
                    href={`/admin/pages/${page.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Link>
                  <Link
                    href={page.path}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </Link>
                  {isCustom && (
                    <button
                      onClick={() => resetPage(page.slug)}
                      disabled={busySlug === page.slug}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 disabled:opacity-50 ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {usingDefaults.length > 0 && (
        <div className="bg-card border rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-3">
          <PanelsTopLeft className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold text-foreground">Tip:</span> {usingDefaults.length} page(s) are still
            showing the built-in default content. Open any page and press <span className="font-medium">Save</span> to
            customize it.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {getSitePage("about") ? "Customized pages are stored in site_pages and served to visitors in real time." : ""}
      </p>
    </div>
  )
}
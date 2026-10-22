"use client"

// Admin → TechPivo Market → Categories.
// The department tree is editable: add, rename, hide, reorder and delete
// departments / subcategories / leaves. Every change is written to the
// database, published to the storefront instantly and synced live.

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDown, LayoutGrid, Plus, Pencil, RefreshCw, Save, Trash2, Database, Upload, Eye, EyeOff, X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { MarketDepartment } from "@/lib/marketplace-categories"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  marketInputCls,
  MarketBadge,
  MarketCardHead,
  MarketEmpty,
  MarketField,
  MarketKpi,
  MarketLoading,
  MarketModal,
  MarketNotice,
  MarketPageBar,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface Row {
  slug: string
  name: string
  parent_slug: string | null
  /** 0 = department, 1 = subcategory, 2 = leaf. */
  depth: number
  icon: string | null
  image_url: string | null
  sort: number
  is_active: boolean
}

type Level = "dept" | "sub" | "leaf"
const levelOf = (depth: number): Level => (depth === 0 ? "dept" : depth === 1 ? "sub" : "leaf")

type Draft = { slug: string | null; name: string; newSlug: string; level: Level; parent_slug: string }

export function MarketplaceCategoriesTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [tree, setTree] = useState<MarketDepartment[]>([])
  const [treeAll, setTreeAll] = useState<MarketDepartment[]>([])
  const [codeTree, setCodeTree] = useState<MarketDepartment[]>([])
  const [dbBacked, setDbBacked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=categories", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null)
    if (r) {
      setRows(Array.isArray(r.rows) ? (r.rows as Row[]) : [])
      setTree(Array.isArray(r.tree) ? (r.tree as MarketDepartment[]) : [])
      setTreeAll(Array.isArray(r.treeAll) ? (r.treeAll as MarketDepartment[]) : [])
      setCodeTree(Array.isArray(r.codeTree) ? (r.codeTree as MarketDepartment[]) : [])
      setDbBacked(!!r.dbBacked)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_categories_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_categories" }, () => load())
      .subscribe()
    const poll = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
    }
  }, [load])

  const flash = (msg: string, tone: "success" | "warn" | "info" = "success") => {
    setNotice(msg)
    setNoticeTone(tone)
    setTimeout(() => setNotice(""), 4000)
  }

  const post = async (action: string, payload: Record<string, unknown>) => {
    const res = await fetch("/admin/marketplace/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Update failed")
    return data
  }

  const sync = async () => {
    setBusy(true)
    try {
      const data = await post("category-sync", {})
      flash(`Synced ${data.synced} categories into the database — they are now editable.`)
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Sync failed", "warn")
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      flash("Name is required", "warn")
      return
    }
    setBusy(true)
    try {
      if (draft.slug) {
        await post("category-update", { slug: draft.slug, name: draft.name.trim(), new_slug: draft.newSlug.trim() })
        flash("Category updated — live on the storefront")
      } else {
        await post("category-add", {
          name: draft.name.trim(),
          slug: draft.newSlug.trim(),
          level: draft.level,
          parent_slug: draft.parent_slug,
        })
        flash("Category added — live on the storefront")
      }
      setDraft(null)
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed", "warn")
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (row: Row) => {
    setRows((prev) => prev.map((r) => (r.slug === row.slug ? { ...r, is_active: !r.is_active } : r)))
    try {
      await post("category-update", { slug: row.slug, is_active: !row.is_active })
      flash(`${row.name} ${row.is_active ? "hidden from" : "published to"} the storefront`)
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed", "warn")
      load()
    }
  }

  const remove = async (row: Row) => {
    if (!confirm(`Delete "${row.name}"? Anything inside it is deleted too.`)) return
    try {
      await post("category-delete", { slug: row.slug })
      flash("Category deleted")
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Delete failed", "warn")
    }
  }

  const counts = useMemo(
    () => ({
      departments: rows.filter((r) => r.depth === 0).length,
      subs: rows.filter((r) => r.depth === 1).length,
      leaves: rows.filter((r) => r.depth === 2).length,
      hidden: rows.filter((r) => !r.is_active).length,
    }),
    [rows]
  )

  if (loading) return <MarketLoading label="Loading departments..." />

  const rowBySlug = new Map(rows.map((r) => [r.slug, r]))
  // treeAll keeps hidden categories on screen (they must stay re-publishable).
  const depts = treeAll.length > 0 ? treeAll : tree.length > 0 ? tree : codeTree

  return (
    <div>
      <MarketPageBar
        icon={LayoutGrid}
        title="Categories"
        desc="Departments, subcategories & leaves — add, rename, hide or delete; changes publish live"
        badge={
          dbBacked ? (
            <MarketBadge tone="emerald" dot pulse>
              Database-backed · live
            </MarketBadge>
          ) : (
            <MarketBadge tone="amber" dot>
              Built-in tree
            </MarketBadge>
          )
        }
        actions={
          <>
            <button onClick={load} className={marketBtnGhostCls}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={() => setDraft({ slug: null, name: "", newSlug: "", level: "dept", parent_slug: "" })}
              className={marketBtnPrimaryCls}
            >
              <Plus className="h-4 w-4" /> Add department
            </button>
          </>
        }
      />

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MarketKpi label="Departments" value={String(counts.departments || depts.length)} sub="storefront menu" tone="amber" />
        <MarketKpi label="Subcategories" value={String(counts.subs)} sub="second level" tone="sky" />
        <MarketKpi label="Leaves" value={String(counts.leaves)} sub="leaf categories" tone="violet" />
        <MarketKpi
          label="Hidden"
          value={String(counts.hidden)}
          sub={counts.hidden > 0 ? "not shown in the store" : "all categories live"}
          tone={counts.hidden > 0 ? "amber" : "emerald"}
        />
      </div>

      {!dbBacked && (
        <div className={cn(marketCardCls, "mb-3 flex flex-wrap items-center justify-between gap-3 p-4", "border-amber-200 bg-amber-50/40")}>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">The store still runs on the built-in category tree</p>
            <p className="text-xs text-slate-600">
              Sync the {codeTree.length} departments into the database once — then you can add, rename, hide and delete
              categories here, and the storefront follows instantly.
            </p>
          </div>
          <button onClick={sync} disabled={busy} className={marketBtnDarkCls}>
            <Upload className="h-4 w-4" /> {busy ? "Syncing…" : "Sync to database"}
          </button>
        </div>
      )}

      {depts.length === 0 ? (
        <MarketEmpty
          icon={LayoutGrid}
          title="No departments"
          desc="Add your first department — it becomes a top-level menu on the storefront immediately."
          action={
            <button
              onClick={() => setDraft({ slug: null, name: "", newSlug: "", level: "dept", parent_slug: "" })}
              className={marketBtnPrimaryCls}
            >
              <Plus className="h-4 w-4" /> Add department
            </button>
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {depts.map((d) => {
            const isOpen = open[d.slug] ?? true
            const deptRow = rowBySlug.get(d.slug)
            return (
              <div key={d.slug} className={cn(marketCardCls, "overflow-hidden")}>
                <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [d.slug]: !isOpen }))}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <LayoutGrid className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-extrabold text-slate-900">{d.name}</span>
                        {deptRow && !deptRow.is_active && (
                          <MarketBadge tone="amber">Hidden</MarketBadge>
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {d.subs.length} subcategories · {d.subs.reduce((s, x) => s + x.items.length, 0)} leaves
                      </span>
                    </span>
                    <code className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-400 sm:block">
                      {d.slug}
                    </code>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", !isOpen && "-rotate-90")} />
                  </button>
                  {deptRow && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button title="Rename" aria-label={`Rename ${d.name}`} onClick={() => setDraft({ slug: deptRow.slug, name: deptRow.name, newSlug: deptRow.slug, level: "dept", parent_slug: "" })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button title={deptRow.is_active ? "Hide from store" : "Publish to store"} aria-label={`Toggle ${d.name}`} onClick={() => toggleActive(deptRow)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        {deptRow.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button title="Add subcategory" aria-label={`Add subcategory to ${d.name}`} onClick={() => setDraft({ slug: null, name: "", newSlug: "", level: "sub", parent_slug: d.slug })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Plus className="h-4 w-4" />
                      </button>
                      <button title="Delete" aria-label={`Delete ${d.name}`} onClick={() => remove(deptRow)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {isOpen && (
                  <div className="grid gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-3 sm:px-4 sm:grid-cols-2 lg:grid-cols-3">
                    {d.subs.map((s) => {
                      const subRow = rowBySlug.get(s.slug)
                      return (
                        <div key={s.slug} className="rounded-xl border border-slate-200/80 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-bold text-slate-900">{s.name}</span>
                                {subRow && !subRow.is_active && <MarketBadge tone="amber">Hidden</MarketBadge>}
                              </p>
                              <p className="mb-2 truncate text-[11px] text-slate-400">{s.slug}</p>
                            </div>
                            {subRow && (
                              <div className="flex shrink-0 items-center gap-0.5">
                                <button title="Rename" aria-label={`Rename ${s.name}`} onClick={() => setDraft({ slug: subRow.slug, name: subRow.name, newSlug: subRow.slug, level: "sub", parent_slug: d.slug })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button title={subRow.is_active ? "Hide" : "Publish"} aria-label={`Toggle ${s.name}`} onClick={() => toggleActive(subRow)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                  {subRow.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </button>
                                <button title="Add leaf" aria-label={`Add leaf to ${s.name}`} onClick={() => setDraft({ slug: null, name: "", newSlug: "", level: "leaf", parent_slug: s.slug })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                                <button title="Delete" aria-label={`Delete ${s.name}`} onClick={() => remove(subRow)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.items.map((item) => {
                              const leafRow = rowBySlug.get(item.slug)
                              return (
                                <span
                                  key={item.slug}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
                                    leafRow && !leafRow.is_active
                                      ? "border-slate-200 bg-slate-50 text-slate-400 line-through"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  )}
                                >
                                  {item.name}
                                  {leafRow && (
                                    <>
                                      <button
                                        title={leafRow.is_active ? "Hide" : "Publish"}
                                        aria-label={`Toggle ${item.name}`}
                                        onClick={() => toggleActive(leafRow)}
                                        className="text-slate-400 hover:text-slate-700"
                                      >
                                        {leafRow.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                      </button>
                                      <button
                                        title="Delete"
                                        aria-label={`Delete ${item.name}`}
                                        onClick={() => remove(leafRow)}
                                        className="text-slate-300 hover:text-red-500"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className={cn(marketCardCls, "mt-3 p-4")}>
        <MarketCardHead
          title="How categories drive the store"
          desc="Department → subcategory → leaf. The slug is the URL and the CJ import mapping key — changing it re-points existing products."
          icon={Database}
        />
        <p className="text-xs leading-relaxed text-slate-500">
          Slugs are used by <code className="rounded bg-slate-100 px-1">affiliate_products.category_slug</code> and
          <code className="rounded bg-slate-100 px-1">subcategory_slug</code>, so renaming a category keeps every
          product in it. Deleting a category removes its subcategories and leaves, but never deletes products.
        </p>
      </div>

      <MarketModal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.slug ? "Edit category" : `Add ${draft?.level === "dept" ? "department" : draft?.level === "sub" ? "subcategory" : "leaf category"}`}
        desc="Saved to the database and published to the storefront instantly."
        footer={
          <>
            <button onClick={() => setDraft(null)} className={marketBtnGhostCls}>
              Cancel
            </button>
            <button onClick={saveDraft} disabled={busy} className={marketBtnPrimaryCls}>
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {busy ? "Saving…" : "Save category"}
            </button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <MarketField label="Name *" hint="What shoppers see in the menu.">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={marketInputCls} placeholder="Camera & Photo" />
            </MarketField>
            <MarketField label="Slug" hint="URL + CJ mapping key. Leave empty to generate it from the name.">
              <input value={draft.newSlug} onChange={(e) => setDraft({ ...draft, newSlug: e.target.value })} className={marketInputCls + " font-mono"} placeholder="camera-photo" />
            </MarketField>
            {draft.level !== "dept" && (
              <MarketField label="Parent" hint="The category this one lives under.">
                <input
                  value={draft.parent_slug}
                  onChange={(e) => setDraft({ ...draft, parent_slug: e.target.value })}
                  className={marketInputCls + " font-mono"}
                  placeholder="consumer-electronics"
                />
              </MarketField>
            )}
          </div>
        )}
      </MarketModal>
    </div>
  )
}

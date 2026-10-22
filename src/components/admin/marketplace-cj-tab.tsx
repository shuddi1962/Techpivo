"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Download, KeyRound, Plug, RefreshCw, Search, XCircle, TrendingUp, Flame, ChevronDown } from "lucide-react"
import { MARKET_DEPARTMENTS, type MarketDepartment } from "@/lib/marketplace-categories"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  MarketBadge,
  MarketCardHead,
  MarketEmpty,
  MarketPageBar,
  marketIconInputCls,
  marketIconInputWrapCls,
  MarketNotice,
  MarketSegmented,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface CjItem {
  pid: string
  productNameEn?: string
  productImage?: string
  sellPrice?: number
  categoryFirstName?: string
  categorySecondName?: string
  sku?: string
  listedNum?: number
  inventory?: number
}

interface TopSeller {
  id: string
  name: string
  image: string | null
  price: number
  clicks: number
  conversions: number
}

const money = (v: unknown): string => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return "—"
  return `$${n.toFixed(2)}`
}

export function MarketplaceCjTab({ onImported }: { onImported?: () => void }) {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; message: string } | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [savingKey, setSavingKey] = useState(false)
  const [query, setQuery] = useState("")
  const [list, setList] = useState<CjItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  // The live, admin-editable category tree (Admin → Categories). Falls back
  // to the bundled tree until the database tree is synced.
  const [depts, setDepts] = useState<MarketDepartment[]>(MARKET_DEPARTMENTS)
  const [categorySlug, setCategorySlug] = useState(MARKET_DEPARTMENTS[0].slug)
  const [subcategorySlug, setSubcategorySlug] = useState(MARKET_DEPARTMENTS[0].subs[0].slug)
  const [sort, setSort] = useState<"match" | "listings" | "price_asc" | "price_desc" | "new">("match")
  const [flag, setFlag] = useState<"" | "trending" | "new">("")
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")
  const [importing, setImporting] = useState(false)
  const [top, setTop] = useState<TopSeller[]>([])

  const loadStatus = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=cj-status").then((x) => x.json()).catch(() => null)
    if (r?.status) setStatus(r.status)
  }, [])

  const loadTop = useCallback(async (cat: string, sub: string) => {
    const r = await fetch(`/admin/marketplace/api?section=cj-top&category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}`)
      .then((x) => x.json())
      .catch(() => null)
    setTop(Array.isArray(r?.top) ? (r.top as TopSeller[]) : [])
  }, [])

  // Live category tree — the import target follows what the admin has
  // renamed/added in Admin → Marketplace → Categories.
  useEffect(() => {
    let alive = true
    fetch("/admin/marketplace/api?section=categories", { cache: "no-store" })
      .then((x) => x.json())
      .then((d) => {
        if (!alive) return
        const tree = Array.isArray(d?.tree) ? (d.tree as MarketDepartment[]) : []
        if (tree.length === 0) return
        setDepts(tree)
        setCategorySlug((cur) => (tree.some((t) => t.slug === cur) ? cur : tree[0].slug))
        setSubcategorySlug((cur) => {
          const inTree = tree.some((t) => t.slug === categorySlug && t.subs.some((s) => s.slug === cur))
          if (inTree) return cur
          const target = tree.find((t) => t.slug === categorySlug) ?? tree[0]
          return target.subs[0]?.slug ?? ""
        })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // categorySlug is read (not written) inside — intentionally excluded so
    // the picker does not refetch on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadStatus()
    void loadTop(categorySlug, subcategorySlug)
  }, [loadStatus, loadTop, categorySlug, subcategorySlug])

  const dept = depts.find((d) => d.slug === categorySlug) ?? depts[0] ?? MARKET_DEPARTMENTS[0]

  const search = async (nextPage = 1) => {
    setLoading(true)
    setNotice("")
    try {
      const params = new URLSearchParams({
        section: "cj-list",
        q: query,
        size: "24",
        page: String(nextPage),
        sort,
      })
      if (flag) params.set("flag", flag)
      const r = await fetch(`/admin/marketplace/api?${params.toString()}`).then((x) => x.json())
      if (r?.demo) {
        setDemo(true)
        setList([])
        setTotal(0)
        setNoticeTone("warn")
        setNotice("CJ API key not set — connect above to search the live supplier catalog.")
        return
      }
      setDemo(false)
      const rows = (Array.isArray(r?.list) ? r.list : []) as CjItem[]
      setList((prev) => (nextPage > 1 ? [...prev, ...rows] : rows))
      setTotal(Number(r?.total) || rows.length)
      setPage(Number(r?.page) || nextPage)
      setPages(Number(r?.pages) || 1)
      if (rows.length === 0) {
        setNoticeTone("info")
        setNotice(
          query
            ? `No CJ product matches “${query}”. Try a shorter keyword (e.g. “hoodie” instead of “black oversized hoodie”).`
            : "No products returned — try another keyword or switch the sort."
        )
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Search failed — check the CJ connection.")
    } finally {
      setLoading(false)
    }
  }

  const saveKey = async () => {
    if (!apiKey.trim()) return
    setSavingKey(true)
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cj-save-key", apiKey: apiKey.trim() }),
      }).then((x) => x.json())
      if (r?.status) setStatus(r.status)
      setApiKey("")
      setNoticeTone(r?.status?.connected ? "success" : "warn")
      setNotice(r?.status?.connected ? "CJ connected successfully." : r?.status?.message || r?.error || "Key saved.")
    } finally {
      setSavingKey(false)
    }
  }

  const toggle = (pid: string) => setSelected((s) => ({ ...s, [pid]: !s[pid] }))
  const chosen = list.filter((i) => selected[i.pid])
  const selectedCount = Object.values(selected).filter(Boolean).length

  const importChosen = async () => {
    if (chosen.length === 0) return
    setImporting(true)
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cj-import", items: chosen, categorySlug, subcategorySlug }),
      }).then((x) => x.json())
      if (r?.imported !== undefined) {
        setNoticeTone("success")
        const variants = r?.variants ? ` · ${r.variants} pre-picked supplier variant(s)` : ""
        setNotice(`Imported ${r.imported} product${r.imported === 1 ? "" : "s"}${r.skipped ? ` (${r.skipped} already in the catalog)` : ""}${variants}.`)
        setSelected({})
        onImported?.()
        void loadTop(categorySlug, subcategorySlug)
      } else {
        setNoticeTone("warn")
        setNotice(r?.error || "Import failed.")
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <MarketPageBar
        icon={Plug}
        title="CJ Import"
        desc="Supplier catalog sync — search CJDropshipping live, then import as many products as you want"
        badge={
          status ? (
            <MarketBadge tone={status.connected ? "emerald" : "neutral"} dot pulse={status.connected}>
              {status.connected ? "Connected" : "Not connected"}
            </MarketBadge>
          ) : undefined
        }
      />

      {/* connection card */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead title="Connection" desc="Your CJ API key is stored server-side only (never publicly readable)." />
        {status ? (
          <p className={cn("mb-3 flex items-center gap-1.5 text-sm font-semibold", status.connected ? "text-emerald-700" : "text-slate-500")}>
            {status.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {status.message}
          </p>
        ) : (
          <p className="mb-3 text-sm text-slate-500">Checking connection...</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className={marketIconInputWrapCls + " flex-1"}>
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder="Paste CJ API key (developers.cjdropshipping.com)"
              autoComplete="off"
              className={marketIconInputCls}
            />
          </div>
          <button onClick={saveKey} disabled={savingKey || !apiKey.trim()} className={marketBtnDarkCls}>
            {savingKey ? "Connecting..." : "Save & connect"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Get your key from CJDropshipping → My CJ → API. Stored in the server-only <code className="rounded bg-slate-100 px-1">site_secrets</code> table.
        </p>
      </div>

      {/* our own best sellers for the selected department */}
      {top.length > 0 && (
        <div className={marketCardCls + " mb-3 p-4 sm:p-5"}>
          <MarketCardHead
            title="Top sellers in this department"
            desc="Your own live products in the selected category — what shoppers actually click"
            icon={TrendingUp}
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {top.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-2">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{t.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.clicks} clicks · {t.conversions} sold · {money(t.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* search + import */}
      <div className={marketCardCls + " p-4 sm:p-5"}>
        <MarketCardHead title="Catalog search" desc="Search by product name or SKU — results are matched to your keyword, never random products." />
        <div className="mb-3 flex flex-col gap-2 lg:flex-row">
          <div className={marketIconInputWrapCls + " flex-1"}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search(1)}
              placeholder='Search CJ, e.g. "smart watch", "camera drone", "power bank"...'
              aria-label="Search CJ catalog"
              className={marketIconInputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <select value={categorySlug} onChange={(e) => { const slug = e.target.value; setCategorySlug(slug); const d = depts.find((x) => x.slug === slug); if (d) setSubcategorySlug(d.subs[0]?.slug ?? "") }} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100" aria-label="Department">
              {depts.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
            <select value={subcategorySlug} onChange={(e) => setSubcategorySlug(e.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100" aria-label="Subcategory">
              {dept.subs.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => search(1)} disabled={loading} className={marketBtnPrimaryCls + " justify-center"}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search CJ
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sort</span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as typeof sort); void search(1) }}
              aria-label="Sort results"
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-amber-500 focus:outline-none"
            >
              <option value="match">Best match</option>
              <option value="listings">Most listed (trending)</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
              <option value="new">Newest</option>
            </select>
          </div>
          <MarketSegmented
            options={[
              { value: "", label: "All products" },
              { value: "trending", label: "Trending" },
              { value: "new", label: "New" },
            ]}
            value={flag}
            onChange={(v) => { setFlag(v as typeof flag); setTimeout(() => search(1), 0) }}
          />
        </div>

        {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
        {!demo && total > 0 && list.length > 0 && (
          <p className="mb-2 text-xs font-semibold text-slate-500">
            {total.toLocaleString()} result{total === 1 ? "" : "s"} · showing {list.length}
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ""} — tick products, then import
          </p>
        )}

        {selectedCount > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-sm font-bold text-amber-800">
              {selectedCount} selected → {dept.name} / {dept.subs.find((s) => s.slug === subcategorySlug)?.name}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected({})} className={marketBtnGhostCls + " text-xs px-2.5 py-1.5"}>
                Clear
              </button>
              <button onClick={importChosen} disabled={importing} className={marketBtnDarkCls}>
                <Download className="h-4 w-4" /> {importing ? "Importing..." : "Import to store"}
              </button>
            </div>
          </div>
        )}

        {demo ? (
          <MarketEmpty
            icon={Plug}
            title="Connect CJ to browse"
            desc="Paste your CJ API key above — the live supplier catalog appears here for one-click import."
          />
        ) : list.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {list.map((item) => (
                <label
                  key={item.pid}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all",
                    selected[item.pid] ? "border-amber-500 shadow-md ring-2 ring-amber-500/20" : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                  )}
                >
                  <div className="relative aspect-square bg-slate-100">
                    {item.productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.productImage} alt={item.productNameEn || item.pid} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                    <input type="checkbox" checked={!!selected[item.pid]} onChange={() => toggle(item.pid)} className="absolute right-2 top-2 h-5 w-5 rounded accent-[#F59E0B]" aria-label={`Select ${item.productNameEn || item.pid}`} />
                    {!!item.listedNum && item.listedNum > 20 && (
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Flame className="h-3 w-3 text-amber-400" /> {item.listedNum} stores
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 min-h-[2em] text-xs font-semibold text-slate-900">{item.productNameEn || item.pid}</p>
                    <p className="mt-1 text-sm font-extrabold tabular-nums text-slate-900">{money(item.sellPrice)}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {[item.categoryFirstName, item.categorySecondName].filter(Boolean).join(" / ") || item.sku || item.pid}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {page < pages && (
              <div className="mt-3 flex justify-center">
                <button onClick={() => search(page + 1)} disabled={loading} className={marketBtnGhostCls}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />} Load more ({page}/{pages})
                </button>
              </div>
            )}
          </>
        ) : (
          <MarketEmpty
            icon={Search}
            title={total === 0 && list.length === 0 && !query ? "Search the supplier catalog" : "No matching products"}
            desc={
              total === 0 && list.length === 0 && !query
                ? "Find products in your departments above, tick them, and import in one click."
                : "CJ returns what matches the keyword — try a shorter word, or pick “Trending” instead of a specific product."
            }
            action={
              !query ? (
                <button onClick={() => search(1)} className={marketBtnPrimaryCls}>
                  <Search className="h-4 w-4" /> Browse the catalog
                </button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  )
}

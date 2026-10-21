"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Download, KeyRound, Plug, RefreshCw, Search, XCircle } from "lucide-react"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"
import {
  marketBtnDarkCls,
  marketBtnPrimaryCls,
  marketCardCls,
  MarketBadge,
  MarketEmpty,
  MarketPageBar,
  marketIconInputCls,
  marketIconInputWrapCls,
  MarketNotice,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface CjItem {
  pid: string
  productNameEn?: string
  productImage?: string
  sellPrice?: number
  categoryFirstName?: string
  categorySecondName?: string
}

export function MarketplaceCjTab({ onImported }: { onImported?: () => void }) {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; message: string } | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [savingKey, setSavingKey] = useState(false)
  const [query, setQuery] = useState("")
  const [list, setList] = useState<CjItem[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [categorySlug, setCategorySlug] = useState(MARKET_DEPARTMENTS[0].slug)
  const [subcategorySlug, setSubcategorySlug] = useState(MARKET_DEPARTMENTS[0].subs[0].slug)
  const [notice, setNotice] = useState("")
  const [importing, setImporting] = useState(false)

  const loadStatus = async () => {
    const r = await fetch("/admin/marketplace/api?section=cj-status").then((x) => x.json()).catch(() => null)
    if (r?.status) setStatus(r.status)
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const dept = MARKET_DEPARTMENTS.find((d) => d.slug === categorySlug) ?? MARKET_DEPARTMENTS[0]

  const search = async () => {
    setLoading(true)
    setNotice("")
    try {
      const params = new URLSearchParams({ section: "cj-list", q: query, size: "20", page: "1" })
      const r = await fetch(`/admin/marketplace/api?${params.toString()}`).then((x) => x.json())
      if (r?.demo) {
        setDemo(true)
        setList([])
        setTotal(null)
        setNotice("CJ API key not set — connect above to search live CJ products.")
      } else {
        setDemo(false)
        setList(r?.list || [])
        setTotal(r?.total ?? null)
      }
    } catch {
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
      setNotice(r?.status?.connected ? "CJ connected successfully." : (r?.status?.message || r?.error || "Key saved."))
    } finally {
      setSavingKey(false)
    }
  }

  const toggle = (pid: string) => setSelected((s) => ({ ...s, [pid]: !s[pid] }))
  const chosen = list.filter((i) => selected[i.pid])

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
        setNotice(`Imported ${r.imported} products${r.skipped ? ` (${r.skipped} already existed)` : ""} into TechPivo Market.`)
        setSelected({})
        onImported?.()
      } else {
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
        desc="Supplier catalog sync — search CJ live, then import into your catalog"
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
        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Connection</p>
        {status ? (
          <p className={`mb-3 flex items-center gap-1.5 text-sm font-semibold ${status.connected ? "text-emerald-700" : "text-slate-500"}`}>
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
          <button
            onClick={saveKey}
            disabled={savingKey || !apiKey.trim()}
            className={marketBtnDarkCls}
          >
            {savingKey ? "Connecting..." : "Save & connect"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Get your key from CJDropshipping → My CJ → API. Stored in <code className="rounded bg-slate-100 px-1">site_settings.cj_api_key</code> (server-only reads).
        </p>
      </div>

      {/* search + import */}
      <div className={marketCardCls + " p-4 sm:p-5"}>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Catalog search</p>
        <div className="mb-3 flex flex-col gap-2 lg:flex-row">
          <div className={marketIconInputWrapCls + " flex-1"}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder='Search CJ, e.g. "smart watch", "camera drone", "power bank"...'
              aria-label="Search CJ catalog"
              className={marketIconInputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <select value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); const d = MARKET_DEPARTMENTS.find((x) => x.slug === e.target.value); if (d) setSubcategorySlug(d.subs[0].slug) }} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100" aria-label="Department">
              {MARKET_DEPARTMENTS.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
            <select value={subcategorySlug} onChange={(e) => setSubcategorySlug(e.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100" aria-label="Subcategory">
              {dept.subs.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
          <button onClick={search} disabled={loading} className={marketBtnPrimaryCls + " justify-center"}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search CJ
          </button>
        </div>

        {notice && <MarketNotice tone="info">{notice}</MarketNotice>}
        {!demo && total !== null && list.length > 0 && (
          <p className="mb-2 text-xs font-semibold text-slate-500">
            {total.toLocaleString()} result{total === 1 ? "" : "s"} — showing first {list.length} · tick to select, then import
          </p>
        )}

        {chosen.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-sm font-bold text-amber-800">{chosen.length} selected → {dept.name} / {dept.subs.find((s) => s.slug === subcategorySlug)?.name}</span>
            <button onClick={importChosen} disabled={importing} className={marketBtnDarkCls}>
              <Download className="h-4 w-4" /> {importing ? "Importing..." : "Import to store"}
            </button>
          </div>
        )}

        {demo ? (
          <MarketEmpty
            icon={Plug}
            title="Connect CJ to browse"
            desc="Paste your CJ API key above — the live supplier catalog appears here for one-click import."
          />
        ) : list.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {list.map((item) => (
              <label key={item.pid} className={cn("cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all", selected[item.pid] ? "border-amber-500 shadow-md ring-2 ring-amber-500/20" : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm")}>
                <div className="relative aspect-square bg-slate-100">
                  {item.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.productImage} alt={item.productNameEn || item.pid} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  <input type="checkbox" checked={!!selected[item.pid]} onChange={() => toggle(item.pid)} className="absolute right-2 top-2 h-5 w-5 rounded accent-[#F59E0B]" aria-label={`Select ${item.productNameEn || item.pid}`} />
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-[2em] text-xs font-semibold text-slate-900">{item.productNameEn || item.pid}</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-slate-900">{item.sellPrice != null ? `$${Number(item.sellPrice).toFixed(2)}` : "—"}</p>
                  <p className="truncate text-[11px] text-slate-400">{[item.categoryFirstName, item.categorySecondName].filter(Boolean).join(" / ") || item.pid}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <MarketEmpty
            icon={Search}
            title={total === null ? "Search the supplier catalog" : "No results"}
            desc={
              total === null
                ? "Find products in your departments above, tick them, and import in one click."
                : "Try a different keyword — CJ names vary by supplier."
            }
          />
        )}
      </div>
    </div>
  )
}

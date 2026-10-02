"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Download, KeyRound, Plug, RefreshCw, Search, XCircle } from "lucide-react"
import { MARKET_DEPARTMENTS } from "@/lib/marketplace-categories"

interface CjItem {
  pid: string
  productNameEn?: string
  productImage?: string
  sellPrice?: number
  categoryFirstName?: string
  categorySecondName?: string
}

export function MarketplaceCjTab({ onImported }: { onImported: () => void }) {
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
        onImported()
      } else {
        setNotice(r?.error || "Import failed.")
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="grid gap-4">
      {/* connection card */}
      <div className="bg-white border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Plug className="h-5 w-5 text-amber-600" />
          <h2 className="font-bold text-slate-900">CJDropshipping connection</h2>
        </div>
        {status ? (
          <p className={`text-sm flex items-center gap-1.5 mb-3 ${status.connected ? "text-emerald-600" : "text-slate-500"}`}>
            {status.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {status.message}
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-3">Checking connection...</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder="Paste CJ API key (developers.cjdropshipping.com)"
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            onClick={saveKey}
            disabled={savingKey || !apiKey.trim()}
            className="bg-slate-900 text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {savingKey ? "Connecting..." : "Save & connect"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Get your key from CJDropshipping → My CJ → API. Stored in <code>site_settings.cj_api_key</code> (server-only reads).
        </p>
      </div>

      {/* search + import */}
      <div className="bg-white border rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder='Search CJ, e.g. "smart watch", "camera drone", "power bank"...'
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <select value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); const d = MARKET_DEPARTMENTS.find((x) => x.slug === e.target.value); if (d) setSubcategorySlug(d.subs[0].slug) }} className="border rounded-lg px-3 py-2 text-sm bg-white" aria-label="Department">
            {MARKET_DEPARTMENTS.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
          <select value={subcategorySlug} onChange={(e) => setSubcategorySlug(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white" aria-label="Subcategory">
            {dept.subs.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
          <button onClick={search} disabled={loading} className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-60 inline-flex items-center gap-1.5 justify-center">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search CJ
          </button>
        </div>

        {notice && <p className="text-sm text-slate-600 bg-slate-50 border rounded-lg px-3 py-2 mb-3">{notice}</p>}

        {chosen.length > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <span className="text-sm font-semibold text-amber-800">{chosen.length} selected → {dept.name} / {dept.subs.find((s) => s.slug === subcategorySlug)?.name}</span>
            <button onClick={importChosen} disabled={importing} className="bg-slate-900 text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-60 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> {importing ? "Importing..." : "Import to store"}
            </button>
          </div>
        )}

        {demo ? (
          <p className="text-sm text-slate-500 text-center py-8">Connect your CJ API key to browse live products here.</p>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((item) => (
              <label key={item.pid} className={`border rounded-xl overflow-hidden cursor-pointer transition-colors ${selected[item.pid] ? "border-amber-500 ring-2 ring-amber-500/20" : "hover:border-slate-300"}`}>
                <div className="aspect-square bg-slate-100 relative">
                  {item.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.productImage} alt={item.productNameEn || item.pid} className="w-full h-full object-cover" loading="lazy" />
                  ) : null}
                  <input type="checkbox" checked={!!selected[item.pid]} onChange={() => toggle(item.pid)} className="absolute top-2 right-2 h-5 w-5 accent-[#F59E0B]" aria-label={`Select ${item.pid}`} />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-2 min-h-[2em]">{item.productNameEn || item.pid}</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{item.sellPrice != null ? `$${Number(item.sellPrice).toFixed(2)}` : "—"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{[item.categoryFirstName, item.categorySecondName].filter(Boolean).join(" / ") || item.pid}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            {total === null ? "Search CJ to find products from your categories, then import them in one click." : "No results."}
          </p>
        )}
      </div>
    </div>
  )
}

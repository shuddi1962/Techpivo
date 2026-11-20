"use client"

import { useCallback, useEffect, useState } from "react"
import { CreditCard, Edit2, Trash2, Plus, ShieldCheck, X } from "lucide-react"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  marketInputCls,
  marketThCls,
  MarketBadge,
  MarketCardHead,
  MarketEmpty,
  MarketField,
  MarketKpi,
  MarketPageBar,
  MarketNotice,
  MarketTableShell,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface Commission {
  id: string
  seller_id: string
  category_slug: string | null
  subcategory_slug: string | null
  commission_percent: number
  min_commission_usd: number
  created_at: string
  updated_at: string
}

const money = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—"
  return n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2)
}

const pct = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—%"
  return n.toFixed(0) + "%"
}

export function MarketplaceCommissionsTab() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")

  // Edit form
  const [editing, setEditing] = useState<Commission | null>(null)
  const [form, setForm] = useState<{
    seller_id: string
    category_slug: string
    subcategory_slug: string
    commission_percent: string
    min_commission_usd: string
  }>({ seller_id: "", category_slug: "", subcategory_slug: "", commission_percent: "", min_commission_usd: "0" })

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const res = await fetch("/admin/marketplace/api?section=seller-commissions").then((r) => r.json())
      if (res?.error) throw new Error(res.error)
      setCommissions(Array.isArray(res?.commissions) ? res.commissions : [])
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load commissions.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sellers = Array.from(new Set(commissions.map((c) => c.seller_id))).sort()
  const totalCommission = commissions.reduce((s, c) => s + c.commission_percent, 0)
  const avgCommission = commissions.length > 0 ? totalCommission / commissions.length : 0

  // ---------- commission actions ----------
  const startAdd = () => {
    setEditing(null)
    setForm({ seller_id: "", category_slug: "", subcategory_slug: "", commission_percent: "", min_commission_usd: "0" })
  }

  const startEdit = (c: Commission) => {
    setEditing(c)
    setForm({
      seller_id: c.seller_id,
      category_slug: c.category_slug || "",
      subcategory_slug: c.subcategory_slug || "",
      commission_percent: c.commission_percent.toString(),
      min_commission_usd: c.min_commission_usd.toString(),
    })
  }

  const save = async () => {
    if (!form.seller_id.trim()) {
      setNoticeTone("warn")
      setNotice("Seller id is required.")
      return
    }
    const pct = Number(form.commission_percent)
    const min = Number(form.min_commission_usd)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setNoticeTone("warn")
      setNotice("Commission must be 0–100.")
      return
    }
    if (!Number.isFinite(min) || min < 0) {
      setNoticeTone("warn")
      setNotice("Min commission must be ≥ 0.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seller-commissions-save",
          id: editing?.id || "",
          seller_id: form.seller_id.trim(),
          category_slug: form.category_slug.trim() || null,
          subcategory_slug: form.subcategory_slug.trim() || null,
          commission_percent: pct,
          min_commission_usd: min,
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Commission rule saved.")
        setEditing(null)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm("Delete this commission rule?")) return
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seller-commissions-delete", id }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Commission rule removed.")
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Delete failed.")
    }
  }

  return (
    <div>
      <MarketPageBar
        icon={CreditCard}
        title="Seller Commissions"
        desc="Commission rules per seller, optionally scoped to a category or subcategory. Keeps seller earnings separate from TechPivo platform revenue."
        badge={<MarketBadge tone="emerald" dot>Live rules</MarketBadge>}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-3">
        <MarketKpi label="Commission rules" value={commissions.length.toString()} sub={sellers.length + " sellers"} icon={ShieldCheck} />
        <MarketKpi label="Average commission" value={pct(avgCommission)} sub="across all rules" />
        <MarketKpi label="Sellers with rules" value={sellers.length.toString()} sub="active commission rules" />
      </div>

      {/* ---------- Add/edit form ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title={editing ? "Edit commission rule" : "New commission rule"}
          desc="Set the marketplace commission % a seller pays, optionally scoped to a category/subcategory."
          icon={CreditCard}
        />
        <div className="grid gap-2 sm:grid-cols-4">
          <MarketField label="Seller id" hint="The seller's profile id (UUID)">
            <input
              value={form.seller_id}
              onChange={(e) => setForm({ ...form, seller_id: e.target.value })}
              className={marketInputCls}
            />
          </MarketField>
          <MarketField label="Category slug" hint="Leave blank for all categories">
            <input
              value={form.category_slug}
              onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
              className={marketInputCls}
            />
          </MarketField>
          <MarketField label="Subcategory slug" hint="Leave blank for all subcategories">
            <input
              value={form.subcategory_slug}
              onChange={(e) => setForm({ ...form, subcategory_slug: e.target.value })}
              className={marketInputCls}
            />
          </MarketField>
          <MarketField label="Commission %" hint="0–100 of the sale">
            <input
              value={form.commission_percent}
              onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={marketInputCls}
            />
          </MarketField>
          <MarketField label="Min commission ($)" hint="Floor per sale">
            <input
              value={form.min_commission_usd}
              onChange={(e) => setForm({ ...form, min_commission_usd: e.target.value })}
              type="number"
              min="0"
              step="0.01"
              className={marketInputCls}
            />
          </MarketField>
          <div className="flex items-end">
            <button onClick={() => setEditing(null)} className={marketBtnGhostCls}>
              Cancel
            </button>
            <button onClick={save} disabled={loading} className={marketBtnPrimaryCls}>
              {loading ? "Saving…" : "Save rule"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5"}>
        <MarketCardHead
          title="All commission rules"
          desc="The most specific rule wins: subcategory > category > seller-wide."
          icon={ShieldCheck}
        />
        {commissions.length === 0 ? (
          <MarketEmpty icon={ShieldCheck} title="No rules yet" desc="Add a commission rule to start charging sellers." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Seller</th>
                  <th className={marketThCls}>Category</th>
                  <th className={marketThCls}>Subcategory</th>
                  <th className={cn(marketThCls, "text-right")}>Commission</th>
                  <th className={cn(marketThCls, "text-right")}>Min ($)</th>
                  <th className={cn(marketThCls, "text-center")}>Scope</th>
                  <th className={marketThCls} w-32>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.map((c) => {
                  const scope =
                    c.subcategory_slug ? "subcategory" : c.category_slug ? "category" : "seller-wide"
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-900 truncate max-w-[150px] block">
                          {c.seller_id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 truncate max-w-[120px] block">{c.category_slug || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 truncate max-w-[120px] block">{c.subcategory_slug || "—"}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-900">
                        <span className="font-bold">{c.commission_percent.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-500">{money(c.min_commission_usd)}</td>
                      <td className="px-4 py-3 text-center">
                        <MarketBadge tone="neutral">{scope}</MarketBadge>
                      </td>
                      <td className="px-4 py-3 textRight">
                        <button
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="ml-2 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}

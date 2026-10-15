"use client"

import { useCallback, useEffect, useState } from "react"
import { BadgePercent, Loader2, Pencil, Plus, Power, Save, Trash2 } from "lucide-react"
import { blankCoupon, type MarketCoupon } from "@/lib/marketplace-coupons"
import { isoToLocalInput } from "@/lib/marketplace-banners"

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"

export function MarketplacePromotionsTab() {
  const [coupons, setCoupons] = useState<MarketCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [editing, setEditing] = useState<MarketCoupon | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=coupons").then((x) => x.json()).catch(() => null)
    if (r?.coupons) setCoupons(r.coupons as MarketCoupon[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const poll = setInterval(load, 60000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 3500)
  }

  const persist = async (next: MarketCoupon[]) => {
    setSaving(true)
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "coupons-save", coupons: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      setCoupons((data?.coupons as MarketCoupon[]) || next)
      flash("Coupons saved — live at checkout instantly")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    setEditing(blankCoupon())
    setShowForm(true)
  }

  const openEdit = (c: MarketCoupon) => {
    setEditing({ ...c })
    setShowForm(true)
  }

  const saveForm = () => {
    if (!editing) return
    const code = editing.code.trim().toUpperCase()
    if (!/^[A-Z0-9-]{2,24}$/.test(code)) {
      flash("Code needs 2–24 letters, numbers or dashes.")
      return
    }
    if (editing.type === "percent" && (editing.value < 1 || editing.value > 90)) {
      flash("Percent must be between 1 and 90.")
      return
    }
    if (editing.type === "fixed" && editing.value <= 0) {
      flash("Fixed amount must be above 0.")
      return
    }
    const row: MarketCoupon = { ...editing, code }
    const exists = coupons.some((c) => c.id === row.id)
    const next = exists ? coupons.map((c) => (c.id === row.id ? row : c)) : [...coupons, row]
    if (!exists && coupons.some((c) => c.code === row.code)) {
      flash("That code already exists — edit it instead.")
      return
    }
    setShowForm(false)
    setEditing(null)
    void persist(next)
  }

  const remove = (c: MarketCoupon) => {
    if (!confirm(`Delete coupon ${c.code}? Shoppers can no longer use it.`)) return
    void persist(coupons.filter((x) => x.id !== c.id))
  }

  const toggle = (c: MarketCoupon) => {
    void persist(coupons.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-600" /> Loading promotions...
      </div>
    )
  }

  return (
    <div>
      {notice && (
        <div className="mb-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">{notice}</div>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {coupons.length} coupon{coupons.length === 1 ? "" : "s"} · shoppers enter codes at checkout, discounts apply before payment.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 text-sm font-bold bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] rounded-lg px-3 py-2"
        >
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </div>
      {coupons.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <BadgePercent className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-900">No coupons yet</p>
          <p className="text-sm text-slate-500 mt-1">Create one — e.g. WELCOME10 for 10% off every first order.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {coupons.map((c) => (
            <div key={c.id} className={`bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3 ${c.active ? "" : "opacity-60"}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BadgePercent className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold text-slate-900 tracking-wide">{c.code}</p>
                <p className="text-xs text-slate-500">
                  {c.type === "percent" ? `${c.value}% off` : `$${c.value.toFixed(2)} off`}
                  {c.min_order_usd > 0 && ` · min $${c.min_order_usd.toFixed(2)}`}
                  {c.max_uses > 0 && ` · ${c.uses}/${c.max_uses} used`}
                  {c.ends_at && Date.parse(c.ends_at) > Date.now() && ` · ends ${new Date(c.ends_at).toLocaleDateString()}`}
                  {c.ends_at && Date.parse(c.ends_at) <= Date.now() && ` · expired`}
                  {!c.active && ` · paused`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button title={c.active ? "Pause" : "Activate"} onClick={() => toggle(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <Power className="h-4 w-4" />
                </button>
                <button title="Edit" onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <Pencil className="h-4 w-4" />
                </button>
                <button title="Delete" onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-slate-900 mb-4">{coupons.some((c) => c.id === editing.id) ? "Edit coupon" : "New coupon"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Code *</label>
                  <input
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24) })}
                    placeholder="WELCOME10"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Type</label>
                  <select
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value === "fixed" ? "fixed" : "percent" })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="percent">Percent %</option>
                    <option value="fixed">Fixed $</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">{editing.type === "percent" ? "Percent (1–90)" : "Amount ($)"}</label>
                  <input
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: Math.max(0, Number(e.target.value) || 0) })}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Min order ($, 0 = none)</label>
                  <input
                    value={editing.min_order_usd}
                    onChange={(e) => setEditing({ ...editing, min_order_usd: Math.max(0, Number(e.target.value) || 0) })}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Starts (optional)</label>
                  <input
                    type="datetime-local"
                    value={isoToLocalInput(editing.starts_at)}
                    onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className={`${inputCls} mt-1 text-xs`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Ends (optional)</label>
                  <input
                    type="datetime-local"
                    value={isoToLocalInput(editing.ends_at)}
                    onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className={`${inputCls} mt-1 text-xs`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Usage limit (0 = unlimited)</label>
                  <input
                    value={editing.max_uses}
                    onChange={(e) => setEditing({ ...editing, max_uses: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                    type="number"
                    min="0"
                    step="1"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 mt-5">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#F59E0B]" /> Active
                </label>
              </div>
              {editing.max_uses > 0 && (
                <p className="text-[11px] text-slate-500">Used {editing.uses} of {editing.max_uses} times.</p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={saveForm} disabled={saving} className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] rounded-lg py-2.5 text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving..." : "Save coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

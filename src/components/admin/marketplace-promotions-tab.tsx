"use client"

import { useCallback, useEffect, useState } from "react"
import { BadgePercent, Loader2, Pencil, Plus, Power, Save, Trash2 } from "lucide-react"
import { blankCoupon, type MarketCoupon } from "@/lib/marketplace-coupons"
import { isoToLocalInput } from "@/lib/marketplace-banners"
import { createClient } from "@/lib/supabase/client"
import {
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  marketIconBtnCls,
  marketIconBtnDangerCls,
  marketInputCls,
  MarketBadge,
  MarketEmpty,
  MarketField,
  MarketKpi,
  MarketLoading,
  MarketModal,
  MarketNotice,
  MarketPageBar,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

export function MarketplacePromotionsTab() {
  const [coupons, setCoupons] = useState<MarketCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [editing, setEditing] = useState<MarketCoupon | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch("/admin/marketplace/api?section=coupons", { cache: "no-store" }).then((x) => x.json()).catch(() => null)
    if (r?.coupons) setCoupons(r.coupons as MarketCoupon[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Live: coupon edits (here, checkout usage bumps) arrive instantly.
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_promos_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe()
    const poll = setInterval(load, 60000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
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

  const activeCount = coupons.filter((c) => c.active).length
  const totalUses = coupons.reduce((s, c) => s + (c.uses || 0), 0)

  if (loading) {
    return <MarketLoading label="Loading promotions..." />
  }

  return (
    <div>
      <MarketPageBar
        icon={BadgePercent}
        title="Promotions"
        desc="Coupons & discounts — codes apply at checkout instantly"
        actions={
          <button type="button" onClick={openCreate} className={marketBtnPrimaryCls}>
            <Plus className="h-4 w-4" /> New coupon
          </button>
        }
      />
      {notice && <MarketNotice>{notice}</MarketNotice>}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MarketKpi label="Coupons" value={String(coupons.length)} sub={`${activeCount} active`} icon={BadgePercent} tone="amber" />
        <MarketKpi label="Redemptions" value={String(totalUses)} sub="all-time uses" tone="violet" />
        <MarketKpi
          label="Paused / expired"
          value={String(coupons.filter((c) => !c.active || (!!c.ends_at && Date.parse(c.ends_at) <= Date.now())).length)}
          sub="not redeemable"
          tone="neutral"
        />
        <MarketKpi label="Sync" value="Live" sub="realtime · 60s poll · focus" tone="emerald" />
      </div>

      {coupons.length === 0 ? (
        <MarketEmpty
          icon={BadgePercent}
          title="No coupons yet"
          desc="Create one — e.g. WELCOME10 for 10% off every first order. Shoppers enter codes at checkout."
          action={
            <button type="button" onClick={openCreate} className={marketBtnPrimaryCls}>
              <Plus className="h-4 w-4" /> New coupon
            </button>
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {coupons.map((c) => {
            const expired = !!c.ends_at && Date.parse(c.ends_at) <= Date.now()
            return (
              <div key={c.id} className={cn(marketCardCls, "flex flex-wrap items-center gap-3 p-4", !c.active && "opacity-60")}>
                <span className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  !c.active || expired ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-600"
                )}>
                  <BadgePercent className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-mono font-bold tracking-wide text-slate-900">
                    {c.code}
                    {!c.active && <MarketBadge tone="neutral">Paused</MarketBadge>}
                    {expired && <MarketBadge tone="red">Expired</MarketBadge>}
                    {c.active && !expired && <MarketBadge tone="emerald" dot pulse>Live</MarketBadge>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.type === "percent" ? `${c.value}% off` : `$${c.value.toFixed(2)} off`}
                    {c.min_order_usd > 0 && ` · min $${c.min_order_usd.toFixed(2)}`}
                    {c.max_uses > 0 ? ` · ${c.uses}/${c.max_uses} used` : c.uses > 0 ? ` · ${c.uses} used` : ""}
                    {c.ends_at && !expired && ` · ends ${new Date(c.ends_at).toLocaleDateString()}`}
                  </p>
                  {c.max_uses > 0 && (
                    <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full rounded-full", expired || !c.active ? "bg-slate-300" : "bg-amber-500")}
                        style={{ width: `${Math.min(100, Math.round((c.uses / c.max_uses) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button title={c.active ? "Pause" : "Activate"} aria-label={c.active ? `Pause ${c.code}` : `Activate ${c.code}`} onClick={() => toggle(c)} className={marketIconBtnCls}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button title="Edit" aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)} className={marketIconBtnCls}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button title="Delete" aria-label={`Delete ${c.code}`} onClick={() => remove(c)} className={marketIconBtnDangerCls}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <MarketModal
        open={showForm && !!editing}
        onClose={() => setShowForm(false)}
        title={editing && coupons.some((c) => c.id === editing.id) ? "Edit coupon" : "New coupon"}
        desc="Codes apply instantly at checkout."
        footer={
          <>
            <button onClick={() => setShowForm(false)} className={marketBtnGhostCls}>
              Cancel
            </button>
            <button onClick={saveForm} disabled={saving} className={marketBtnPrimaryCls}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving…" : "Save coupon"}
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Code *" hint="2–24 letters, numbers or dashes.">
                <input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24) })}
                  placeholder="WELCOME10"
                  className={marketInputCls + " font-mono"}
                />
              </MarketField>
              <MarketField label="Type">
                <select
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value === "fixed" ? "fixed" : "percent" })}
                  className={marketInputCls + " cursor-pointer"}
                >
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed $</option>
                </select>
              </MarketField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label={editing.type === "percent" ? "Percent (1–90)" : "Amount ($)"}>
                <input
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: Math.max(0, Number(e.target.value) || 0) })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Min order ($, 0 = none)">
                <input
                  value={editing.min_order_usd}
                  onChange={(e) => setEditing({ ...editing, min_order_usd: Math.max(0, Number(e.target.value) || 0) })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Starts (optional)">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(editing.starts_at)}
                  onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                  className={marketInputCls + " text-xs"}
                />
              </MarketField>
              <MarketField label="Ends (optional)">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(editing.ends_at)}
                  onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                  className={marketInputCls + " text-xs"}
                />
              </MarketField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Usage limit (0 = unlimited)" hint={editing.max_uses > 0 ? `Used ${editing.uses} of ${editing.max_uses} times.` : undefined}>
                <input
                  value={editing.max_uses}
                  onChange={(e) => setEditing({ ...editing, max_uses: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  type="number"
                  min="0"
                  step="1"
                  className={marketInputCls}
                />
              </MarketField>
              <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#F59E0B]" /> Active
              </label>
            </div>
          </div>
        )}
      </MarketModal>
    </div>
  )
}

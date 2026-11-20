"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BadgePercent,
  Loader2,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
  Package,
  Flame,
  Clock,
  X,
} from "lucide-react"
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

interface BundlePromotion {
  id: string
  name: string
  type: string
  discount_type: "percent" | "fixed"
  discount_value: number
  min_order_usd: number
  max_discount_usd: number | null
  max_uses: number | null
  code: string | null
  funding_source: string
  min_profit_usd: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
  products: Array<{ id: string; name: string }>
}

function blankBundle(): BundlePromotion {
  return {
    id: `bundle${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    type: "bundle",
    discount_type: "percent",
    discount_value: 15,
    min_order_usd: 0,
    max_discount_usd: null,
    max_uses: 0,
    code: null,
    funding_source: "techpivo",
    min_profit_usd: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    created_at: "",
    products: [],
  }
}

export function MarketplacePromotionsTab() {
  const [coupons, setCoupons] = useState<MarketCoupon[]>([])
  const [bundles, setBundles] = useState<BundlePromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [editing, setEditing] = useState<MarketCoupon | null>(null)
  const [editingBundle, setEditingBundle] = useState<BundlePromotion | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBundleForm, setShowBundleForm] = useState(false)

  const load = useCallback(async () => {
    const [cRes, bRes] = await Promise.all([
      fetch("/admin/marketplace/api?section=coupons", { cache: "no-store" }).then((x) => x.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=promotions", { cache: "no-store" }).then((x) => x.json()).catch(() => null),
    ])
    if (cRes?.coupons) setCoupons(cRes.coupons as MarketCoupon[])
    if (bRes?.promotions) {
      setBundles((bRes.promotions as BundlePromotion[]).filter((p) => p.type === "bundle"))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_promos_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_promotions" }, () => load())
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

  // ── Coupons ──────────────────────────────────────────────────────────────

  const persistCoupons = async (next: MarketCoupon[]) => {
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

  const saveCouponForm = () => {
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
    void persistCoupons(next)
  }

  const removeCoupon = (c: MarketCoupon) => {
    if (!confirm(`Delete coupon ${c.code}? Shoppers can no longer use it.`)) return
    void persistCoupons(coupons.filter((x) => c.id !== x.id))
  }

  const toggleCoupon = (c: MarketCoupon) => {
    void persistCoupons(coupons.map((x) => (c.id === x.id ? { ...x, active: !x.active } : x)))
  }

  // ── Bundles ──────────────────────────────────────────────────────────────

  const persistBundle = async (next: BundlePromotion[]) => {
    setSaving(true)
    try {
      for (const b of next) {
        const res = await fetch("/admin/marketplace/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "promotions-save",
            id: b.id,
            name: b.name,
            type: b.type,
            discount_type: b.discount_type,
            discount_value: b.discount_value,
            min_order_usd: b.min_order_usd,
            max_discount_usd: b.max_discount_usd,
            max_uses: b.max_uses,
            code: b.code,
            funding_source: b.funding_source,
            min_profit_usd: b.min_profit_usd,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            is_active: b.is_active,
            products: b.products,
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || "Save failed")
      }
      setBundles(next)
      load()
      flash("Bundle discount saved — live at checkout instantly")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const openCreateBundle = () => {
    setEditingBundle(blankBundle())
    setShowBundleForm(true)
  }

  const openEditBundle = (b: BundlePromotion) => {
    setEditingBundle({ ...b })
    setShowBundleForm(true)
  }

  const saveBundleForm = () => {
    if (!editingBundle) return
    const b = editingBundle
    if (!b.name.trim()) {
      flash("Bundle name is required.")
      return
    }
    if (b.discount_type === "percent" && (b.discount_value < 1 || b.discount_value > 90)) {
      flash("Percent must be between 1 and 90.")
      return
    }
    if (b.discount_type === "fixed" && b.discount_value <= 0) {
      flash("Fixed amount must be above 0.")
      return
    }
    if (b.products.length < 2) {
      flash("Add at least 2 products to the bundle.")
      return
    }
    const row: BundlePromotion = { ...b }
    const exists = bundles.some((x) => x.id === row.id)
    const next = exists ? bundles.map((x) => (x.id === row.id ? row : x)) : [...bundles, row]
    setShowBundleForm(false)
    setEditingBundle(null)
    void persistBundle(next)
  }

  const removeBundle = (b: BundlePromotion) => {
    if (!confirm(`Delete bundle "${b.name}"?`)) return
    const next = bundles.filter((x) => b.id !== x.id)
    void persistBundle(next)
  }

  const toggleBundle = (b: BundlePromotion) => {
    const next = bundles.map((x) => (b.id === x.id ? { ...x, is_active: !x.is_active } : x))
    void persistBundle(next)
  }

  const activeCouponCount = coupons.filter((c) => c.active).length
  const activeBundleCount = bundles.filter((b) => b.is_active).length
  const totalUses = coupons.reduce((s, c) => s + (c.uses || 0), 0)

  if (loading) {
    return <MarketLoading label="Loading promotions..." />
  }

  return (
    <div>
      <MarketPageBar
        icon={BadgePercent}
        title="Promotions"
        desc="Coupons & bundle discounts — codes apply at checkout instantly"
        actions={
          <>
            <button type="button" onClick={openCreate} className={marketBtnPrimaryCls}>
              <Plus className="h-4 w-4" /> New coupon
            </button>
            <button type="button" onClick={openCreateBundle} className="ml-2 bg-[#10B981] hover:bg-[#059669] text-[#0F172A] text-sm font-bold py-2 px-4 rounded-lg transition-all active:scale-[0.99] flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> New bundle
            </button>
          </>
        }
      />
      {notice && <MarketNotice>{notice}</MarketNotice>}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-6">
        <MarketKpi label="Coupons" value={String(coupons.length)} sub={`${activeCouponCount} active`} icon={BadgePercent} tone="amber" />
        <MarketKpi label="Bundle discounts" value={String(bundles.length)} sub={`${activeBundleCount} active`} icon={Package} tone="sky" />
        <MarketKpi label="Redemptions" value={String(totalUses)} sub="all-time uses" tone="violet" />
        <MarketKpi label="Sync" value="Live" sub="realtime · 60s poll · focus" tone="emerald" />
      </div>

      {/* ── Coupons ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BadgePercent className="h-5 w-5 text-amber-600" />
          <h3 className="font-bold text-slate-900 text-sm">Coupon codes</h3>
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
                  </div>
                  <div className="flex items-center gap-1">
                    <button title={c.active ? "Pause" : "Activate"} aria-label={c.active ? `Pause ${c.code}` : `Activate ${c.code}`} onClick={() => toggleCoupon(c)} className={marketIconBtnCls}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button title="Edit" aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)} className={marketIconBtnCls}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button title="Delete" aria-label={`Delete ${c.code}`} onClick={() => removeCoupon(c)} className={marketIconBtnDangerCls}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bundles ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-sky-600" />
          <h3 className="font-bold text-slate-900 text-sm">Bundle discounts (buy X together)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Shoppers get a discount when they purchase all products in the bundle together.
        </p>
        {bundles.length === 0 ? (
          <MarketEmpty
            icon={Package}
            title="No bundle discounts yet"
            desc="Create one — e.g. “Laptop + Mouse + Case” for 15% off when bought together."
            action={
              <button type="button" onClick={openCreateBundle} className={marketBtnPrimaryCls}>
                <Plus className="h-4 w-4" /> New bundle
              </button>
            }
          />
        ) : (
          <div className="grid gap-2.5">
            {bundles.map((b) => {
              const expired = !!b.ends_at && Date.parse(b.ends_at) <= Date.now()
              return (
                <div key={b.id} className={cn(marketCardCls, "flex flex-wrap items-center gap-3 p-4", !b.is_active && "opacity-60")}>
                  <span className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    !b.is_active || expired ? "bg-slate-100 text-slate-400" : "bg-sky-50 text-sky-600"
                  )}>
                    <Package className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold tracking-wide text-slate-900">
                      {b.name}
                      {!b.is_active && <MarketBadge tone="neutral">Paused</MarketBadge>}
                      {expired && <MarketBadge tone="red">Expired</MarketBadge>}
                      {b.is_active && !expired && <MarketBadge tone="emerald" dot pulse>Live</MarketBadge>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {b.discount_type === "percent" ? `${b.discount_value}% off bundle` : `$${b.discount_value.toFixed(2)} off bundle`}
                      {b.min_order_usd > 0 && ` · min $${b.min_order_usd.toFixed(2)}`}
                      {b.products.length} product{b.products.length !== 1 ? "s" : ""} in bundle
                      {b.ends_at && !expired && ` · ends ${new Date(b.ends_at).toLocaleDateString()}`}                    </p>
                    <p className="mt-1 text-[10px] text-slate-400 truncate max-w-[300px]">
                      {b.products.map((p) => p.name).join(" + ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button title={b.is_active ? "Pause" : "Activate"} aria-label={b.is_active ? `Pause ${b.name}` : `Activate ${b.name}`} onClick={() => toggleBundle(b)} className={marketIconBtnCls}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button title="Edit" aria-label={`Edit ${b.name}`} onClick={() => openEditBundle(b)} className={marketIconBtnCls}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button title="Delete" aria-label={`Delete ${b.name}`} onClick={() => removeBundle(b)} className={marketIconBtnDangerCls}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Coupon form ── */}
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
            <button onClick={saveCouponForm} disabled={saving} className={marketBtnPrimaryCls}>
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

      {/* ── Bundle form ── */}
      <MarketModal
        open={showBundleForm && !!editingBundle}
        onClose={() => setShowBundleForm(false)}
        title={editingBundle && bundles.some((b) => b.id === editingBundle.id) ? "Edit bundle discount" : "New bundle discount"}
        desc="Shoppers get a discount when they buy every product in the bundle together."
        footer={
          <>
            <button onClick={() => setShowBundleForm(false)} className={marketBtnGhostCls}>
              Cancel
            </button>
            <button onClick={saveBundleForm} disabled={saving} className={marketBtnPrimaryCls}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving…" : "Save bundle"}
            </button>
          </>
        }
      >
        {editingBundle && (
          <div className="space-y-3">
            <MarketField label="Bundle name *" hint="e.g. Laptop + Mouse + Case.">
              <input
                value={editingBundle.name}
                onChange={(e) => setEditingBundle({ ...editingBundle, name: e.target.value.trim().slice(0, 120) })}
                placeholder="Home Office Starter Pack"
                className={marketInputCls}
              />
            </MarketField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Type">
                <select
                  value={editingBundle.discount_type}
                  onChange={(e) => setEditingBundle({ ...editingBundle, discount_type: e.target.value as "percent" | "fixed" })}
                  className={marketInputCls + " cursor-pointer"}
                >
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed $</option>
                </select>
              </MarketField>
              <MarketField label={editingBundle.discount_type === "percent" ? "Percent (1–90)" : "Amount ($)"}>
                <input
                  value={editingBundle.discount_value}
                  onChange={(e) => setEditingBundle({ ...editingBundle, discount_value: Math.max(0, Number(e.target.value) || 0) })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Min order ($, 0 = none)">
                <input
                  value={editingBundle.min_order_usd}
                  onChange={(e) => setEditingBundle({ ...editingBundle, min_order_usd: Math.max(0, Number(e.target.value) || 0) })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Min profit per bundle ($)">
                <input
                  value={editingBundle.min_profit_usd}
                  onChange={(e) => setEditingBundle({ ...editingBundle, min_profit_usd: Math.max(0, Number(e.target.value) || 0) })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Funding source">
                <select
                  value={editingBundle.funding_source}
                  onChange={(e) => setEditingBundle({ ...editingBundle, funding_source: e.target.value as "techpivo" | "seller" | "shared" })}
                  className={marketInputCls + " cursor-pointer"}
                >
                  <option value="techpivo">TechPivo-funded</option>
                  <option value="seller">Seller-funded</option>
                  <option value="shared">Shared</option>
                </select>
              </MarketField>
              <MarketField label="Usage limit (0 = unlimited)">
                <input
                  value={editingBundle.max_uses ?? 0}
                  onChange={(e) => setEditingBundle({ ...editingBundle, max_uses: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  type="number"
                  min="0"
                  step="1"
                  className={marketInputCls}
                />
              </MarketField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MarketField label="Starts (optional)">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(editingBundle.starts_at ?? "")}
                  onChange={(e) => setEditingBundle({ ...editingBundle, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className={marketInputCls + " text-xs"}
                />
              </MarketField>
              <MarketField label="Ends (optional)">
                <input
                  type="datetime-local"
                  value={isoToLocalInput(editingBundle.ends_at ?? "")}
                  onChange={(e) => setEditingBundle({ ...editingBundle, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className={marketInputCls + " text-xs"}
                />
              </MarketField>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editingBundle.is_active} onChange={(e) => setEditingBundle({ ...editingBundle, is_active: e.target.checked })} className="accent-[#F59E0B]" /> Active
            </label>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bundle products (add at least 2)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {editingBundle.products.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={p.name}
                      onChange={(e) => {
                        const np = [...editingBundle.products]
                        np[i] = { ...np[i], name: e.target.value.trim().slice(0, 120) }
                        setEditingBundle({ ...editingBundle, products: np })
                      }}
                      placeholder="Product name"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const np = [...editingBundle.products]
                        np.splice(i, 1)
                        setEditingBundle({ ...editingBundle, products: np })
                      }}
                      className="text-slate-400 hover:text-red-500"
                      disabled={editingBundle.products.length <= 2}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setEditingBundle({ ...editingBundle, products: [...editingBundle.products, { id: `p${Date.now()}`, name: "" }] })
                  }}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add product
                </button>
              </div>
            </div>
          </div>
        )}
      </MarketModal>
    </div>
  )
}

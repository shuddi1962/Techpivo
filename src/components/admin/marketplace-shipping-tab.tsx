"use client"

import { useCallback, useEffect, useState } from "react"
import { DollarSign, Edit2, Trash2, Truck, Plus, MapPin, ShieldCheck, X } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"

interface ShippingZone {
  id: string
  name: string
  countries: string[]
  is_active: boolean
  created_at: string
}

interface ShippingRate {
  id: string
  zone_id: string
  method_name: string
  method_type: "standard" | "express" | "free" | "supplier"
  fee_usd: number
  min_order_usd: number
  eta: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

interface ShippingSettings {
  freeShipThresholdUsd: number
  standardFlatUsd: number
  expressFlatUsd: number
  freightMarkup: number
}

const money = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—"
  return n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2)
}

const METHOD_LABEL: Record<string, string> = {
  standard: "Standard",
  express: "Express",
  free: "Free shipping",
  supplier: "Supplier quote",
}

const METHOD_TONE: Record<string, "neutral" | "amber" | "emerald" | "red" | "blue"> = {
  standard: "neutral",
  express: "blue",
  free: "emerald",
  supplier: "amber",
}

export function MarketplaceShippingTab() {
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")

  // Zone edit modal state
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [zoneForm, setZoneForm] = useState<{ name: string; countries: string[]; is_active: boolean }>({ name: "", countries: [], is_active: true })

  // Rate edit modal state
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null)
  const [rateForm, setRateForm] = useState<{
    zone_id: string
    method_name: string
    method_type: string
    fee_usd: string
    min_order_usd: string
    eta: string
    is_active: boolean
    sort_order: string
  }>({ zone_id: "", method_name: "", method_type: "standard", fee_usd: "", min_order_usd: "0", eta: "", is_active: true, sort_order: "0" })

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const [zRes, rRes, sRes] = await Promise.all([
        fetch("/admin/marketplace/api?section=shipping-zones").then((r) => r.json()),
        fetch("/admin/marketplace/api?section=shipping-rates").then((r) => r.json()),
        fetch("/admin/marketplace/api?section=market-settings").then((r) => r.json()),
      ])
      if (zRes?.error) throw new Error(zRes.error)
      if (rRes?.error) throw new Error(rRes.error)
      setZones(Array.isArray(zRes?.zones) ? zRes.zones : [])
      setRates(Array.isArray(rRes?.rates) ? rRes.rates : [])
      const ship = sRes?.shipping || {}
      setSettings({
        freeShipThresholdUsd: Number.isFinite(Number(ship.freeShipThresholdUsd)) ? Number(ship.freeShipThresholdUsd) : 35,
        standardFlatUsd: Number.isFinite(Number(ship.standardFlatUsd)) ? Number(ship.standardFlatUsd) : 9,
        expressFlatUsd: Number.isFinite(Number(ship.expressFlatUsd)) ? Number(ship.expressFlatUsd) : 19,
        freightMarkup: Number.isFinite(Number(ship.freightMarkup)) ? Number(ship.freightMarkup) : 1.35,
      })
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load shipping settings.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: refresh shipping when zones/rates/settings change.
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_shipping_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_shipping_zones" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_shipping_rates" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  const zonesById = new Map(zones.map((z) => [z.id, z]))
  const zoneRates = (zoneId: string) => rates.filter((r) => r.zone_id === zoneId && r.is_active)

  // ---------- zone actions ----------
  const startAddZone = () => {
    setEditingZone(null)
    setZoneForm({ name: "", countries: [], is_active: true })
  }

  const startEditZone = (z: ShippingZone) => {
    setEditingZone(z)
    setZoneForm({ name: z.name, countries: [...z.countries], is_active: z.is_active })
  }

  const saveZone = async () => {
    if (!zoneForm.name.trim()) {
      setNoticeTone("warn")
      setNotice("Zone name is required.")
      return
    }
    if (zoneForm.countries.length === 0) {
      setNoticeTone("warn")
      setNotice("Pick at least one country.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shipping-zones-save",
          id: editingZone?.id || "",
          name: zoneForm.name.trim(),
          countries: zoneForm.countries,
          is_active: zoneForm.is_active,
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Shipping zone saved.")
        setEditingZone(null)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const deleteZone = async (id: string) => {
    if (!window.confirm("Delete this zone? Its shipping rates will be removed too.")) return
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shipping-zones-delete", id }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Zone removed.")
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Delete failed.")
    }
  }

  // ---------- rate actions ----------
  const startAddRate = (zoneId: string) => {
    setEditingRate(null)
    setRateForm({ zone_id: zoneId, method_name: "", method_type: "standard", fee_usd: "", min_order_usd: "0", eta: "", is_active: true, sort_order: "0" })
  }

  const startEditRate = (r: ShippingRate) => {
    setEditingRate(r)
    setRateForm({
      zone_id: r.zone_id,
      method_name: r.method_name,
      method_type: r.method_type,
      fee_usd: r.fee_usd.toString(),
      min_order_usd: r.min_order_usd.toString(),
      eta: r.eta ?? "",
      is_active: r.is_active,
      sort_order: r.sort_order.toString(),
    })
  }

  const saveRate = async () => {
    if (!rateForm.method_name.trim()) {
      setNoticeTone("warn")
      setNotice("Method name is required.")
      return
    }
    const fee = Number(rateForm.fee_usd)
    const min = Number(rateForm.min_order_usd)
    if (!Number.isFinite(fee) || fee < 0) {
      setNoticeTone("warn")
      setNotice("Fee must be ≥ 0.")
      return
    }
    if (!Number.isFinite(min) || min < 0) {
      setNoticeTone("warn")
      setNotice("Min order must be ≥ 0.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shipping-rates-save",
          id: editingRate?.id || "",
          zone_id: rateForm.zone_id,
          method_name: rateForm.method_name.trim(),
          method_type: rateForm.method_type,
          fee_usd: fee,
          min_order_usd: min,
          eta: rateForm.eta.trim(),
          is_active: rateForm.is_active,
          sort_order: Number(rateForm.sort_order) || 0,
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Shipping rate saved.")
        setEditingRate(null)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const deleteRate = async (id: string) => {
    if (!window.confirm("Remove this shipping rate?")) return
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shipping-rates-delete", id }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Rate removed.")
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Delete failed.")
    }
  }

  const totalZones = zones.length
  const activeZones = zones.filter((z) => z.is_active).length
  const totalRates = rates.length
  const activeRates = rates.filter((r) => r.is_active).length

  return (
    <div>
      <MarketPageBar
        icon={Truck}
        title="Shipping & Delivery"
        desc="Define shipping zones, courier rates and free-ship thresholds. Rates shown at checkout are resolved here (live supplier quotes take precedence where available)."
        badge={
          <MarketBadge tone="emerald" dot>
            Live quotes
          </MarketBadge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-3">
        <MarketKpi label="Shipping zones" value={totalZones.toString()} sub={activeZones + " active"} icon={MapPin} />
        <MarketKpi label="Shipping rates" value={totalRates.toString()} sub={activeRates + " active"} icon={ShieldCheck} />
        <MarketKpi label="Free-ship threshold" value={settings ? `$${settings.freeShipThresholdUsd.toFixed(0)}` : "—"} sub="orders at/above ship free" icon={DollarSign} />
        <MarketKpi label="Standard flat" value={settings ? `$${settings.standardFlatUsd.toFixed(0)}` : "—"} sub="fallback when no supplier quote" />
      </div>

      {/* ---------- Zones ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title="Shipping zones"
          desc="A zone groups countries that share the same rates. A country belongs to exactly one zone."
          icon={MapPin}
        />
        <div className="flex items-end gap-2 mb-3">
          <button onClick={startAddZone} disabled={loading} className={marketBtnPrimaryCls}>
            <Plus className="h-4 w-4" /> Add zone
          </button>
        </div>
        {zones.length === 0 ? (
          <MarketEmpty icon={MapPin} title="No zones yet" desc="Add a shipping zone to define where and how TechPivo delivers." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Zone</th>
                  <th className={cn(marketThCls, "text-left")}>Countries</th>
                  <th className={cn(marketThCls, "text-center")}>Rates</th>
                  <th className={cn(marketThCls, "text-center")}>Active</th>
                  <th className={marketThCls} w-40>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((z) => {
                  const rs = zoneRates(z.id)
                  return (
                    <tr key={z.id} className="hover:bg-slate-50/60 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📦</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[160px]">{z.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-slate-500 truncate max-w-[200px] block">
                          {z.countries.slice(0, 6).join(", ")}{z.countries.length > 6 ? ` +${z.countries.length - 6} more` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-900">{rs.length}</td>
                      <td className="px-4 py-3 text-center">
                        <MarketBadge tone={z.is_active ? "emerald" : "neutral"}>
                          {z.is_active ? "On" : "Off"}
                        </MarketBadge>
                      </td>
                      <td className="px-4 py-3 textRight">
                        <button
                          onClick={() => startEditZone(z)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteZone(z.id)}
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
        {editingZone && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-amber-900">
                  {editingZone ? `Edit zone` : "New zone"}
                </h3>
                <p className="text-[11px] text-amber-700">Countries in this zone share the same shipping rates.</p>
              </div>
              <button onClick={() => setEditingZone(null)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <MarketField label="Zone name" hint="e.g. West Africa, Europe, North America">
                <input
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Countries (ISO codes)" hint="comma-separated, e.g. NG, GH, KE">
                <input
                  value={zoneForm.countries.join(", ")}
                  onChange={(e) =>
                    setZoneForm({
                      ...zoneForm,
                      countries: e.target.value
                        .split(",")
                        .map((c) => c.trim().toUpperCase())
                        .filter(Boolean),
                    })
                  }
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Active">
                <select
                  value={zoneForm.is_active ? "true" : "false"}
                  onChange={(e) => setZoneForm({ ...zoneForm, is_active: e.target.value === "true" })}
                  className={marketInputCls}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </MarketField>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setEditingZone(null)} className={marketBtnGhostCls}>
                Cancel
              </button>
              <button onClick={saveZone} disabled={loading} className={marketBtnPrimaryCls}>
                {loading ? "Saving…" : "Save zone"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Rates ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title="Shipping rates by zone"
          desc="Each zone can offer several methods (Standard, Express, Free, Supplier quote). The cheapest applicable option is shown at checkout."
          icon={ShieldCheck}
        />
        <div className="flex items-end gap-2 mb-3">
          {zones.length === 0 ? (
            <span className="text-[11px] text-slate-400">Add a zone first, then add its rates.</span>
          ) : (
            <button
              onClick={() => startAddRate("")}
              disabled={loading}
              className={marketBtnPrimaryCls}
            >
              <Plus className="h-4 w-4" /> Add rate
            </button>
          )}
        </div>
        {zones.length === 0 ? (
          <MarketEmpty icon={MapPin} title="No zones" desc="Create a shipping zone before adding rates." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Zone</th>
                  <th className={marketThCls}>Method</th>
                  <th className={cn(marketThCls, "text-right")}>Fee</th>
                  <th className={cn(marketThCls, "text-right")}>Free from</th>
                  <th className={marketThCls}>ETA</th>
                  <th className={cn(marketThCls, "text-center")}>Active</th>
                  <th className={marketThCls} w-40>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No rates defined yet. Add a rate for a zone above.
                    </td>
                  </tr>
                ) : (
                  rates.map((r) => {
                    const z = zonesById.get(r.zone_id)
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 group">
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-500 truncate max-w-[140px] block">{z?.name || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900">{METHOD_LABEL[r.method_type] || r.method_type}</span>
                          <span className="ml-1 text-[10px] text-slate-400">{r.method_name}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-right text-slate-900">{money(r.fee_usd)}</td>
                        <td className="px-4 py-3 tabular-nums text-right text-slate-900">{money(r.min_order_usd)}</td>
                        <td className="px-4 py-3 text-slate-500">{r.eta || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <MarketBadge tone={r.is_active ? "emerald" : "neutral"}>{r.is_active ? "On" : "Off"}</MarketBadge>
                        </td>
                        <td className="px-4 py-3 textRight">
                          <button
                            onClick={() => startEditRate(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => deleteRate(r.id)}
                            className="ml-2 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  }
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editingRate && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-amber-900">
                  {editingRate ? "Edit rate" : "New rate"}
                </h3>
                <p className="text-[11px] text-amber-700">A &quot;Free&quot; method with fee $0 unlocks free shipping above the min order.</p>
              </div>
              <button onClick={() => setEditingRate(null)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <MarketField label="Zone">
                <select
                  value={rateForm.zone_id}
                  onChange={(e) => setRateForm({ ...rateForm, zone_id: e.target.value })}
                  className={marketInputCls}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </MarketField>
              <MarketField label="Method name" hint="e.g. Standard Delivery">
                <input
                  value={rateForm.method_name}
                  onChange={(e) => setRateForm({ ...rateForm, method_name: e.target.value })}
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Method type">
                <select
                  value={rateForm.method_type}
                  onChange={(e) => setRateForm({ ...rateForm, method_type: e.target.value })}
                  className={marketInputCls}
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="free">Free shipping</option>
                  <option value="supplier">Supplier quote</option>
                </select>
              </MarketField>
              <MarketField label="Fee (USD)">
                <input
                  value={rateForm.fee_usd}
                  onChange={(e) => setRateForm({ ...rateForm, fee_usd: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Free from (USD)">
                <input
                  value={rateForm.min_order_usd}
                  onChange={(e) => setRateForm({ ...rateForm, min_order_usd: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="ETA" hint="e.g. 7–12 days">
                <input
                  value={rateForm.eta}
                  onChange={(e) => setRateForm({ ...rateForm, eta: e.target.value })}
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Sort order">
                <input
                  value={rateForm.sort_order}
                  onChange={(e) => setRateForm({ ...rateForm, sort_order: e.target.value })}
                  type="number"
                  min="0"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Active">
                <select
                  value={rateForm.is_active ? "true" : "false"}
                  onChange={(e) => setRateForm({ ...rateForm, is_active: e.target.value === "true" })}
                  className={marketInputCls}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </MarketField>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setEditingRate(null)} className={marketBtnGhostCls}>
                Cancel
              </button>
              <button onClick={saveRate} disabled={loading} className={marketBtnPrimaryCls}>
                {loading ? "Saving…" : "Save rate"}
              </button>
            </div>
          </div>
        )}
      </div>

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}

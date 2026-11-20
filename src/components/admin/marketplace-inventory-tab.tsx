"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Box, DollarSign, Edit2, Plus, RefreshCw, Search, Truck, Trash2, X, AlertTriangle } from "lucide-react"
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
  MarketLoading,
  MarketNotice,
  MarketPageBar,
  MarketTableShell,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface InventoryProduct {
  id: string
  name: string
  description: string | null
  short_description: string | null
  sku: string | null
  category_slug: string | null
  subcategory_slug: string | null
  fulilment_type: string
  seller_id: string | null
  cost_usd: number | null
  shipping_cost_usd: number
  sale_price_usd: number | null
  compare_at_price_usd: number | null
  stock_quantity: number
  low_stock_threshold: number
  weight_grams: number | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  main_image_url: string | null
  gallery_images: string[]
  video_url: string | null
  is_active: boolean
  is_featured: boolean
  is_digital: boolean
  shipping_restrictions: string | null
  cj_pid: string | null
  cj_vid: string | null
  created_at: string
  updated_at: string
}

const money = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—"
  return n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2)
}

export function MarketplaceInventoryTab() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")
  const [editing, setEditing] = useState<InventoryProduct | null>(null)
  const [form, setForm] = useState<{
    name: string
    sku: string
    category_slug: string
    subcategory_slug: string
    cost_usd: string
    shipping_cost_usd: string
    sale_price_usd: string
    compare_at_price_usd: string
    stock_quantity: string
    low_stock_threshold: string
    is_active: boolean
    is_featured: boolean
    is_digital: boolean
  }>({
    name: "", sku: "", category_slug: "", subcategory_slug: "",
    cost_usd: "", shipping_cost_usd: "", sale_price_usd: "", compare_at_price_usd: "",
    stock_quantity: "", low_stock_threshold: "5",
    is_active: true, is_featured: false, is_digital: false,
  })
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const qs = new URLSearchParams()
      if (search) qs.set("search", search)
      if (categoryFilter) qs.set("category_slug", categoryFilter)
      if (lowStockOnly) qs.set("low_stock", "true")
      qs.set("page", "1")
      qs.set("size", "200")
      const res = await fetch(`/api/marketplace/inventory?${qs.toString()}`, { cache: "no-store" })
      const data = await res.json()
      if (data?.error) throw new Error(data.error)
      setProducts(Array.isArray(data?.products) ? data.products : [])
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load inventory.")
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, lowStockOnly])

  useEffect(() => {
    load()
    const t = setTimeout(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(t)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  const flash = (msg: string, tone: "success" | "warn" | "info" = "success") => {
    setNotice(msg)
    setNoticeTone(tone)
    setTimeout(() => setNotice(""), 4000)
  }

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/marketplace/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Update failed")
    return data
  }

  const startAdd = () => {
    setEditing(null)
    setForm({
      name: "", sku: "", category_slug: "", subcategory_slug: "",
      cost_usd: "", shipping_cost_usd: "", sale_price_usd: "", compare_at_price_usd: "",
      stock_quantity: "", low_stock_threshold: "5",
      is_active: true, is_featured: false, is_digital: false,
    })
  }

  const startEdit = (p: InventoryProduct) => {
    setEditing(p)
    setForm({
      name: p.name, sku: p.sku || "", category_slug: p.category_slug || "", subcategory_slug: p.subcategory_slug || "",
      cost_usd: (p.cost_usd ?? 0).toString(), shipping_cost_usd: p.shipping_cost_usd.toString(),
      sale_price_usd: (p.sale_price_usd ?? 0).toString(), compare_at_price_usd: (p.compare_at_price_usd ?? 0).toString(),
      stock_quantity: p.stock_quantity.toString(), low_stock_threshold: p.low_stock_threshold.toString(),
      is_active: p.is_active, is_featured: p.is_featured, is_digital: p.is_digital,
    })
  }

  const save = async () => {
    if (!form.name.trim()) {
      flash("Product name is required.", "warn")
      return
    }
    const cost = Number(form.cost_usd)
    const ship = Number(form.shipping_cost_usd)
    const sale = Number(form.sale_price_usd)
    const compare = Number(form.compare_at_price_usd) || 0
    const stock = Math.max(0, Math.floor(Number(form.stock_quantity) || 0))
    const low = Math.max(0, Math.floor(Number(form.low_stock_threshold) || 5))
    if (!Number.isFinite(cost) || cost < 0) { flash("Cost must be ≥ 0.", "warn"); return }
    if (!Number.isFinite(ship) || ship < 0) { flash("Shipping cost must be ≥ 0.", "warn"); return }
    if (!Number.isFinite(sale) || sale < 0) { flash("Sale price must be ≥ 0.", "warn"); return }
    setBusy(true)
    try {
      const data = await post({
        action: "upsert",
        id: editing?.id || undefined,
        sku: form.sku.trim() || undefined,
        name: form.name.trim(),
        category_slug: form.category_slug.trim() || undefined,
        subcategory_slug: form.subcategory_slug.trim() || undefined,
        cost_usd: cost, shipping_cost_usd: ship, sale_price_usd: sale,
        compare_at_price_usd: compare > 0 ? compare : null,
        stock_quantity: stock, low_stock_threshold: low,
        is_active: form.is_active, is_featured: form.is_featured, is_digital: form.is_digital,
      })
      flash(`Product ${data.action === "created" ? "created" : "updated"} — live on the storefront.`)
      setEditing(null)
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed.", "warn")
    } finally {
      setBusy(false)
    }
  }

  const deleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await post({ action: "delete", id })
      flash("Product removed.")
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Delete failed.", "warn")
    }
  }

  const restock = async (p: InventoryProduct) => {
    const to = window.prompt(`Restock "${p.name}" to (current: ${p.stock_quantity}):`, String(p.stock_quantity))
    if (to === null) return
    const qty = Math.max(0, Math.floor(Number(to) || 0))
    setBusy(true)
    try {
      await post({ action: "restock", id: p.id, to, qty, reason: "Admin restock" })
      flash(`Restocked "${p.name}" to ${qty} units.`)
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Restock failed.", "warn")
    } finally {
      setBusy(false)
    }
  }

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && p.category_slug !== categoryFilter) return false
    if (lowStockOnly && p.stock_quantity > (p.low_stock_threshold || 5)) return false
    return true
  })

  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.is_active).length
  const lowStockProducts = products.filter((p) => p.stock_quantity <= (p.low_stock_threshold || 5)).length
  const totalStockValue = products.reduce((s, p) => s + ((Number(p.sale_price_usd) || 0) * p.stock_quantity), 0)

  const priced = filtered.filter((p) => p.sale_price_usd != null && p.cost_usd != null)
  const blendedMargin = priced.length > 0
    ? (priced.reduce((s, p) => s + (Number(p.sale_price_usd) - (Number(p.cost_usd) + p.shipping_cost_usd)), 0) /
        priced.reduce((s, p) => s + Number(p.sale_price_usd), 0)) * 100
    : null

  const categories = Array.from(new Set(products.map((p) => p.category_slug).filter((c): c is string => Boolean(c)))).sort()

  if (loading) return <MarketLoading label="Loading inventory…" />

  return (
    <div>
      <MarketPageBar
        icon={Box}
        title="Inventory"
        desc="TechPivo-owned stock (fulfilment_type = inventory). Create, restock and adjust products that ship from our own warehouse."
        badge={
          <MarketBadge tone={lowStockProducts > 0 ? "amber" : "emerald"} dot>
            {lowStockProducts} low stock
          </MarketBadge>
        }
        actions={
          <>
            <button onClick={load} className={marketBtnGhostCls}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={startAdd} className={marketBtnPrimaryCls}>
              <Plus className="h-4 w-4" /> Add product
            </button>
          </>
        }
      />
      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}

      <div className="mb-3 grid gap-3 sm:grid-cols-4">
        <MarketKpi label="Products" value={totalProducts.toString()} sub={activeProducts + " active"} icon={Box} />
        <MarketKpi label="Active" value={activeProducts.toString()} sub="live on storefront" />
        <MarketKpi label="Low stock" value={lowStockProducts.toString()} sub="at/below threshold" tone={lowStockProducts > 0 ? "amber" : "emerald"} />
        <MarketKpi label="Stock value" value={money(totalStockValue)} sub="at sale prices" icon={DollarSign} />
      </div>

      {/* Filters */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead title="Filters" icon={Search} />
        <div className="grid gap-2 sm:grid-cols-4">
          <MarketField label="Search products">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or SKU"
              className={marketInputCls}
            />
          </MarketField>
          <MarketField label="Category">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={marketInputCls}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </MarketField>
          <MarketField label="Low stock only">
            <select value={lowStockOnly ? "true" : "false"} onChange={(e) => setLowStockOnly(e.target.value === "true")} className={marketInputCls}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </MarketField>
        </div>
      </div>

      {/* Product list */}
      <div className={marketCardCls + " p-4 sm:p-5"}>
        <MarketCardHead
          title="Inventory products"
          desc="Stock quantity, cost, sale price and fulfilment type per product."
          icon={Truck}
        />
        {filtered.length === 0 ? (
          <MarketEmpty icon={Box} title="No inventory products" desc="Add your first warehouse product — it appears on the storefront immediately." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Product</th>
                  <th className={cn(marketThCls, "text-left")}>SKU</th>
                  <th className={cn(marketThCls, "text-left")}>Category</th>
                  <th className={cn(marketThCls, "text-right")}>Cost</th>
                  <th className={cn(marketThCls, "text-right")}>Sale price</th>
                  <th className={cn(marketThCls, "text-center")}>Stock</th>
                  <th className={cn(marketThCls, "text-center")}>Status</th>
                  <th className={marketThCls} w-48>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const low = p.stock_quantity <= (p.low_stock_threshold || 5)
                  const margin = p.sale_price_usd != null && p.cost_usd != null
                    ? (((Number(p.sale_price_usd) - (Number(p.cost_usd) + p.shipping_cost_usd)) / Number(p.sale_price_usd)) * 100)
                    : null
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/60 group ${low ? "bg-amber-25" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.main_image_url ? (
                            <img src={p.main_image_url} alt="" className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 object-cover" />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                            <p className="truncate text-[11px] text-slate-500">{p.is_digital ? "Digital" : p.fulilment_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-slate-500">{p.sku || "—"}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 truncate max-w-[120px] block">{p.category_slug || "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-900">{money(p.cost_usd)}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-slate-900">{money(p.sale_price_usd)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold tabular-nums px-2 py-1 rounded ${
                          low ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {p.stock_quantity}
                        </span>
                        {low && <span className="ml-1 text-[10px] text-amber-600">low</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MarketBadge tone={p.is_active ? "emerald" : "neutral"}>
                          {p.is_active ? "Live" : "Hidden"}
                        </MarketBadge>
                        {p.is_featured && <span className="ml-1 text-[10px] text-amber-600">★</span>}
                      </td>
                      <td className="px-4 py-3 textRight">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => restock(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="Restock"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {blendedMargin != null && filtered.some((p) => p.sale_price_usd != null && p.cost_usd != null) && (
          <div className="mt-3 border border-slate-200 rounded-xl bg-slate-50 p-3">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Blended margin (priced items)</span>
              <span className={`font-bold tabular-nums ${blendedMargin >= 20 ? "text-emerald-600" : blendedMargin > 0 ? "text-amber-600" : "text-red-600"}`}>
                {blendedMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Edit / create form */}
      {editing && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-amber-900">{editing ? `Edit product` : "New product"}</h3>
              <p className="text-[11px] text-amber-700">Changes publish to the storefront instantly.</p>
            </div>
            <button onClick={() => setEditing(null)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <MarketField label="Name *">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="SKU">
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Category slug">
              <input
                value={form.category_slug}
                onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Subcategory slug">
              <input
                value={form.subcategory_slug}
                onChange={(e) => setForm({ ...form, subcategory_slug: e.target.value })}
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Cost ($)">
              <input
                value={form.cost_usd}
                onChange={(e) => setForm({ ...form, cost_usd: e.target.value })}
                type="number" step="0.01" min="0"
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Shipping cost ($)">
              <input
                value={form.shipping_cost_usd}
                onChange={(e) => setForm({ ...form, shipping_cost_usd: e.target.value })}
                type="number" step="0.01" min="0"
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Sale price ($)">
              <input
                value={form.sale_price_usd}
                onChange={(e) => setForm({ ...form, sale_price_usd: e.target.value })}
                type="number" step="0.01" min="0"
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Compare at ($)">
              <input
                value={form.compare_at_price_usd}
                onChange={(e) => setForm({ ...form, compare_at_price_usd: e.target.value })}
                type="number" step="0.01" min="0"
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Stock qty">
              <input
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                type="number" min="0"
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Low stock threshold">
              <input
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                type="number" min="0"
                className={marketInputCls}
              />
            </MarketField>
            <MarketField label="Active">
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
                className={marketInputCls}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </MarketField>
            <MarketField label="Featured">
              <select
                value={form.is_featured ? "true" : "false"}
                onChange={(e) => setForm({ ...form, is_featured: e.target.value === "true" })}
                className={marketInputCls}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </MarketField>
            <MarketField label="Digital product">
              <select
                value={form.is_digital ? "true" : "false"}
                onChange={(e) => setForm({ ...form, is_digital: e.target.value === "true" })}
                className={marketInputCls}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </MarketField>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => setEditing(null)} className={marketBtnGhostCls}>
              Cancel
            </button>
            <button onClick={save} disabled={busy} className={marketBtnPrimaryCls}>
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
              {busy ? "Saving…" : "Save product"}
            </button>
          </div>
        </div>
      )}

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}

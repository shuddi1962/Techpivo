"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, DollarSign, Edit2, RefreshCw, TrendingUp, Flame, ChevronDown, X, AlertTriangle } from "lucide-react"
import { MARKET_DEPARTMENTS, type MarketDepartment } from "@/lib/marketplace-categories"
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
  MarketSegmented,
  MarketTableShell,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface CategoryProfit {
  slug: string
  name: string
  depth: number
  profit_margin_percent: number | null
  min_profit_usd: number
  pricing_rule: string
  parent_slug: string | null
}

interface ProductProfit {
  id: string
  product_name: string
  product_image_url: string | null
  cost_usd: number | null
  shipping_cost_usd: number
  sale_price: number | null
  original_price: number | null
  profit_margin_percent: number | null
  profit_override_usd: number | null
  pricing_rule: string
  category_slug: string | null
}

const money = (v: number | null | undefined): string => {
  const n = Number(v)
  if (!Number.isFinite(n)) return "—"
  return n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2)
}

const pct = (v: number | null | undefined): string => {
  const n = Number(v)
  if (!Number.isFinite(n)) return "—%"
  return n.toFixed(0) + "%"
}

export function MarketplaceProfitTab() {
  const [state, setState] = useState<{ categories: CategoryProfit[]; products: ProductProfit[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")
  const [editing, setEditing] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<{
    profit_margin_percent: string
    min_profit_usd: string
    pricing_rule: string
  }>({ profit_margin_percent: "", min_profit_usd: "", pricing_rule: "category" })
  const [productFormValues, setProductFormValues] = useState<{
    cost_usd: string
    shipping_cost_usd: string
    sale_price: string
    profit_margin_percent: string
    profit_override_usd: string
    pricing_rule: string
  }>({
    cost_usd: "",
    shipping_cost_usd: "",
    sale_price: "",
    profit_margin_percent: "",
    profit_override_usd: "",
    pricing_rule: "category",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const [catsRes, prodsRes] = await Promise.all([
        fetch("/admin/marketplace/api?section=profit-categories").then((r) => r.json()),
        fetch("/admin/marketplace/api?section=profit-products").then((r) => r.json()),
      ])
      if (catsRes?.error) throw new Error(catsRes.error)
      if (prodsRes?.error) throw new Error(prodsRes.error)
      setState({
        categories: Array.isArray(catsRes?.categories) ? catsRes.categories : [],
        products: Array.isArray(prodsRes?.products) ? prodsRes.products : [],
      })
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load pricing settings.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: refresh pricing when products/categories change.
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_profit_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_categories" }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  const cats = state?.categories ?? []
  const rootCats = cats.filter((c) => c.depth === 0)
  const catBySlug = new Map(cats.map((c) => [c.slug, c]))

  const catSubtree = (slug: string): CategoryProfit[] => {
    const out: CategoryProfit[] = []
    const walk = (s: string) => {
      const c = catBySlug.get(s)
      if (!c) return
      out.push(c)
      cats.filter((x) => x.parent_slug === s).forEach((x) => walk(x.slug))
    }
    walk(slug)
    return out
  }

  const saveCategory = async () => {
    if (!editing) return
    const margin = Number(formValues.profit_margin_percent)
    const minProfit = Number(formValues.min_profit_usd)
    if (!Number.isFinite(margin) || margin < 0 || margin > 100) {
      setNoticeTone("warn")
      setNotice("Margin must be 0–100.")
      return
    }
    if (!Number.isFinite(minProfit) || minProfit < 0) {
      setNoticeTone("warn")
      setNotice("Minimum profit must be ≥ 0.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profit-categories-save",
          slug: editing,
          profit_margin_percent: margin,
          min_profit_usd: minProfit,
          pricing_rule: formValues.pricing_rule,
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Category profit saved.")
        setEditing(null)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const startEditCat = (c: CategoryProfit) => {
    setEditing(c.slug)
    setFormValues({
      profit_margin_percent: c.profit_margin_percent == null ? "" : c.profit_margin_percent.toString(),
      min_profit_usd: c.min_profit_usd.toString(),
      pricing_rule: c.pricing_rule,
    })
  }

  const prods = state?.products ?? []
  const prodById = new Map(prods.map((p) => [p.id, p]))

  const saveProduct = async () => {
    if (!editingProduct) return
    const cost = Number(productFormValues.cost_usd)
    const ship = Number(productFormValues.shipping_cost_usd)
    const sale = Number(productFormValues.sale_price)
    const margin = Number(productFormValues.profit_margin_percent)
    const override = Number(productFormValues.profit_override_usd)
    const rule = productFormValues.pricing_rule
    if (!Number.isFinite(cost) || cost < 0) {
      setNoticeTone("warn")
      setNotice("Cost must be ≥ 0.")
      return
    }
    if (!Number.isFinite(ship) || ship < 0) {
      setNoticeTone("warn")
      setNotice("Shipping cost must be ≥ 0.")
      return
    }
    if (!Number.isFinite(sale) || sale < 0) {
      setNoticeTone("warn")
      setNotice("Sale price must be ≥ 0.")
      return
    }
    if (rule === "override" && (!Number.isFinite(margin) || margin < 0 || margin > 100)) {
      setNoticeTone("warn")
      setNotice("Override margin must be 0–100.")
      return
    }
    if (rule === "override" && (!Number.isFinite(override) || override < 0)) {
      setNoticeTone("warn")
      setNotice("Override profit must be ≥ 0.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profit-products-save",
          id: editingProduct,
          cost_usd: cost,
          shipping_cost_usd: ship,
          sale_price: sale,
          profit_margin_percent: rule === "override" ? margin : null,
          profit_override_usd: rule === "override" ? override : null,
          pricing_rule: rule,
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Product profit saved.")
        setEditingProduct(null)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const startEditProduct = (p: ProductProfit) => {
    setEditingProduct(p.id)
    setProductFormValues({
      cost_usd: p.cost_usd == null ? "" : p.cost_usd.toString(),
      shipping_cost_usd: p.shipping_cost_usd.toString(),
      sale_price: p.sale_price == null ? "" : p.sale_price.toString(),
      profit_margin_percent: p.profit_margin_percent == null ? "" : p.profit_margin_percent.toString(),
      profit_override_usd: p.profit_override_usd == null ? "" : p.profit_override_usd.toString(),
      pricing_rule: p.pricing_rule,
    })
  }

  const productMargin = (p: ProductProfit): { margin: number | null; estProfit: number | null } => {
    const sale = p.sale_price ?? 0
    const cost = (p.cost_usd ?? 0) + p.shipping_cost_usd
    if (!sale || sale <= 0) return { margin: null, estProfit: null }
    const estProfit = sale - cost
    const margin = (estProfit / sale) * 100
    return { margin, estProfit }
  }

  const totalRevenue = prods.reduce((s, p) => s + (Number(p.sale_price) || 0), 0)
  const totalEstProfit = prods.reduce((s, p) => s + (productMargin(p).estProfit ?? 0), 0)
  const avgMargin = prods.length > 0 ? totalEstProfit / totalRevenue : 0
  const pricedCats = rootCats.filter((c) => c.pricing_rule !== "category").length
  const overriddenProds = prods.filter((p) => p.pricing_rule === "override").length

  return (
    <div>
      <MarketPageBar
        icon={DollarSign}
        title="Pricing & Profit"
        desc="Set profit margins per category and per product. Override pricing rules so every department earns its target."
        badge={
          <MarketBadge tone="emerald" dot>
            Live pricing
          </MarketBadge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
        <MarketKpi label="Categories priced" value={pricedCats.toString()} sub={"of " + rootCats.length.toString() + " departments"} icon={TrendingUp} />
        <MarketKpi label="Products with override" value={overriddenProds.toString()} sub={"of " + prods.length.toString() + " catalogue items"} />
        <MarketKpi label="Avg estimated margin" value={avgMargin.toFixed(0) + "%"} sub="sale price − (cost + shipping)" />
        <MarketKpi label="Total est. profit" value={money(totalEstProfit)} sub="across priced catalogue" />
      </div>

      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title="Category profit settings"
          desc="Set a target gross margin per department. Every product in the department inherits it unless overridden."
          icon={TrendingUp}
        />
        {rootCats.length === 0 ? (
          <MarketEmpty icon={AlertTriangle} title="No categories" desc="Set up departments in Admin → Marketplace → Categories first." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Department</th>
                  <th className={cn(marketThCls, "text-right")}>Target margin</th>
                  <th className={cn(marketThCls, "text-right")}>Min profit / unit</th>
                  <th className={cn(marketThCls, "text-right")}>Pricing rule</th>
                  <th className={cn(marketThCls, "text-right")}>Items</th>
                  <th className={marketThCls} w-24>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rootCats.map((c) => {
                  const subtree = catSubtree(c.slug)
                  const priced = subtree.filter((x) => x.pricing_rule !== "category").length
                  return (
                    <tr key={c.slug} className="hover:bg-slate-50/60 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{c.depth === 0 ? "🏢" : "📁"}</span>
                          <span className="font-semibold text-slate-900">{c.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{subtree.length} items in tree</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-bold tabular-nums", c.profit_margin_percent == null ? "text-slate-400" : "text-slate-900")}>
                          {c.profit_margin_percent == null ? "—" : c.profit_margin_percent + "%"}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-900">{money(c.min_profit_usd)}</td>
                      <td className="px-4 py-3">
                        <MarketBadge tone={c.pricing_rule === "category" ? "neutral" : "amber"}>
                          {c.pricing_rule}
                        </MarketBadge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-500 textRight">{priced}</td>
                      <td className="px-4 py-3 textRight">
                        <button
                          onClick={() => startEditCat(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Set
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {editing && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-amber-900">Set profit for {catBySlug.get(editing)?.name}</h3>
                <p className="text-[11px] text-amber-700">Margin is (sale − cost − shipping) ÷ sale. Min profit is the floor per unit.</p>
              </div>
              <button onClick={() => setEditing(null)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <MarketField label="Target margin %" hint="0–100">
                <input
                  value={formValues.profit_margin_percent}
                  onChange={(e) => setFormValues({ ...formValues, profit_margin_percent: e.target.value })}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Min profit / unit ($)" hint="Floor per sold unit">
                <input
                  value={formValues.min_profit_usd}
                  onChange={(e) => setFormValues({ ...formValues, min_profit_usd: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Pricing rule">
                <select
                  value={formValues.pricing_rule}
                  onChange={(e) => setFormValues({ ...formValues, pricing_rule: e.target.value })}
                  className={marketInputCls}
                >
                  <option value="category">Use category default</option>
                  <option value="override">Override per product</option>
                </select>
              </MarketField>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setEditing(null)} className={marketBtnGhostCls}>
                Cancel
              </button>
              <button onClick={saveCategory} disabled={loading} className={marketBtnPrimaryCls}>
                {loading ? "Saving…" : "Save category profit"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={marketCardCls + " p-4 sm:p-5"}>
        <MarketCardHead
          title="Product-level profit overrides"
          desc="Override category pricing for individual products. Leave blank to inherit the department rule."
          icon={Edit2}
        />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter</span>
            <MarketSegmented
              options={[
                { value: "all", label: "All" },
                { value: "override", label: "Overridden" },
                { value: "inherit", label: "Inherit" },
              ]}
              value="all"
              onChange={() => {}}
            />
          </div>
          <div className="text-[11px] text-slate-500">
            {prods.length} catalogue products
          </div>
        </div>

        {prods.length === 0 ? (
          <MarketEmpty icon={AlertTriangle} title="No products" desc="Import products in Admin → Marketplace → CJ Import first." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Product</th>
                  <th className={cn(marketThCls, "text-right")}>Sale price</th>
                  <th className={cn(marketThCls, "text-right")}>Cost + ship</th>
                  <th className={cn(marketThCls, "text-right")}>Est. margin</th>
                  <th className={marketThCls}>Rule</th>
                  <th className={marketThCls} w-32>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prods.map((p) => {
                  const m = productMargin(p)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.product_image_url ? (
                            <img src={p.product_image_url} alt="" className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 object-cover" />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{p.product_name}</p>
                            <p className="truncate text-[11px] text-slate-500">{p.category_slug || "uncategorized"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-900 text-right">{money(p.sale_price)}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-900 text-right">{money((p.cost_usd ?? 0) + p.shipping_cost_usd)}</td>
                      <td className="px-4 py-3 textRight">
                        <span className={cn("font-bold tabular-nums", m.margin == null ? "text-slate-400" : m.margin < 20 ? "text-red-600" : "text-slate-900")}>
                          {m.margin == null ? "—" : m.margin.toFixed(0) + "%"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <MarketBadge tone={p.pricing_rule === "category" ? "neutral" : "amber"}>
                          {p.pricing_rule}
                        </MarketBadge>
                      </td>
                      <td className="px-4 py-3 textRight">
                        <button
                          onClick={() => startEditProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Set
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingProduct && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-amber-900">Set profit for product</h3>
                <p className="text-[11px] text-amber-700">Override the department margin for this single product.</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <MarketField label="Supplier cost ($)" hint="What you pay CJ">
                <input
                  value={productFormValues.cost_usd}
                  onChange={(e) => setProductFormValues({ ...productFormValues, cost_usd: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Shipping cost ($)" hint="Per unit">
                <input
                  value={productFormValues.shipping_cost_usd}
                  onChange={(e) => setProductFormValues({ ...productFormValues, shipping_cost_usd: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Sale price ($)" hint="Customer-facing price">
                <input
                  value={productFormValues.sale_price}
                  onChange={(e) => setProductFormValues({ ...productFormValues, sale_price: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Pricing rule">
                <select
                  value={productFormValues.pricing_rule}
                  onChange={(e) => setProductFormValues({ ...productFormValues, pricing_rule: e.target.value })}
                  className={marketInputCls}
                >
                  <option value="category">Inherit category</option>
                  <option value="override">Manual override</option>
                </select>
              </MarketField>
              {productFormValues.pricing_rule === "override" && (
                <>
                  <MarketField label="Override margin %" hint="0–100, of sale price">
                    <input
                      value={productFormValues.profit_margin_percent}
                      onChange={(e) => setProductFormValues({ ...productFormValues, profit_margin_percent: e.target.value })}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className={marketInputCls}
                    />
                  </MarketField>
                  <MarketField label="Override profit ($)" hint="Flat profit per unit">
                    <input
                      value={productFormValues.profit_override_usd}
                      onChange={(e) => setProductFormValues({ ...productFormValues, profit_override_usd: e.target.value })}
                      type="number"
                      min="0"
                      step="0.01"
                      className={marketInputCls}
                    />
                  </MarketField>
                </>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setEditingProduct(null)} className={marketBtnGhostCls}>
                Cancel
              </button>
              <button onClick={saveProduct} disabled={loading} className={marketBtnPrimaryCls}>
                {loading ? "Saving…" : "Save product profit"}
              </button>
            </div>
          </div>
        )}
      </div>

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}

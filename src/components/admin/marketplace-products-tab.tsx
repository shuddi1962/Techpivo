"use client"

// Admin → TechPivo Market → Products: the catalog index table.
// Premium ecommerce index shape — page bar, KPI strip, toolbar with search +
// filter vocabulary, bulk selection bar, quiet dense table with sticky head.

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Eye, EyeOff, Package, Pencil, Plus, Search, Star, Trash2, BadgePercent, X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { isoToLocalInput } from "@/lib/marketplace-banners"
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
  MarketModal,
  MarketPageBar,
  MarketSearch,
  MarketSegmented,
  MarketTableShell,
  MarketToolbar,
  marketThCls,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  program_key: string | null
  product_name: string
  product_description: string | null
  product_image_url: string | null
  affiliate_link: string
  original_price: number | null
  sale_price: number | null
  clicks: number | null
  conversions: number | null
  is_active: boolean
  is_featured?: boolean
  created_at: string | null
}

interface Overview {
  total: number
  active: number
  featured: number
  clicks: number
  conversions: number
  vendors: number
  pagePublished: boolean
}

const emptyForm = {
  product_name: "",
  program_key: "",
  affiliate_link: "",
  product_description: "",
  product_image_url: "",
  original_price: "",
  sale_price: "",
  sale_end_at: "",
  merch_sale: true,
  merch_new: false,
  merch_bestseller: false,
  is_active: true,
  is_featured: false,
}

type MerchFlags = { sale?: boolean; is_new?: boolean; bestseller?: boolean }

export function MarketplaceProductsTab() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Record<string, string>>({})
  const [merch, setMerch] = useState<Record<string, MerchFlags>>({})
  const [saleBadges, setSaleBadges] = useState(true)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "error" | "info">("success")

  const load = useCallback(async () => {
    const noStore = { cache: "no-store" as RequestCache }
    const [ov, pr, sa, me] = await Promise.all([
      fetch("/admin/marketplace/api?section=overview", noStore).then((r) => r.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=products", noStore).then((r) => r.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=sales", noStore).then((r) => r.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=merch", noStore).then((r) => r.json()).catch(() => null),
    ])
    if (ov?.overview) setOverview(ov.overview)
    if (pr?.products) setProducts(pr.products)
    if (sa?.sales && typeof sa.sales === "object") setSales(sa.sales as Record<string, string>)
    if (me?.merch && typeof me.merch === "object") setMerch(me.merch as Record<string, MerchFlags>)
    if (typeof me?.sale_badges === "boolean") setSaleBadges(me.sale_badges)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_market_products_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_orders" }, () => load())
      // Merch flags, sale timers and the store-wide badge switch live in
      // site_settings — subscribe so a change in another tab shows up here.
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe()
    const poll = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(ch)
    }
  }, [load])

  const flash = (msg: string, tone: "success" | "error" | "info" = "success") => {
    setNotice(msg)
    setNoticeTone(tone)
    setTimeout(() => setNotice(""), 3500)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const matchQ =
        !q ||
        p.product_name.toLowerCase().includes(q) ||
        (p.program_key || "").toLowerCase().includes(q) ||
        (p.product_description || "").toLowerCase().includes(q)
      const matchF =
        filter === "all"
          ? true
          : filter === "active"
            ? p.is_active
            : filter === "hidden"
              ? !p.is_active
              : !!p.is_featured
      return matchQ && matchF
    })
  }, [products, query, filter])

  const selectedIds = selected.filter((id) => filtered.some((p) => p.id === id))
  const allVisibleSelected = filtered.length > 0 && selectedIds.length === filtered.length

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleAll = () => {
    if (allVisibleSelected) setSelected((prev) => prev.filter((id) => !filtered.some((p) => p.id === id)))
    else setSelected((prev) => Array.from(new Set([...prev, ...filtered.map((p) => p.id)])))
  }

  const patch = async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch("/admin/marketplace/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Update failed")
    return data
  }

  const toggle = async (p: Product, field: "is_active" | "is_featured") => {
    try {
      await patch(p.id, { [field]: !p[field] })
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)))
      flash(
        `${p.product_name} ${field === "is_active" ? (!p.is_active ? "activated" : "hidden") : (!p.is_featured ? "featured" : "unfeatured")}`
      )
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed", "error")
    }
  }

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.product_name}"?`)) return
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Delete failed")
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
      setSelected((prev) => prev.filter((id) => id !== p.id))
      flash("Product deleted")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed", "error")
    }
  }

  const bulkSetActive = async (isActive: boolean) => {
    if (selectedIds.length === 0) return
    try {
      await Promise.all(selectedIds.map((id) => patch(id, { is_active: isActive })))
      setProducts((prev) => prev.map((x) => (selectedIds.includes(x.id) ? { ...x, is_active: isActive } : x)))
      flash(`${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"} ${isActive ? "activated" : "hidden"}`)
      setSelected([])
    } catch (err) {
      flash(err instanceof Error ? err.message : "Bulk update failed", "error")
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`)) return
    try {
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch("/admin/marketplace/api", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
          return res.ok
        })
      )
      const ok = results.filter(Boolean).length
      setProducts((prev) => prev.filter((x) => !selectedIds.includes(x.id)))
      setSelected([])
      flash(ok === selectedIds.length ? `${ok} deleted` : `${ok} of ${selectedIds.length} deleted`, ok === selectedIds.length ? "success" : "info")
    } catch {
      flash("Bulk delete failed — check your connection", "error")
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    const f = merch[p.id] || {}
    setForm({
      product_name: p.product_name,
      program_key: p.program_key || "",
      affiliate_link: p.affiliate_link,
      product_description: p.product_description || "",
      product_image_url: p.product_image_url || "",
      original_price: p.original_price != null ? String(p.original_price) : "",
      sale_price: p.sale_price != null ? String(p.sale_price) : "",
      sale_end_at: sales[p.id] || "",
      merch_sale: f.sale !== false,
      merch_new: f.is_new === true,
      merch_bestseller: f.bestseller === true,
      is_active: p.is_active,
      is_featured: !!p.is_featured,
    })
    setShowForm(true)
  }

  const saveMerch = async (productId: string, flags: MerchFlags) => {
    const next = { ...merch }
    const clean: MerchFlags = {}
    if (flags.sale === false) clean.sale = false
    if (flags.is_new) clean.is_new = true
    if (flags.bestseller) clean.bestseller = true
    if (Object.keys(clean).length > 0) next[productId] = clean
    else delete next[productId]
    setMerch(next)
    try {
      await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merch-save", merch: next }),
      })
    } catch {
      // flags sync retries on the next load
    }
  }

  const saveSaleBadges = async (on: boolean) => {
    setSaleBadges(on)
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merch-save", sale_badges: on }),
      })
      const data = await res.json().catch(() => null)
      if (typeof data?.sale_badges === "boolean") setSaleBadges(data.sale_badges)
      flash(on ? "Discount badges ON — live across the whole store" : "Discount badges OFF — hidden across the whole store")
    } catch {
      // state already flipped locally — refresh retries the sync
    }
  }

  const saveSaleEnd = async (productId: string, iso: string) => {
    const next = { ...sales }
    if (iso) next[productId] = iso
    else delete next[productId]
    setSales(next)
    try {
      await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sales-save", sales: next }),
      })
    } catch {
      // timer sync retries on the next load
    }
  }

  const save = async () => {
    if (!form.product_name.trim() || !form.affiliate_link.trim()) {
      flash("Name and affiliate link are required", "error")
      return
    }
    setSaving(true)
    const payload = {
      product_name: form.product_name.trim(),
      program_key: form.program_key.trim() || null,
      affiliate_link: form.affiliate_link.trim(),
      product_description: form.product_description.trim() || null,
      product_image_url: form.product_image_url.trim() || null,
      original_price: form.original_price ? Number(form.original_price) : null,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      is_active: form.is_active,
      is_featured: form.is_featured,
    }
    try {
      if (editing) {
        const res = await fetch("/admin/marketplace/api", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Update failed")
        setProducts((prev) => prev.map((x) => (x.id === editing.id ? (data.product as Product) : x)))
        if ((form.sale_end_at || "") !== (sales[editing.id] || "")) {
          void saveSaleEnd(editing.id, form.sale_end_at.trim())
        }
        void saveMerch(editing.id, {
          sale: form.merch_sale !== false ? undefined : false,
          is_new: form.merch_new,
          bestseller: form.merch_bestseller,
        })
        setShowForm(false)
        flash("Product updated — live on TechPivo Market")
      } else {
        const res = await fetch("/admin/marketplace/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Create failed")
        setProducts((prev) => [data.product as Product, ...prev])
        if (form.sale_end_at.trim() && data.product?.id) {
          void saveSaleEnd(String(data.product.id), form.sale_end_at.trim())
        }
        if (data.product?.id && (!form.merch_sale || form.merch_new || form.merch_bestseller)) {
          void saveMerch(String(data.product.id), {
            sale: form.merch_sale !== false ? undefined : false,
            is_new: form.merch_new,
            bestseller: form.merch_bestseller,
          })
        }
        setShowForm(false)
        flash("Product added — live on TechPivo Market")
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed", "error")
    } finally {
      setSaving(false)
    }
  }

  const filterOptions = [
    { value: "all", label: "All", count: products.length },
    { value: "active", label: "Active", count: products.filter((p) => p.is_active).length },
    { value: "hidden", label: "Hidden", count: products.filter((p) => !p.is_active).length },
    { value: "featured", label: "Featured", count: products.filter((p) => p.is_featured).length },
  ]

  return (
    <div>
      <MarketPageBar
        icon={Package}
        title="Products"
        desc="Catalog, prices & sale timers — every change is live on the storefront"
        badge={
          overview ? (
            <MarketBadge tone="emerald" dot pulse>
              {overview.active}/{overview.total} live
            </MarketBadge>
          ) : undefined
        }
        actions={
          <>
            <button onClick={openCreate} className={marketBtnPrimaryCls}>
              <Plus className="h-4 w-4" /> New product
            </button>
          </>
        }
      />

      {notice && (
        <div
          className={cn(
            "mb-3 rounded-xl border px-3 py-2 text-sm",
            noticeTone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            noticeTone === "error" && "border-red-200 bg-red-50 text-red-700",
            noticeTone === "info" && "border-slate-200 bg-slate-50 text-slate-600"
          )}
        >
          {notice}
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MarketKpi label="Total products" value={String(overview?.total ?? products.length)} sub="in the catalog" icon={Package} tone="neutral" />
        <MarketKpi label="Live on store" value={String(overview?.active ?? 0)} sub={`${(overview?.total ?? 0) - (overview?.active ?? 0)} hidden`} icon={Eye} tone="emerald" />
        <MarketKpi label="Clicks" value={(overview?.clicks ?? 0).toLocaleString()} sub={`${(overview?.conversions ?? 0).toLocaleString()} conversions`} icon={Search} tone="sky" />
        <MarketKpi label="Vendors" value={String(overview?.vendors ?? 0)} sub="supplier programs" icon={Star} tone="amber" />
      </div>

      {/* store-wide discount badge switch — one flip hides every -% badge,
          strikethrough and sale countdown in the whole store */}
      <div className={cn(marketCardCls, "mb-3 flex flex-wrap items-center justify-between gap-2 px-4 py-3", saleBadges && "border-emerald-200")}>
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", saleBadges ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
            <BadgePercent className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-slate-900">
              Discount badges: {saleBadges ? <span className="text-emerald-600">ON</span> : <span className="text-slate-400">OFF</span>}
            </p>
            <p className="text-xs text-slate-500">Hides every discount badge, strikethrough price and sale countdown store-wide. Per-product flags still apply when back on.</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={saleBadges}
          aria-label="Store-wide discount badges"
          onClick={() => void saveSaleBadges(!saleBadges)}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", saleBadges ? "bg-emerald-500" : "bg-slate-300")}
          title={saleBadges ? "Turn all discount badges off" : "Turn all discount badges on"}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", saleBadges ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>

      <MarketToolbar
        left={
          <>
            <MarketSearch value={query} onChange={setQuery} placeholder="Search products or vendors..." />
            <MarketSegmented options={filterOptions} value={filter} onChange={setFilter} />
          </>
        }
        right={
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {filtered.length} of {products.length} shown
          </span>
        }
      />

      {/* bulk action bar — appears only when rows are selected */}
      {selectedIds.length > 0 && (
        <div className="sticky top-[4.25rem] z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-white shadow-[0_14px_34px_-20px_rgba(15,23,42,0.9)]">
          <span className="text-sm font-bold">
            {selectedIds.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void bulkSetActive(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
              <Eye className="h-3.5 w-3.5" /> Activate
            </button>
            <button onClick={() => void bulkSetActive(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
              <EyeOff className="h-3.5 w-3.5" /> Hide
            </button>
            <button onClick={() => void bulkDelete()} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-bold hover:bg-red-500">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button onClick={() => setSelected([])} aria-label="Clear selection" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-300 hover:text-white">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <MarketEmpty
          icon={Package}
          title={products.length === 0 ? "No products yet" : "No products match your filters"}
          desc={
            products.length === 0
              ? "Add your first product here, or import a supplier catalog from CJ Import in seconds."
              : "Try a different search term or filter."
          }
          action={
            products.length === 0 ? (
              <button onClick={openCreate} className={marketBtnPrimaryCls}>
                <Plus className="h-4 w-4" /> New product
              </button>
            ) : undefined
          }
        />
      ) : (
        <MarketTableShell maxHeight="70vh">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-slate-50/95 backdrop-blur">
                <th className={cn(marketThCls, "w-10")}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all visible products"
                    className="h-4 w-4 cursor-pointer rounded accent-[#F59E0B]"
                  />
                </th>
                <th className={marketThCls}>Product</th>
                <th className={marketThCls}>Vendor</th>
                <th className={cn(marketThCls, "text-right")}>Price</th>
                <th className={cn(marketThCls, "text-right")}>Your cut</th>
                <th className={cn(marketThCls, "text-right")}>Clicks</th>
                <th className={marketThCls}>Status</th>
                <th className={cn(marketThCls, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.product_name}`}
                      className="h-4 w-4 cursor-pointer rounded accent-[#F59E0B]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.product_image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Package className="h-4 w-4 text-slate-400" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[280px] truncate font-semibold text-slate-900">{p.product_name}</p>
                        <p className="max-w-[280px] truncate text-xs text-slate-500">{p.product_description || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.program_key || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                    {p.sale_price != null ? `$${Number(p.sale_price).toFixed(2)}` : "—"}
                    {p.original_price != null && p.original_price !== p.sale_price && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400 line-through">${Number(p.original_price).toFixed(2)}</span>
                    )}
                    {sales[p.id] && Date.parse(sales[p.id]) > Date.now() && (
                      <span className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-red-500" />
                        ends {new Date(sales[p.id]).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {(() => {
                      if (p.program_key !== "cjdropshipping" || p.sale_price == null || !p.original_price)
                        return <span className="text-slate-300">—</span>
                      const cost = Number(p.original_price) / 1.5
                      // Round to cents BEFORE the threshold so $1.50 never
                      // flags "thin!" over a floating-point speck.
                      const margin = Math.round((Number(p.sale_price) - cost) * 100) / 100
                      const good = margin >= 1.5
                      return (
                        <span
                          title={`Est. CJ cost $${cost.toFixed(2)}`}
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-bold",
                            good ? "bg-emerald-50 text-emerald-700" : margin >= 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                          )}
                        >
                          {margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(2)}{good ? "" : " · thin!"}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{p.clicks ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <MarketBadge tone={p.is_active ? "emerald" : "neutral"} dot>
                        {p.is_active ? "Active" : "Hidden"}
                      </MarketBadge>
                      {!!p.is_featured && <MarketBadge tone="amber">Featured</MarketBadge>}
                      {merch[p.id]?.is_new && <MarketBadge tone="sky">New</MarketBadge>}
                      {merch[p.id]?.bestseller && <MarketBadge tone="violet">Best</MarketBadge>}
                      {merch[p.id]?.sale === false && <MarketBadge tone="neutral">No badge</MarketBadge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      <button title={p.is_active ? "Hide" : "Activate"} aria-label={p.is_active ? `Hide ${p.product_name}` : `Activate ${p.product_name}`} onClick={() => toggle(p, "is_active")} className={marketIconBtnCls}>
                        {p.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button title="Feature" aria-label={`Feature ${p.product_name}`} onClick={() => toggle(p, "is_featured")} className={cn(marketIconBtnCls, p.is_featured && "text-amber-500 hover:text-amber-600")}>
                        <Star className={cn("h-4 w-4", p.is_featured && "fill-amber-400 text-amber-400")} />
                      </button>
                      <button title="Edit" aria-label={`Edit ${p.product_name}`} onClick={() => openEdit(p)} className={marketIconBtnCls}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button title="Delete" aria-label={`Delete ${p.product_name}`} onClick={() => remove(p)} className={marketIconBtnDangerCls}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MarketTableShell>
      )}

      <MarketModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit product" : "New product"}
        desc={editing ? "Changes publish to the storefront instantly." : "Adds a product to your live catalog."}
        footer={
          <>
            <button onClick={() => setShowForm(false)} className={marketBtnGhostCls}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} className={marketBtnPrimaryCls}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <MarketField label="Product name *" hint="What shoppers see on the storefront card.">
            <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className={marketInputCls} placeholder="Sony Alpha Mirrorless 4K Camera" />
          </MarketField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MarketField label="Vendor / program" hint="Supplier key — cjdropshipping enables margin math.">
              <input value={form.program_key} onChange={(e) => setForm({ ...form, program_key: e.target.value })} className={marketInputCls} placeholder="cjdropshipping" />
            </MarketField>
            <MarketField label="Affiliate link *" hint="Where the shopper is sent.">
              <input value={form.affiliate_link} onChange={(e) => setForm({ ...form, affiliate_link: e.target.value })} className={marketInputCls} placeholder="https://..." />
            </MarketField>
          </div>
          <MarketField label="Description">
            <textarea value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} rows={2} className={marketInputCls} />
          </MarketField>
          <MarketField label="Image URL" hint="Shown on the product card and detail page.">
            <input value={form.product_image_url} onChange={(e) => setForm({ ...form, product_image_url: e.target.value })} className={marketInputCls} placeholder="https://..." />
          </MarketField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MarketField label="Sale price ($)" hint="Leave empty when the product is not discounted.">
              <input value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} type="number" min="0" step="0.01" className={marketInputCls} />
            </MarketField>
            <MarketField label="Original price ($)" hint="Shown struck through when a sale price is set.">
              <input value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} type="number" min="0" step="0.01" className={marketInputCls} />
            </MarketField>
          </div>
          <MarketField label="Sale ends — your time (optional)" hint="Shows a live “Sale ends in …” urgency timer on the product card and page.">
            <input
              value={isoToLocalInput(form.sale_end_at)}
              onChange={(e) => setForm({ ...form, sale_end_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              type="datetime-local"
              className={marketInputCls}
            />
          </MarketField>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#F59E0B]" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-[#F59E0B]" /> Featured
            </label>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 p-3">
            <p className="mb-2 text-xs font-bold text-slate-700">Merchandising</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700" title="Show the -% discount badge + strikethrough when a sale price is set">
                <input type="checkbox" checked={form.merch_sale !== false} onChange={(e) => setForm({ ...form, merch_sale: e.target.checked })} className="accent-[#DC2626]" /> Discount badge
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700" title="Pin to the front of New Arrivals">
                <input type="checkbox" checked={!!form.merch_new} onChange={(e) => setForm({ ...form, merch_new: e.target.checked })} className="accent-[#F59E0B]" /> New arrival
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700" title="Pin to the front of Best Sellers">
                <input type="checkbox" checked={!!form.merch_bestseller} onChange={(e) => setForm({ ...form, merch_bestseller: e.target.checked })} className="accent-[#F59E0B]" /> Best seller
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3">
              <p className="text-xs text-slate-500" title="One flip hides every discount badge, strikethrough and sale countdown in the whole store">
                Store-wide badges: <strong className={saleBadges ? "text-emerald-600" : "text-slate-400"}>{saleBadges ? "ON" : "OFF"}</strong>
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={saleBadges}
                aria-label="Store-wide discount badges"
                onClick={() => void saveSaleBadges(!saleBadges)}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", saleBadges ? "bg-emerald-500" : "bg-slate-300")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", saleBadges ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          </div>
        </div>
      </MarketModal>
    </div>
  )
}

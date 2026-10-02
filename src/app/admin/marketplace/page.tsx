"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Store, Package, Eye, EyeOff, Star, Trash2, Plus, Search, RefreshCw,
  ExternalLink, Pencil, MousePointerClick, ShoppingBag, BadgeCheck, Globe,
  LayoutGrid, Plug,
} from "lucide-react"
import { MarketplaceCategoriesTab } from "@/components/admin/marketplace-categories-tab"
import { MarketplaceCjTab } from "@/components/admin/marketplace-cj-tab"

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
  is_active: true,
  is_featured: false,
}

export default function AdminMarketplacePage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "hidden" | "featured">("all")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [tab, setTab] = useState<"products" | "categories" | "cj" | "visibility">("products")

  const load = useCallback(async () => {
    const [ov, pr] = await Promise.all([
      fetch("/admin/marketplace/api?section=overview").then((r) => r.json()).catch(() => null),
      fetch("/admin/marketplace/api?section=products").then((r) => r.json()).catch(() => null),
    ])
    if (ov?.overview) setOverview(ov.overview)
    if (pr?.products) setProducts(pr.products)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_marketplace_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_pages" }, () => load())
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

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 3000)
  }

  const toggle = async (p: Product, field: "is_active" | "is_featured") => {
    const res = await fetch("/admin/marketplace/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, [field]: !p[field] }),
    })
    if (res.ok) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)))
      flash(`${p.product_name} ${field === "is_active" ? (!p.is_active ? "activated" : "hidden") : (!p.is_featured ? "featured" : "unfeatured")}`)
    }
  }

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.product_name}"?`)) return
    const res = await fetch("/admin/marketplace/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    })
    if (res.ok) {
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
      flash("Product deleted")
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      product_name: p.product_name,
      program_key: p.program_key || "",
      affiliate_link: p.affiliate_link,
      product_description: p.product_description || "",
      product_image_url: p.product_image_url || "",
      original_price: p.original_price != null ? String(p.original_price) : "",
      sale_price: p.sale_price != null ? String(p.sale_price) : "",
      is_active: p.is_active,
      is_featured: !!p.is_featured,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.product_name.trim() || !form.affiliate_link.trim()) {
      flash("Name and affiliate link are required")
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
        const data = await res.json()
        if (res.ok) {
          setProducts((prev) => prev.map((x) => (x.id === editing.id ? data.product : x)))
          setShowForm(false)
          flash("Product updated — live on TechPivo Market")
        } else flash(data.error || "Update failed")
      } else {
        const res = await fetch("/admin/marketplace/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (res.ok) {
          setProducts((prev) => [data.product, ...prev])
          setShowForm(false)
          flash("Product added — live on TechPivo Market")
        } else flash(data.error || "Create failed")
      }
    } finally {
      setSaving(false)
    }
  }

  const setPagePublished = async (is_published: boolean) => {
    const res = await fetch("/admin/marketplace/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published }),
    })
    if (res.ok) {
      setOverview((o) => (o ? { ...o, pagePublished: is_published } : o))
      flash(is_published ? "Marketplace page is LIVE" : "Marketplace page hidden")
    }
  }

  const filtered = products.filter((p) => {
    const q = query.toLowerCase()
    const matchQ = !q || p.product_name.toLowerCase().includes(q) || (p.program_key || "").toLowerCase().includes(q)
    const matchF =
      filter === "all" ? true : filter === "active" ? p.is_active : filter === "hidden" ? !p.is_active : !!p.is_featured
    return matchQ && matchF
  })

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-amber-600 font-medium flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading TechPivo Market dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white text-xl" style={{ background: "#0F172A" }}>
            <Store className="h-5 w-5 text-[#F59E0B]" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 m-0 flex items-center gap-2">
              TechPivo Market
              <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-2 py-0.5">LIVE</span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Marketplace dashboard — products, vendors, visibility & live storefront</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/marketplace"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" /> View store
          </Link>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-sm font-bold bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] rounded-lg px-3 py-2">
            <Plus className="h-4 w-4" /> New product
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" /> {notice}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: "Products", value: overview?.total ?? 0, icon: Package, color: "text-amber-600 bg-amber-50" },
          { label: "Active", value: overview?.active ?? 0, icon: Eye, color: "text-emerald-600 bg-emerald-50" },
          { label: "Featured", value: overview?.featured ?? 0, icon: Star, color: "text-amber-600 bg-amber-50" },
          { label: "Vendors", value: overview?.vendors ?? 0, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
          { label: "Clicks", value: overview?.clicks ?? 0, icon: MousePointerClick, color: "text-violet-600 bg-violet-50" },
          { label: "Conversions", value: overview?.conversions ?? 0, icon: BadgeCheck, color: "text-emerald-600 bg-emerald-50" },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-3.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{k.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {([
          { id: "products", label: "Products", icon: Package },
          { id: "categories", label: "Categories", icon: LayoutGrid },
          { id: "cj", label: "CJ Import", icon: Plug },
          { id: "visibility", label: "Storefront visibility", icon: Globe },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px inline-flex items-center gap-1.5 ${tab === t.id ? "text-amber-600 border-amber-500" : "text-slate-500 border-transparent hover:text-slate-700"}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" && <MarketplaceCategoriesTab />}

      {tab === "cj" && <MarketplaceCjTab onImported={load} />}

      {tab === "visibility" && (
        <div className="bg-white border rounded-xl p-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold text-slate-900">Marketplace page (Pages module)</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            The <strong>Marketplace</strong> entry in Admin → Pages controls whether <code>/marketplace</code> is
            published. This switch activates it instantly — no redeploy.
          </p>
          <div className="flex items-center justify-between bg-slate-50 border rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Status: {overview?.pagePublished ? "Published (live)" : "Hidden"}</p>
              <p className="text-xs text-slate-500">Also editable in Admin → Pages → Marketplace</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/pages/marketplace" className="text-xs font-medium border rounded-lg px-3 py-2 hover:bg-white inline-flex items-center gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit page
              </Link>
              <button
                onClick={() => setPagePublished(!overview?.pagePublished)}
                className={`text-xs font-bold rounded-lg px-3 py-2 ${overview?.pagePublished ? "bg-slate-900 text-white" : "bg-[#F59E0B] text-[#0F172A]"}`}
              >
                {overview?.pagePublished ? "Hide store" : "Publish store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or vendors..."
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(["all", "active", "hidden", "featured"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border whitespace-nowrap capitalize ${filter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Clicks</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.product_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.product_image_url} alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                          ) : (
                            <span className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-slate-400" /></span>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate max-w-[280px]">{p.product_name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[280px]">{p.product_description || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.program_key || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {p.sale_price != null ? `$${Number(p.sale_price).toFixed(2)}` : "—"}
                        {p.original_price != null && p.original_price !== p.sale_price && (
                          <span className="ml-1.5 text-xs font-normal text-slate-400 line-through">${Number(p.original_price).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.clicks ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.is_active ? "Active" : "Hidden"}
                        </span>
                        {!!p.is_featured && (
                          <span className="ml-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">Featured</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button title={p.is_active ? "Hide" : "Activate"} onClick={() => toggle(p, "is_active")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            {p.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button title="Feature" onClick={() => toggle(p, "is_featured")} className={`p-2 rounded-lg hover:bg-slate-100 ${p.is_featured ? "text-amber-500" : "text-slate-400"}`}>
                            <Star className="h-4 w-4" />
                          </button>
                          <button title="Edit" onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button title="Delete" onClick={() => remove(p)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No products found. Click <strong>New product</strong> to add your first TechPivo Market item.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-slate-900 mb-4">{editing ? "Edit product" : "New product"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Product name *</label>
                <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="Sony Alpha Mirrorless 4K Camera" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Vendor / program</label>
                  <input value={form.program_key} onChange={(e) => setForm({ ...form, program_key: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="amazon" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Affiliate link *</label>
                  <input value={form.affiliate_link} onChange={(e) => setForm({ ...form, affiliate_link: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Description</label>
                <textarea value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Image URL</label>
                <input value={form.product_image_url} onChange={(e) => setForm({ ...form, product_image_url: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Sale price ($)</label>
                  <input value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} type="number" min="0" step="0.01" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Original price ($)</label>
                  <input value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} type="number" min="0" step="0.01" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#F59E0B]" /> Active
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-[#F59E0B]" /> Featured
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">
                {saving ? "Saving..." : editing ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

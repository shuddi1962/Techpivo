"use client"

import Link from "next/link"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Store, Package, Eye, EyeOff, Star, Trash2, Plus, Search, RefreshCw,
  ExternalLink, Pencil, BadgeCheck, BadgePercent, Globe,
} from "lucide-react"
import { MarketplaceCategoriesTab } from "@/components/admin/marketplace-categories-tab"
import { MarketplaceBannersTab } from "@/components/admin/marketplace-banners-tab"
import { MarketplaceCjTab } from "@/components/admin/marketplace-cj-tab"
import { MarketplaceUpsellsTab } from "@/components/admin/marketplace-upsells-tab"
import { MarketplaceOrdersTab } from "@/components/admin/marketplace-orders-tab"
import { MarketplacePaymentsTab } from "@/components/admin/marketplace-payments-tab"
import { MarketplaceReviewsTab } from "@/components/admin/marketplace-reviews-tab"
import { MarketplacePromotionsTab } from "@/components/admin/marketplace-promotions-tab"
import { MarketplaceDashboardTab } from "@/components/admin/marketplace-dashboard-tab"
import { isMarketSection, MarketplaceSectionPills, MARKET_SECTIONS } from "@/components/admin/marketplace-nav"
import {
  marketBtnGhostCls,
  marketCardCls,
  MarketHeader,
  marketIconBtnCls,
  marketIconBtnDangerCls,
  MarketNotice,
  marketThCls,
  MarketStat,
  MarketStatStrip,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"
import { isoToLocalInput } from "@/lib/marketplace-banners"

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

export default function AdminMarketplacePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-amber-600 font-medium">Loading TechPivo Market dashboard...</div>}>
      <AdminMarketplacePageInner />
    </Suspense>
  )
}

type MarketTab = "dashboard" | "products" | "orders" | "reviews" | "promotions" | "categories" | "banners" | "cj" | "payments" | "upsells" | "visibility"

function AdminMarketplacePageInner() {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get("section")
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
  const [tab, setTabState] = useState<MarketTab>(
    isMarketSection(sectionParam) ? (sectionParam as MarketTab) : "dashboard"
  )
  // Tabs are URL-driven (?section=) — the global admin sidebar (which
  // shows the Marketplace nav on this page) links straight into each
  // section, so there is exactly one nav and never a duplicated copy.
  useEffect(() => {
    if (isMarketSection(sectionParam) && sectionParam !== tab) {
      setTabState(sectionParam as MarketTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionParam])
  // Per-product sale countdowns (productId → ISO end). Loaded with the list.
  const [sales, setSales] = useState<Record<string, string>>({})
  // Per-product merchandising flags. Loaded with the list.
  const [merch, setMerch] = useState<Record<string, { sale?: boolean; is_new?: boolean; bestseller?: boolean }>>({})
  // Store-wide discount-badge kill-switch (default ON). Never cached on
  // load — a refresh must show the latest saved value, not the old one.
  const [saleBadges, setSaleBadges] = useState(true)

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
    if (me?.merch && typeof me.merch === "object") setMerch(me.merch as Record<string, { sale?: boolean; is_new?: boolean; bestseller?: boolean }>)
    if (typeof me?.sale_badges === "boolean") setSaleBadges(me.sale_badges)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const ch = supabase
      .channel(`admin_marketplace_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_orders" }, () => load())
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
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, [field]: !p[field] }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)))
        flash(`${p.product_name} ${field === "is_active" ? (!p.is_active ? "activated" : "hidden") : (!p.is_featured ? "featured" : "unfeatured")}`)
      } else {
        flash(data.error || "Update failed")
      }
    } catch {
      flash("Network error — try again")
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
      if (res.ok) {
        setProducts((prev) => prev.filter((x) => x.id !== p.id))
        flash("Product deleted")
      } else {
        flash(data.error || "Delete failed")
      }
    } catch {
      flash("Network error — try again")
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

  const saveMerch = async (productId: string, flags: { sale?: boolean; is_new?: boolean; bestseller?: boolean }) => {
    const next = { ...merch }
    const clean: { sale?: boolean; is_new?: boolean; bestseller?: boolean } = {}
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
      // product save already succeeded — flags sync retries on next load
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
      // product save already succeeded — timer sync retries on next load
    }
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
          if ((form.sale_end_at || "") !== (sales[editing.id] || "")) {
            void saveSaleEnd(editing.id, form.sale_end_at.trim())
          }
          void saveMerch(editing.id, { sale: form.merch_sale !== false ? undefined : false, is_new: form.merch_new, bestseller: form.merch_bestseller })
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
          if (form.sale_end_at.trim() && data.product?.id) {
            void saveSaleEnd(String(data.product.id), form.sale_end_at.trim())
          }
          if (data.product?.id && (!form.merch_sale || form.merch_new || form.merch_bestseller)) {
            void saveMerch(String(data.product.id), { sale: form.merch_sale !== false ? undefined : false, is_new: form.merch_new, bestseller: form.merch_bestseller })
          }
          setShowForm(false)
          flash("Product added — live on TechPivo Market")
        } else flash(data.error || "Create failed")
      }
    } finally {
      setSaving(false)
    }
  }

  const setPagePublished = async (is_published: boolean) => {
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setOverview((o) => (o ? { ...o, pagePublished: is_published } : o))
        flash(is_published ? "Marketplace page is LIVE" : "Marketplace page hidden")
      } else {
        flash(data.error || "Update failed")
      }
    } catch {
      flash("Network error — try again")
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

  const activeMeta = MARKET_SECTIONS.find((s) => s.id === tab)

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      {/* header band — modern ecommerce command bar */}
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-[0_18px_45px_-20px_rgba(15,23,42,0.7)] ring-1 ring-white/10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(520px 220px at 88% -10%, rgba(245,158,11,0.35), transparent 60%), radial-gradient(420px 220px at 8% 110%, rgba(59,130,246,0.22), transparent 60%), linear-gradient(120deg, #020617 0%, #0F172A 55%, #1C1206 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at 70% 0%, black 30%, transparent 75%)",
          }}
        />
        <div className="relative flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F59E0B] shadow-lg shadow-amber-500/30 sm:h-12 sm:w-12">
              <Store className="h-5 w-5 text-[#0F172A] sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="m-0 text-lg font-extrabold tracking-tight sm:text-2xl">
                  TechPivo Market
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  LIVE
                </span>
                {activeMeta && (
                  <span className="hidden rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 sm:inline-flex">
                    {activeMeta.label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[13px] text-slate-300 sm:text-sm">
                {activeMeta ? `${activeMeta.desc} — everything live` : "Sales, products, vendors & storefront — everything live"}
              </p>
              {overview && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-300">
                  <span className="tabular-nums">{overview.active}/{overview.total} live</span>
                  <span className="tabular-nums">{overview.clicks.toLocaleString()} clicks</span>
                  <span className="tabular-nums">{overview.conversions.toLocaleString()} conversions</span>
                  <span className="tabular-nums">{overview.vendors} vendors</span>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link
              href="/marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" /> View store
            </Link>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] px-3 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> New product
            </button>
          </div>
        </div>
      </div>

      {/* mobile-first section switcher — the sidebar is hidden below lg */}
      <div className="sticky top-0 z-20 -mx-1 bg-[#F8FAFC]/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-[#F8FAFC]/80 lg:hidden">
        <MarketplaceSectionPills />
      </div>

      {notice && (
        <MarketNotice>
          <span className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0" /> {notice}
          </span>
        </MarketNotice>
      )}

      {/* full-width section content — section switching lives in the
          global admin sidebar (which shows the Marketplace nav on this
          page), so there is exactly one nav, never a duplicated copy */}
      <div className="min-w-0">
      {tab === "dashboard" && <MarketplaceDashboardTab />}

      {tab === "categories" && <MarketplaceCategoriesTab />}

      {tab === "banners" && <MarketplaceBannersTab />}

      {tab === "cj" && <MarketplaceCjTab onImported={load} />}

      {tab === "orders" && <MarketplaceOrdersTab />}

      {tab === "reviews" && <MarketplaceReviewsTab />}

      {tab === "promotions" && <MarketplacePromotionsTab />}

      {tab === "upsells" && <MarketplaceUpsellsTab />}

      {tab === "payments" && <MarketplacePaymentsTab />}

      {tab === "visibility" && (
        <div className="max-w-3xl">
          <MarketHeader
            icon={Globe}
            title="Visibility"
            desc="Storefront publish switch — Admin → Pages → Marketplace"
            actions={
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                overview?.pagePublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", overview?.pagePublished ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                {overview?.pagePublished ? "PUBLISHED · LIVE" : "HIDDEN"}
              </span>
            }
          />
          <div className={cn(marketCardCls, "p-4 sm:p-5")}>
            <p className="mb-4 text-sm leading-relaxed text-slate-600">
              Controls whether <code className="rounded bg-slate-100 px-1">/marketplace</code> is
              published. This switch activates it instantly — no redeploy.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
              <p className="text-xs text-slate-500">Also editable in Admin → Pages → Marketplace</p>
              <div className="flex gap-2">
                <Link href="/admin/pages/marketplace" className={cn(marketBtnGhostCls, "text-xs px-3 py-2")}>
                  <Pencil className="h-3.5 w-3.5" /> Edit page
                </Link>
                <button
                  onClick={() => setPagePublished(!overview?.pagePublished)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.98]",
                    overview?.pagePublished ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]"
                  )}
                >
                  {overview?.pagePublished ? "Hide store" : "Publish store"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <>
          <MarketHeader
            icon={Package}
            title="Products"
            desc="Catalog, prices & sale timers — every change is live on the storefront"
          />
          {overview && (
            <MarketStatStrip>
              <MarketStat label="Total" value={String(overview.total)} />
              <MarketStat label="Active" value={String(overview.active)} sub={`${overview.total - overview.active} hidden`} />
              <MarketStat label="Featured" value={String(overview.featured)} />
              <MarketStat label="Clicks" value={overview.clicks.toLocaleString()} sub={`${overview.conversions.toLocaleString()} conversions`} />
            </MarketStatStrip>
          )}
          {/* store-wide discount badge switch — one flip hides every -% badge,
              strikethrough and sale countdown in the whole store */}
          <div className={cn(marketCardCls, "mb-3 flex flex-wrap items-center justify-between gap-2 px-4 py-3", saleBadges && "border-emerald-200")}>
            <div className="flex items-center gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", saleBadges ? "bg-emerald-50" : "bg-slate-100")}>
                <BadgePercent className={cn("h-5 w-5", saleBadges ? "text-emerald-600" : "text-slate-400")} />
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
              onClick={() => void saveSaleBadges(!saleBadges)}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", saleBadges ? "bg-emerald-500" : "bg-slate-300")}
              title={saleBadges ? "Turn all discount badges off" : "Turn all discount badges on"}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", saleBadges ? "left-[22px]" : "left-0.5")} />
            </button>
          </div>
          <div className={cn(marketCardCls, "mb-3 flex flex-col gap-2 p-3 sm:flex-row sm:items-center")}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or vendors..."
                aria-label="Search products"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:pb-0 [&::-webkit-scrollbar]:hidden">
              {(["all", "active", "hidden", "featured"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold capitalize transition-all active:scale-[0.97]",
                    filter === f ? "bg-slate-900 text-white shadow-md" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className={cn(marketCardCls, "overflow-hidden")}>
            <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-sm min-w-[880px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-slate-50/90 backdrop-blur">
                    <th className={marketThCls}>Product</th>
                    <th className={marketThCls}>Vendor</th>
                    <th className={marketThCls}>Price</th>
                    <th className={marketThCls}>Your cut</th>
                    <th className={marketThCls}>Clicks</th>
                    <th className={marketThCls}>Status</th>
                    <th className={cn(marketThCls, "text-right")}>Actions</th>
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
                        {sales[p.id] && Date.parse(sales[p.id]) > Date.now() && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 whitespace-nowrap">
                            <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                            ends {new Date(sales[p.id]).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          if (p.program_key !== "cjdropshipping" || p.sale_price == null || !p.original_price) return <span className="text-slate-400">—</span>
                          const cost = Number(p.original_price) / 1.5
                          // Round to cents BEFORE the threshold so $1.50 never
                          // flags "thin!" over a floating-point speck.
                          const margin = Math.round((Number(p.sale_price) - cost) * 100) / 100
                          const good = margin >= 1.5
                          return (
                            <span title={`Est. CJ cost $${cost.toFixed(2)}`} className={`text-xs font-bold px-2 py-1 rounded-full ${good ? "bg-emerald-50 text-emerald-700" : margin >= 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                              {margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(2)}{good ? "" : " · thin!"}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.clicks ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.is_active ? "Active" : "Hidden"}
                        </span>
                        {!!p.is_featured && (
                          <span className="ml-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">Featured</span>
                        )}
                        {merch[p.id]?.is_new && (
                          <span className="ml-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-sky-50 text-sky-700">New</span>
                        )}
                        {merch[p.id]?.bestseller && (
                          <span className="ml-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-700">Best</span>
                        )}
                        {merch[p.id]?.sale === false && (
                          <span className="ml-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">No badge</span>
                        )}
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
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-bold text-slate-900">No products found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {products.length === 0
                            ? "Click New product above — or import from CJ in seconds."
                            : "Try a different search term or filter."}
                        </p>
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
              <div>
                <label className="text-xs font-semibold text-slate-600">Sale ends — your time (optional)</label>
                <input
                  value={isoToLocalInput(form.sale_end_at)}
                  onChange={(e) => setForm({ ...form, sale_end_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                  type="datetime-local"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Shows a live “Sale ends in …” urgency timer on this product&apos;s card and page. Empty = no timer. Set a sale price above for the discount badge.</p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#F59E0B]" /> Active
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="accent-[#F59E0B]" /> Featured
                </label>
              </div>
              <div className="rounded-lg border border-dashed p-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Promote this product</p>
                <div className="flex gap-4 flex-wrap">
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
                <div className="mt-3 pt-3 border-t border-dashed flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500" title="One flip hides every discount badge, strikethrough and sale countdown in the whole store">
                    Store-wide badges: <strong className={saleBadges ? "text-emerald-600" : "text-slate-400"}>{saleBadges ? "ON" : "OFF"}</strong>
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={saleBadges}
                    onClick={() => void saveSaleBadges(!saleBadges)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${saleBadges ? "bg-emerald-500" : "bg-slate-300"}`}
                    title={saleBadges ? "Turn all discount badges off" : "Turn all discount badges on"}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${saleBadges ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
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
    </div>
  )
}

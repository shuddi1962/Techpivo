"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ImagePlus,
  Link2,
  Monitor,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  Trash2,
  User,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { marketImage } from "@/lib/marketplace-images"
import { cleanProductTitle } from "@/lib/marketplace-copy"
import {
  marketBtnPrimaryCls,
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketCardCls,
  marketInputCls,
  MarketBadge,
  MarketLoading,
  MarketPageBar,
  marketIconBtnCls,
  marketIconBtnDangerCls,
  marketThCls,
  type MarketTone,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface SeasonalProductForm {
  productId: string
  name: string
  image: string
  originalPrice: number
  promotionalPrice: number
  badge: string
  badgeText: string
  badgeColor: string
  priority: number
  enabled: boolean
  startAt: string | null
  endAt: string | null
}

interface SeasonalSettings {
  sectionVisibility: boolean
  sectionHeading: string
  sectionSubtitle: string
  desktopLayout: string
  tabletLayout: string
  mobileLayout: string
  cardSpacing: string
  imagePresentation: string
  borderRadius: string
  cardShadow: string
  badgeStyle: string
  priceColor: string
  countdownAppearance: string
  carouselArrows: boolean
  paginationDots: boolean
  autoRotation: boolean
  transitionSpeed: number
  visibleProducts: number
  mobileProductsPerView: number
}

interface SeasonalCampaignForm {
  id: string
  name: string
  heading: string
  subtitle: string
  description: string
  bannerImage: string
  bannerLink: string
  ctaText: string
  ctaLink: string
  status: "draft" | "published" | "paused" | "expired"
  startAt: string | null
  endAt: string | null
  timezone: string
  countdownEnabled: boolean
  countdownStyle: string
  accentColor: string
  textColor: string
  analytics?: { impressions?: number; clicks?: number; addToCart?: number }
  products: SeasonalProductForm[]
  settings: SeasonalSettings
  maxProducts: number
  displayLimit: number
}

const BADGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "FLASH SALE", label: "Flash Sale" },
  { value: "HOT DEAL", label: "Hot Deal" },
  { value: "SPECIAL OFFER", label: "Special Offer" },
  { value: "CLEARANCE", label: "Clearance" },
  { value: "LIMITED TIME DEAL", label: "Limited Time Deal" },
  { value: "WEEKEND DEAL", label: "Weekend Deal" },
]

const INITIAL_SETTINGS: SeasonalSettings = {
  sectionVisibility: true,
  sectionHeading: "Special Deals.",
  sectionSubtitle: "Limited Time.",
  desktopLayout: "banner-left",
  tabletLayout: "banner-left",
  mobileLayout: "stacked",
  cardSpacing: "md",
  imagePresentation: "cover",
  borderRadius: "xl",
  cardShadow: "sm",
  badgeStyle: "pill",
  priceColor: "#EF4444",
  countdownAppearance: "boxes",
  carouselArrows: true,
  paginationDots: true,
  autoRotation: false,
  transitionSpeed: 4,
  visibleProducts: 5,
  mobileProductsPerView: 2,
}

const INITIAL_CAMPAIGN: SeasonalCampaignForm = {
  id: "",
  name: "",
  heading: "Special Deals.",
  subtitle: "Limited Time.",
  description: "Grab amazing offers on top products this season.",
  bannerImage: "",
  bannerLink: "/marketplace/deals",
  ctaText: "Shop the Sale",
  ctaLink: "/marketplace/deals",
  status: "draft",
  startAt: null,
  endAt: null,
  timezone: "Africa/Lagos",
  countdownEnabled: true,
  countdownStyle: "boxes",
  accentColor: "#EF4444",
  textColor: "#0F172A",
  products: [],
  settings: { ...INITIAL_SETTINGS },
  maxProducts: 20,
  displayLimit: 5,
}

export function MarketplaceSeasonalSalesTab(): JSX.Element | null {
  const [campaigns, setCampaigns] = useState<SeasonalCampaignForm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [mode, setMode] = useState<"list" | "editor" | "preview">("list")
  const [editing, setEditing] = useState<SeasonalCampaignForm | null>(null)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<Array<{ id: string; product_name: string; product_image_url: string | null; original_price: number | null; sale_price: number | null }>>([])
  const [editingProduct, setEditingProduct] = useState<SeasonalProductForm | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const configFor = (c: SeasonalCampaignForm) => ({
    ...c,
    products: c.products.map((p) => ({
      productId: p.productId,
      promotionalPrice: Number(p.promotionalPrice ?? 0),
      badge: p.badge,
      badgeText: p.badgeText,
      badgeColor: p.badgeColor,
      priority: Number(p.priority ?? 0),
      enabled: p.enabled,
      startAt: p.startAt,
      endAt: p.endAt,
    })),
    settings: c.settings,
  })

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_seasonal_sales")
          .maybeSingle()
        const val = (data as { value?: unknown } | null)?.value
        if (val && typeof val === "object" && (val as Record<string, unknown>).campaigns) {
          setCampaigns((val as Record<string, unknown>).campaigns as SeasonalCampaignForm[])
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false)
      }
    }
    load()
    const ch = createClient()
      .channel(`seasonal_sales_admin_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "key=eq.marketplace_seasonal_sales" }, load)
      .subscribe()
    return () => {
      alive = false
      try { createClient().removeChannel(ch) } catch {}
    }
  }, [])

  const isChanged = useMemo(() => {
    if (!editing) return false
    return JSON.stringify(editing) !== JSON.stringify(INITIAL_CAMPAIGN)
  }, [editing])

  const now = () => new Date().toISOString().slice(0, 16)

  const nowMs = () => Date.now()

  // Effective status auto-expires campaigns past their end date and marks
  // not-yet-started published campaigns as draft so the admin list never
  // shows "Live" for a campaign that has already ended.
  const effectiveStatus = (c: SeasonalCampaignForm): SeasonalCampaignForm["status"] => {
    if (c.status === "draft" || c.status === "paused") return c.status
    if (c.endAt && nowMs() > Date.parse(c.endAt)) return "expired"
    if (c.startAt && nowMs() < Date.parse(c.startAt)) return "draft"
    return c.status
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setNotice("")
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seasonal-sales-save", seasonalSales: { campaigns: configForList() } }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      setCampaigns(configForList())
      setNotice("Campaign saved — live on the storefront instantly")
      setMode("list")
      setEditing(null)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const configForList = (): SeasonalCampaignForm[] => {
    const list = campaigns.map((c) => (c.id === editing?.id ? editing! : c))
    if (editing && !list.some((c) => c.id === editing.id)) return [...list, editing]
    return list
  }

  const deleteCampaign = async (id: string) => {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seasonal-sales-delete", campaignId: id }),
      })
      if (!res.ok) throw new Error("Delete failed")
      setCampaigns((cs) => cs.filter((c) => c.id !== id))
      if (editing?.id === id) setEditing(null)
      setNotice("Campaign deleted")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const toggleStatus = async (id: string, status: SeasonalCampaignForm["status"]) => {
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seasonal-sales-status", campaignId: id, status }),
      })
      if (!res.ok) throw new Error("Status update failed")
      setCampaigns((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Status update failed")
    }
  }

  const newCampaign = () => {
    setEditing({ ...INITIAL_CAMPAIGN, id: `campaign_${Date.now()}` })
    setMode("editor")
    setNotice("")
  }

  const editCampaign = (c: SeasonalCampaignForm) => {
    setEditing(JSON.parse(JSON.stringify(c)))
    setMode("editor")
    setNotice("")
  }

  const cancelEditor = () => {
    setEditing(null)
    setMode("list")
    setNotice("")
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; tone: MarketTone }> = {
      draft: { label: "Draft", tone: "neutral" },
      published: { label: "Live", tone: "emerald" },
      paused: { label: "Paused", tone: "amber" },
      expired: { label: "Expired", tone: "red" },
    }
    return map[status] ?? map.draft
  }

  const campaignProductCount = (c: SeasonalCampaignForm) => c.products.filter((p) => p.enabled).length

  const analyticsFor = (id: string) => {
    const c = campaigns.find((x) => x.id === id)
    return c?.analytics ?? { impressions: 0, clicks: 0, addToCart: 0 }
  }

  // ---- product search ----
  const searchProducts = useCallback(async () => {
    const q = productSearch.trim()
    if (!q) { setProductResults([]); return }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("affiliate_products")
        .select("id,product_name,product_image_url,original_price,sale_price")
        .ilike("product_name", `%${q}%`)
        .eq("is_active", true)
        .limit(20)
      setProductResults((data || []) as Array<{ id: string; product_name: string; product_image_url: string | null; original_price: number | null; sale_price: number | null }>)
    } catch {
      setProductResults([])
    }
  }, [productSearch])

  useEffect(() => {
    const t = setTimeout(searchProducts, 300)
    return () => clearTimeout(t)
  }, [productSearch, searchProducts])

  const addProductToCampaign = (p: { id: string; product_name: string; product_image_url: string | null; original_price: number | null; sale_price: number | null }) => {
    if (!editing) return
    const already = editing.products.some((x) => x.productId === p.id)
    if (already) { setNotice("Product already in campaign"); return }
    if (editing.products.length >= editing.maxProducts) { setNotice("Max products reached for this campaign"); return }
    const original = Number(p.original_price ?? p.sale_price ?? 0)
    const newProduct: SeasonalProductForm = {
      productId: p.id,
      name: p.product_name,
      image: p.product_image_url || "",
      originalPrice: original,
      promotionalPrice: original,
      badge: "SPECIAL OFFER",
      badgeText: "",
      badgeColor: "#EF4444",
      priority: editing.products.length + 1,
      enabled: true,
      startAt: null,
      endAt: null,
    }
    setEditing({ ...editing, products: [...editing.products, newProduct] })
    setProductSearch("")
    setProductResults([])
  }

  const removeProduct = (productId: string) => {
    if (!editing) return
    setEditing({ ...editing, products: editing.products.filter((p) => p.productId !== productId) })
  }

  const editProduct = (p: SeasonalProductForm) => {
    setEditingProduct(JSON.parse(JSON.stringify(p)))
  }

  const saveProduct = () => {
    if (!editingProduct || !editing) return
    setEditing({
      ...editing,
      products: editing.products.map((p) => (p.productId === editingProduct!.productId ? editingProduct! : p)),
    })
    setEditingProduct(null)
  }

  const cancelProduct = () => setEditingProduct(null)

  const toggleField = (key: keyof SeasonalCampaignForm, value: unknown) => {
    if (!editing) return
    setEditing({ ...editing, [key]: value })
  }

  const toggleNested = (path: string[], value: unknown) => {
    if (!editing) return
    const next = JSON.parse(JSON.stringify(editing))
    let obj: any = next
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]
    obj[path[path.length - 1]] = value
    setEditing(next)
  }

  const uploadImage = async () => {
    const input = fileRef.current
    if (!input?.files?.[0]) return
    setNotice("Uploading…")
    try {
      const formData = new FormData()
      formData.append("file", input.files[0])
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.path) throw new Error(data?.error || "Upload failed")
      if (editing) toggleField("bannerImage", data.path)
      setNotice("Image uploaded")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Upload failed")
    } finally {
      input.value = ""
    }
  }

  if (loading) return <MarketLoading label="Loading Seasonal Sales..." />

  const publishedCount = campaigns.filter((c) => effectiveStatus(c) === "published").length
  const nowIso = now()

  // ================= LIST VIEW =================
  if (mode === "list") {
    return (
      <div className="w-full space-y-3">
        <MarketPageBar
          icon={Clock}
          title="Seasonal Sales"
          desc="Premium promotional campaigns with countdown timer, banner and product carousel"
          badge={<MarketBadge tone={publishedCount > 0 ? "emerald" : "neutral"} dot pulse>{publishedCount} live campaign{publishedCount === 1 ? "" : "s"}</MarketBadge>}
          actions={
            <>
              <button className={marketBtnPrimaryCls} onClick={newCampaign} disabled={saving}>
                {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? "Saving…" : "New Campaign"}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || campaigns.length === 0}
                className={marketBtnDarkCls}
              >
                {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save All"}
              </button>
            </>
          }
        />
        {notice && (
          <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <X className="h-3.5 w-3.5 shrink-0" /> {notice}
          </div>
        )}
        <div className={marketCardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="marketThCls pb-3">Campaign</th>
                  <th className="marketThCls pb-3">Status</th>
                  <th className="marketThCls pb-3">Schedule</th>
                  <th className="marketThCls pb-3 text-right">Products</th>
                  <th className="marketThCls pb-3 text-right">Impressions</th>
                  <th className="marketThCls pb-3 text-right">Clicks</th>
                  <th className="marketThCls pb-3 text-right">Add to Cart</th>
                  <th className="marketThCls pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No campaigns yet. Create your first seasonal sales campaign.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => {
                    const a = analyticsFor(c.id)
                    const { label, tone } = statusBadge(effectiveStatus(c))
                    const ends = c.endAt ? `ends ${new Date(c.endAt).toLocaleString()}` : "no end date"
                    const starts = c.startAt ? `starts ${new Date(c.startAt).toLocaleString()}` : "draft"
                    return (
                      <tr key={c.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#0F172A]">{c.name}</div>
                          <div className="text-[11px] text-slate-500">{c.heading}</div>
                        </td>
                        <td className="px-4 py-3">
                          <MarketBadge tone={tone}>{label}</MarketBadge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{starts} · {ends}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#0F172A]">{campaignProductCount(c)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{a.impressions}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{a.clicks}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{a.addToCart}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => editCampaign(c)}
                              className="marketIconBtnCls px-2 py-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                              title="Edit"
                            >
                              <Settings2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(JSON.parse(JSON.stringify(c)))
                                setPreviewDevice("desktop")
                                setMode("preview")
                              }}
                              className="marketIconBtnCls px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const eff = effectiveStatus(c)
                                toggleStatus(c.id, eff === "published" ? "paused" : "published")
                              }}
                              className="marketIconBtnCls px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              title={effectiveStatus(c) === "published" ? "Pause" : "Publish"}
                            >
                              {effectiveStatus(c) === "published" ? <User className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCampaign(c.id)}
                              className="marketIconBtnDangerCls px-2 py-1.5"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ================= EDITOR VIEW =================
  if (mode === "editor") {
    if (!editing) { cancelEditor(); return null }
    return (
      <div className="w-full max-w-[1400px] mx-auto space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h1 className="text-xl font-bold text-[#0F172A]">Edit Campaign</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={cancelEditor} className="marketBtnGhostCls">
              <X className="h-4 w-4 mr-1" /> Cancel
            </button>
            <button className={marketBtnPrimaryCls} onClick={save} disabled={saving || !isChanged}>
              {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Campaign"}
            </button>
          </div>
        </div>
        {notice && (
          <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <X className="h-3.5 w-3.5 shrink-0" /> {notice}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left: campaign details */}
          <div className="lg:col-span-4 space-y-4">
            <div className={marketCardCls}>
              <h3 className="font-bold text-slate-900 text-sm mb-3">Campaign Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name</label>
                  <input
                    value={editing.name}
                    onChange={(e) => toggleField("name", e.target.value)}
                    placeholder="Spring Sale 2026"
                    className={marketInputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Heading</label>
                  <input
                    value={editing.heading}
                    onChange={(e) => toggleField("heading", e.target.value)}
                    placeholder="Special Deals."
                    className={marketInputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
                  <input
                    value={editing.subtitle}
                    onChange={(e) => toggleField("subtitle", e.target.value)}
                    placeholder="Limited Time."
                    className={marketInputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    value={editing.description}
                    onChange={(e) => toggleField("description", e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editing.status}
                    onChange={(e) => toggleField("status", e.target.value as SeasonalCampaignForm["status"])}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Starts At</label>
                    <input
                      type="datetime-local"
                      value={editing.startAt ?? ""}
                      onChange={(e) => toggleField("startAt", e.target.value || null)}
                      className={marketInputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ends At</label>
                    <input
                      type="datetime-local"
                      value={editing.endAt ?? ""}
                      onChange={(e) => toggleField("endAt", e.target.value || null)}
                      className={marketInputCls}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Timezone: Africa/Lagos. Published campaigns run between start and end.
                </p>
              </div>
            </div>
            <div className={marketCardCls}>
              <h3 className="font-bold text-slate-900 text-sm mb-3">CTA &amp; Banner</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA Button Text</label>
                  <input
                    value={editing.ctaText}
                    onChange={(e) => toggleField("ctaText", e.target.value)}
                    placeholder="Shop the Sale"
                    className={marketInputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA Destination</label>
                  <input
                    value={editing.ctaLink}
                    onChange={(e) => toggleField("ctaLink", e.target.value)}
                    placeholder="/marketplace/deals"
                    className={marketInputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banner Image</label>
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*" className="sr-only" />
                    <button type="button" onClick={() => fileRef.current?.click()} className="marketBtnPrimaryCls px-3 py-2 text-xs">
                      <ImagePlus className="h-3.5 w-3.5 mr-1" /> Upload
                    </button>
                    {editing.bannerImage && (
                      <img src={marketImage(editing.bannerImage)} alt="banner" className="h-12 w-12 rounded object-cover border border-[#E2E8F0]" />
                    )}
                  </div>
                  <input
                    value={editing.bannerImage}
                    onChange={(e) => toggleField("bannerImage", e.target.value)}
                    placeholder="https://..."
                    className={marketInputCls}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Recommended 1600 × 500 px.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: products */}
          <div className="lg:col-span-8 space-y-4">
            <div className={marketCardCls}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm">Products in Campaign ({campaignProductCount(editing)})</h3>
                <div className="flex gap-2">
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="w-48 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                  />
                  <button type="button" onClick={() => setNotice("")} disabled={!editing} className="marketBtnPrimaryCls px-3 py-2 text-xs disabled:opacity-50 disabled:pointer-events-none">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                  </button>
                </div>
              </div>
              {productResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-[#E2E8F0] rounded-lg mb-3">
                  {productResults.map((p) => {
                    const already = editing.products.some((x) => x.productId === p.id)
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] cursor-pointer group">
                        {p.product_image_url && (
                          <img src={marketImage(p.product_image_url)} alt="" className="h-10 w-10 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#0F172A] truncate">{cleanProductTitle(p.product_name)}</div>
                          <div className="text-[11px] text-slate-500">
                            {formatMarketPrice(Number(p.sale_price ?? p.original_price ?? 0), 1, "USD")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addProductToCampaign(p)}
                          disabled={already}
                          className="text-xs font-bold text-amber-600 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {already ? "Added" : "Add"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="border-t border-[#E2E8F0] pt-3">
                {editing.products.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-sm">No products added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {editing.products.map((p) => (
                      <div key={p.productId} className="flex items-center gap-3 px-3 py-2.5 border border-[#E2E8F0] rounded-lg">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                          {p.image ? (
                            <img src={marketImage(p.image)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300"><X className="h-5 w-5" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#0F172A] truncate">{cleanProductTitle(p.name)}</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-[11px] tabular-nums text-slate-400 line-through">${p.originalPrice.toFixed(2)}</span>
                            <span className="text-[#EF4444] font-bold tabular-nums">${p.promotionalPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.badge} · priority {p.priority}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => editProduct(p)} className="text-xs font-medium text-amber-600 hover:underline">Edit</button>
                          <button type="button" onClick={() => removeProduct(p.productId)} className="text-xs font-medium text-slate-400 hover:text-rose-500">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Per-product editor modal (inline expand) */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-[#0F172A]">Product Promotion</h3>
                <button type="button" onClick={cancelProduct} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Promotional Selling Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.promotionalPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, promotionalPrice: Number(e.target.value) || 0 })}
                    className={marketInputCls}
                  />
                  <p className="text-[10px] text-slate-500">Original: ${editingProduct.originalPrice.toFixed(2)}</p>
                  <div className="pt-2">
                    {editingProduct.promotionalPrice >= editingProduct.originalPrice && (
                      <p className="text-[11px] text-rose-500 font-medium">Promo price should be below original.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sales Badge</label>
                  <select
                    value={editingProduct.badge}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                  >
                    {BADGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <label className="block text-xs font-bold text-slate-700 mb-1 mt-2">Custom Badge Text (optional)</label>
                  <input
                    value={editingProduct.badgeText}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badgeText: e.target.value })}
                    placeholder="e.g. FLASH SALE"
                    className={marketInputCls}
                  />
                  <label className="block text-xs font-bold text-slate-700 mb-1 mt-2">Badge Color</label>
                  <input
                    type="color"
                    value={editingProduct.badgeColor}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badgeColor: e.target.value })}
                    className="h-10 w-12 rounded-lg border-0 bg-transparent cursor-pointer p-0"
                  />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Priority</label>
                  <input
                    type="number"
                    value={editingProduct.priority}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priority: Number(e.target.value) || 0 })}
                    className={marketInputCls}
                  />
                  <p className="text-[10px] text-slate-500">Higher = shown first.</p>
                </div>
                <div className="flex items-end gap-2">
                  <label className="text-xs font-bold text-slate-700">Enabled</label>
                  <input
                    type="checkbox"
                    checked={editingProduct.enabled}
                    onChange={() => setEditingProduct({ ...editingProduct, enabled: !editingProduct.enabled })}
                    className="h-4 w-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                <button type="button" onClick={cancelProduct} className="marketBtnGhostCls">Cancel</button>
                <button className={marketBtnPrimaryCls} onClick={saveProduct}>Save Product</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ================= PREVIEW VIEW =================
  if (mode === "preview") {
    if (!editing) { cancelEditor(); return null }
    const configPreview = configFor(editing)
    const isMobile = previewDevice === "mobile"
    const isTablet = previewDevice === "tablet"
    return (
      <div className="w-full max-w-[1400px] mx-auto space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-amber-600" />
            <h1 className="text-xl font-bold text-[#0F172A]">Campaign Preview</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("editor")}
              className="marketBtnGhostCls"
            >
              <X className="h-4 w-4 mr-1" /> Back to Editor
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                  previewDevice === "desktop"
                    ? "bg-[#0F172A] text-white"
                    : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]"
                }`}
              >
                <Monitor className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                  previewDevice === "tablet"
                    ? "bg-[#0F172A] text-white"
                    : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]"
                }`}
              >
                <Phone className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                  previewDevice === "mobile"
                    ? "bg-[#0F172A] text-white"
                    : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]"
                }`}
              >
                <User className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        <div className={cn("rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-6", isMobile ? "max-w-md" : isTablet ? "max-w-lg" : "max-w-3xl mx-auto")}>
          {/* Inline preview of the section config — render a lightweight copy */}
          <div className="grid gap-6 sm:gap-8 items-start">
            <div className="flex-none sm:w-[42%] flex flex-col gap-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EF4444] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                <Clock className="h-3 w-3" /> {configPreview.name || "SEASONAL SALE"}
              </div>
              <h2 className="mt-0 mb-2 text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A] leading-[1.05]">
                {configPreview.heading || "Special Deals."}
              </h2>
              <p className="mt-0 mb-4 text-lg font-semibold text-slate-600 sm:text-xl">
                {configPreview.subtitle || "Limited Time."}
              </p>
              {configPreview.description && (
                <p className="text-base text-slate-500 leading-relaxed">{configPreview.description}</p>
              )}
              <Link
                href={configPreview.ctaLink || "/marketplace/deals"}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                {configPreview.ctaText || "Shop the Sale"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar">
                {editing.products.slice(0, 4).map((cp) => {
                  const orig = cp.originalPrice
                  const sale = cp.promotionalPrice
                  return (
                    <div key={cp.productId} className="shrink-0 w-[200px] flex flex-col">
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm">
                        {cp.image ? (
                          <img src={marketImage(cp.image)} alt={cp.name} className="h-full w-full object-cover" />
                        ) : null}
                        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-[#EF4444] px-2 py-1 text-[10px] font-black text-white shadow-sm">
                          {cp.badgeText || cp.badge}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-col gap-1 px-0">
                        <div className="line-clamp-2 text-[13px] font-semibold text-[#0F172A]">{cp.name}</div>
                        <div className="mt-1 flex items-baseline gap-1">
                          {orig > sale && <span className="text-[11px] text-slate-400 line-through">${orig.toFixed(2)}</span>}
                          <span className="text-[#EF4444] font-bold">${sale.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col gap-1 px-0">
                        <button className="w-full rounded-xl bg-[#EF4444] px-3 py-2 text-sm font-bold text-white">Add to Cart</button>
                        <button className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-slate-700">View Product</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function formatMarketPrice(usd: number | null | undefined, rate: number, currency: string): string {
  const u = Number(usd ?? 0)
  if (!Number.isFinite(u) || u <= 0) return "$—"
  const converted = currency === "USD" ? u : Math.round(u * rate * 100) / 100
  const symbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency
  return `${symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: currency === "NGN" ? 0 : 2 })}`
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown, ChevronUp, Clock, Flame, ImagePlus, Link2, RefreshCcw, Save,
  Settings2, ToggleRight, Trash2, X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatMarketPrice } from "@/lib/marketplace-pricing"
import { marketImage } from "@/lib/marketplace-images"
import { marketBtnPrimaryCls, marketBtnDarkCls, marketCardCls, MarketBadge, MarketLoading, MarketPageBar } from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface SuperDealProduct {
  id: string
  name: string
  image: string
  price: number
  oldPrice?: number
  sale_pct?: number
  rating?: number
  reviews?: number
}

interface SuperDealsForm {
  enabled: boolean
  title: string
  subtitle: string
  bannerImage: string
  bannerLink: string
  ctaText: string
  ctaLink: string
  countdownEnabled: boolean
  endAt: string
  maxProducts: number
  showDiscountBadge: boolean
  showRating: boolean
  showOriginalPrice: boolean
  autoplay: boolean
  autoplaySpeed: number
  products: SuperDealProduct[]
}

const INITIAL: SuperDealsForm = {
  enabled: true,
  title: "Super Deals",
  subtitle: "Up to 70% Off",
  bannerImage: "",
  bannerLink: "/marketplace/deals",
  ctaText: "Shop Deals",
  ctaLink: "/marketplace/deals",
  countdownEnabled: true,
  endAt: "",
  maxProducts: 8,
  showDiscountBadge: true,
  showRating: true,
  showOriginalPrice: true,
  autoplay: true,
  autoplaySpeed: 4,
  products: [],
}

export function MarketplaceSuperDealsTab() {
  const [config, setConfig] = useState<SuperDealsForm>(INITIAL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [uploading, setUploading] = useState<boolean | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<SuperDealProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<SuperDealsForm["products"][number] | null>(null)
  const [discountPercent, setDiscountPercent] = useState("")
  const [discountPrice, setDiscountPrice] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const isChanged = useMemo(() => {
    const c = JSON.stringify(config)
    return c !== JSON.stringify(INITIAL)
  }, [config])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_super_deals")
          .maybeSingle()
        const val = (data as { value?: unknown } | null)?.value
        if (val && typeof val === "object") {
          setConfig({ ...INITIAL, ...(val as Record<string, unknown>) })
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false)
      }
    }
    load()
    const ch = createClient()
      .channel(`super_deals_admin_${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "key=eq.marketplace_super_deals" }, load)
      .subscribe()
    return () => {
      alive = false
      try { createClient().removeChannel(ch) } catch {}
    }
  }, [])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 3500)
  }

  const pickUpload = () => {
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      const url = String(data?.url || data?.path || "")
      if (!url) throw new Error("Upload returned no URL")
      setConfig((c) => ({ ...c, bannerImage: url }))
      flash("Banner image uploaded")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(null)
      e.target.value = ""
    }
  }

  const searchProducts = useCallback(async () => {
    const q = productSearch.trim()
    if (!q) {
      setProductResults([])
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("affiliate_products")
        .select("id,product_name,product_image_url,sale_price,original_price")
        .ilike("product_name", `%${q}%`)
        .eq("is_active", true)
        .limit(20)
      const rows = (data || []) as Array<{
        id: string; product_name: string; product_image_url: string | null;
        sale_price: number | null; original_price: number | null
      }>
      setProductResults(rows.map((r) => ({
        id: r.id,
        name: r.product_name,
        image: r.product_image_url || "",
        price: Number(r.sale_price ?? r.original_price ?? 0),
        oldPrice: r.original_price && Number(r.original_price) > Number(r.sale_price ?? r.original_price ?? 0) ? Number(r.original_price) : undefined,
        rating: 0,
        reviews: 0,
      })))
    } catch {
      setProductResults([])
    }
  }, [productSearch])

  useEffect(() => {
    const t = setTimeout(searchProducts, 300)
    return () => clearTimeout(t)
  }, [productSearch, searchProducts])

  const addProduct = () => {
    if (!selectedProduct) return
    const already = config.products.some((p) => p.id === selectedProduct.id)
    if (already) {
      flash("Product already added")
      return
    }
    const p: SuperDealsForm["products"][number] = {
      ...selectedProduct,
      sale_pct: discountPercent ? Number(discountPercent) : undefined,
    }
    if (discountPrice) {
      p.price = Number(discountPrice)
    }
    setConfig((c) => ({ ...c, products: [...c.products, p] }))
    setSelectedProduct(null)
    setDiscountPercent("")
    setDiscountPrice("")
    flash("Product added to Super Deals")
  }

  const removeProduct = (id: string) => {
    setConfig((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) }))
    flash("Product removed")
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "super-deals-save", superDeals: config }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      flash("Super Deals saved — live on the storefront instantly")
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const toggleField = (key: keyof SuperDealsForm, value: unknown) => {
    setConfig((c) => ({ ...c, [key]: value }))
  }

  if (loading) return <MarketLoading label="Loading Super Deals..." />

  return (
    <div className="w-full space-y-3">
      <MarketPageBar
        icon={Flame}
        title="Super Deals"
        desc="Promotional campaigns with countdown timer, banner, and discounted product carousel"
        badge={<MarketBadge tone="amber" dot pulse>{config.enabled ? "Live" : "Disabled"}</MarketBadge>}
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving || !isChanged}
            className={cn(marketBtnPrimaryCls, "px-5 py-2.5 font-extrabold", !isChanged && "opacity-50 pointer-events-none")}
          >
            {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Super Deals"}
          </button>
        }
      />
      {notice && (
        <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <X className="h-3.5 w-3.5 shrink-0" /> {notice}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-3">
          <div className={cn(marketCardCls, "p-4")}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 text-sm">General Settings</span>
              <button
                type="button"
                onClick={() => toggleField("enabled", !config.enabled)}
                className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
                aria-checked={config.enabled}
                role="switch"
                aria-label={config.enabled ? "Disable Super Deals" : "Enable Super Deals"}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    config.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Promotion Title</label>
                <input
                  value={config.title}
                  onChange={(e) => toggleField("title", e.target.value)}
                  placeholder="Super Deals"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
                <input
                  value={config.subtitle}
                  onChange={(e) => toggleField("subtitle", e.target.value)}
                  placeholder="Up to 70% Off"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CTA Button Text</label>
                <input
                  value={config.ctaText}
                  onChange={(e) => toggleField("ctaText", e.target.value)}
                  placeholder="Shop Deals"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CTA Destination URL</label>
                <input
                  value={config.ctaLink}
                  onChange={(e) => toggleField("ctaLink", e.target.value)}
                  placeholder="/marketplace/deals"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Products to Display</label>
                <input
                  type="number"
                  value={config.maxProducts}
                  onChange={(e) => toggleField("maxProducts", Number(e.target.value) || 8)}
                  min="1"
                  max="20"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.showDiscountBadge}
                    onChange={() => toggleField("showDiscountBadge", !config.showDiscountBadge)}
                    className="h-3.5 w-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                  />
                  Show discount badges
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.showRating}
                    onChange={() => toggleField("showRating", !config.showRating)}
                    className="h-3.5 w-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                  />
                  Show ratings
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.showOriginalPrice}
                    onChange={() => toggleField("showOriginalPrice", !config.showOriginalPrice)}
                    className="h-3.5 w-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                  />
                  Show original prices
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.autoplay}
                    onChange={() => toggleField("autoplay", !config.autoplay)}
                    className="h-3.5 w-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                  />
                  Carousel autoplay
                </label>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Autoplay Speed (seconds)</label>
                  <input
                    type="number"
                    value={config.autoplaySpeed}
                    onChange={(e) => toggleField("autoplaySpeed", Number(e.target.value) || 4)}
                    min="1"
                    max="30"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Settings */}
          <div className={cn(marketCardCls, "p-4")}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">Countdown Timer</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="countdown"
                  checked={config.countdownEnabled}
                  onChange={() => toggleField("countdownEnabled", !config.countdownEnabled)}
                  className="h-3.5 w-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="countdown" className="text-sm font-bold text-slate-700">
                  Enable countdown timer
                </label>
              </div>
              {config.countdownEnabled && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={config.endAt}
                    onChange={(e) => toggleField("endAt", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Promotion automatically expires when the countdown reaches zero.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Banner + Products */}
        <div className="lg:col-span-1 space-y-3">
          {/* Banner Upload */}
          <div className={cn(marketCardCls, "p-4")}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">Promotional Banner</h3>
            <div className="space-y-3">
              <div className="relative aspect-[16/9] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                {config.bannerImage ? (
                  <img src={config.bannerImage} alt="Banner preview" className="h-full w-full object-cover rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs">No banner image</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={pickUpload}
                  disabled={uploading === true}
                  className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-slate-50 transition-colors"
                >
                  {uploading === true ? (
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-amber-600" />
                  )}
                </button>
              </div>
              <input
                type="file"
                ref={fileRef}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={onFile}
              />
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Banner Link URL</label>
                <input
                  value={config.bannerLink}
                  onChange={(e) => toggleField("bannerLink", e.target.value)}
                  placeholder="/marketplace/deals"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className={cn(marketCardCls, "p-4 flex-1")}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Promotional Products ({config.products.length})</h3>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, products: [] }))}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear all
              </button>
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white mb-3">
              {productResults.length === 0 && productSearch.trim() !== "" ? (
                <div className="p-3 text-center text-xs text-slate-500">No products found</div>
              ) : (
                productResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent ${
                      selectedProduct?.id === p.id ? "border-amber-200 bg-amber-50" : ""
                    }`}
                  >
                    <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-slate-100">
                      {p.image ? (
                        <img src={marketImage(p.image)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <X className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {formatMarketPrice(p.price, 1, "USD")}
                        {p.oldPrice && p.oldPrice > p.price ? ` (was {formatMarketPrice(p.oldPrice, 1, "USD")})` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Product Form */}
            {selectedProduct && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-xs">Add: {selectedProduct.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Change
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="e.g. 25"
                      min="0"
                      max="100"
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount Price ($)</label>
                    <input
                      type="number"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="e.g. 14.99"
                      step="0.01"
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addProduct}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 rounded transition-colors"
                >
                  Add to Super Deals
                </button>
              </div>
            )}

            {/* Current Products */}
            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
              {config.products.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No products added. Search and add products above.
                </div>
              ) : (
                config.products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="h-8 w-8 shrink-0 rounded overflow-hidden bg-slate-100">
                      {p.image ? (
                        <img src={marketImage(p.image)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <X className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        {p.sale_pct && <span className="text-amber-600 font-bold">-{p.sale_pct}%</span>}
                        {formatMarketPrice(p.price, 1, "USD")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

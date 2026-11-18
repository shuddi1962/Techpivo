"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  ShoppingCart, Zap, X, ChevronLeft, ChevronRight,
  Truck, ShieldCheck, RotateCcw, Minus, Plus, Clock, Check, MapPin,
  Star as StarIcon, RefreshCw, Copy, Play,
  Package, Store, Sparkles, Settings,
} from "lucide-react"
import { addToCart } from "@/lib/marketplace-cart"
import { openCartPopup, openCheckout } from "@/lib/marketplace-events"
import { marketImage, cleanSupplierText } from "@/lib/marketplace-images"
import { MarketPrice } from "./market-price"
import { useMarketCurrency, useFxRate, formatMarketPrice } from "@/lib/marketplace-pricing"
import { useProductDiscount } from "./market-flags"
import { useSaleEnd } from "./sale-countdown"
import { formatWeight, neutralSku } from "./product-detail"
import { rewriteProduct } from "@/lib/marketplace-copy"
import { CompletePurchase } from "@/components/marketplace/complete-purchase"

interface Review {
  id: string
  author_name: string
  rating: number
  title: string | null
  comment: string | null
  created_at: string
}

interface Related {
  id: string
  product_name: string
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  program_key: string | null
}

interface Product {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  program_key: string | null
  category_slug: string | null
  subcategory_slug: string | null
  stock: number | null
  clicks: number | null
  cj_data: unknown
  cj_pid: string | null
  cj_sku: string | null
}

interface VariantOpt {
  vid: string
  label: string
  price: number | null
  image: string
  stock: number | null
  weightGrams: number | null
}

const WISH_KEY = "tp_market_wish_v1"

function readWish(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(WISH_KEY)
    const arr = (raw ? JSON.parse(raw) : []) as string[]
    return Array.isArray(arr) && arr.includes(id)
  } catch {
    return false
  }
}

function toggleWish(id: string): boolean {
  const next = !readWish(id)
  try {
    const raw = window.localStorage.getItem(WISH_KEY)
    const arr = (raw ? JSON.parse(raw) : []) as string[]
    const ids = Array.isArray(arr) ? arr.filter((x) => x !== id) : []
    if (next) ids.push(id)
    window.localStorage.setItem(WISH_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
  return next
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={`h-[${size / 4}rem] w-[${size / 4}rem] ${i < Math.round(value) ? "fill-[#0F172A] text-[#0F172A]" : "text-[#CBD5E1]"}`}
        />
      ))}
    </span>
  )
}

function clipNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function useSwipeCallbacks(onLeft: () => void, onRight: () => void) {
  const startRef = useRef(0)
  const onStart = useCallback((e: React.TouchEvent) => {
    startRef.current = e.touches[0].clientX
  }, [])
  const onEnd = useCallback((e: React.TouchEvent) => {
    const dx = startRef.current - e.changedTouches[0].clientX
    if (Math.abs(dx) < 40) return
    if (dx > 0) onLeft()
    else onRight()
  }, [onLeft, onRight])
  return { onStart, onEnd }
}

export function ProductDetailMobile({
  product: p,
  reviews: initialReviews,
  related,
  deptSlug,
  deptName,
  detail,
  sold,
  hasSupplier,
}: {
  product: Product
  reviews: Review[]
  related: Related[]
  deptSlug: string | null
  deptName: string | null
  detail: { short: string; paras: string[]; images: string[]; video?: string; material?: string; weightGrams?: number | null }
  sold: number
  hasSupplier: boolean
}) {
  const currency = useMarketCurrency()
  const rate = useFxRate(currency)
  const saleEnd = useSaleEnd(p.id)
  const { pct: discount, oldPrice } = useProductDiscount(
    { price: Number(p.sale_price ?? p.original_price ?? 0), oldPrice: p.original_price ?? undefined },
    p.id
  )
  const showSale = discount > 0

  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const lastAddRef = useRef(0)
  const [wished, setWished] = useState(() => readWish(p.id))
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [variants, setVariants] = useState<VariantOpt[]>([])
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [liveDetail, setLiveDetail] = useState<{ short: string; paras: string[]; images: string[]; video?: string; material?: string; weightGrams?: number | null } | null>(null)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [rNotice, setRNotice] = useState("")
  const [rSending, setRSending] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ desc: true })
  const [reviewRating, setReviewRating] = useState(0)

  const basePrice = Number(p.sale_price ?? p.original_price ?? 0)
  const labelParts = variants.length > 0 ? variants[0].label.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean) : []
  const selected: VariantOpt | null =
    variants.length > 0 && labelParts.length > 0
      ? variants.find((v) => {
          const vp = v.label.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean)
          return vp.length === labelParts.length && vp.every((part, i) => part === (picked[Object.keys(picked)[i]] || ""))
        }) || null
      : null
  const price = selected?.price ?? basePrice
  const inStock = selected?.stock != null ? selected.stock > 0 : (p.stock ?? 0) > 0

  const rewritten = useMemo(() => rewriteProduct(p.product_name, p.product_description), [p.product_name, p.product_description])
  const brandName = (typeof p.cj_data === "object" && p.cj_data !== null && (p.cj_data as { brand?: string })?.brand)
    ? String((p.cj_data as { brand?: string }).brand)
    : p.program_key || "TechPivo Market"

  const galleryImages = useMemo(() => {
    const imgs: string[] = []
    if (p.product_image_url) imgs.push(p.product_image_url)
    for (const v of variants) if (v.image && !imgs.includes(v.image)) imgs.push(v.image)
    for (const img of detail.images || []) if (!imgs.includes(img)) imgs.push(img)
    return imgs
  }, [p.product_image_url, variants, detail.images])
  const gallery: Array<{ type: "image" | "video"; src: string }> = [
    ...(detail.video ? [{ type: "video" as const, src: detail.video }] : []),
    ...galleryImages.map((src): { type: "image"; src: string } => ({ type: "image", src })),
  ]

  const { onStart: galleryStart, onEnd: galleryEnd } = useSwipeCallbacks(
    () => setGalleryIndex((i) => (i === gallery.length - 1 ? 0 : i + 1)),
    () => setGalleryIndex((i) => (i === 0 ? gallery.length - 1 : i - 1))
  )
  const { onStart: viewerStart, onEnd: viewerEnd } = useSwipeCallbacks(
    () => setGalleryIndex((i) => (i === gallery.length - 1 ? 0 : i + 1)),
    () => setGalleryIndex((i) => (i === 0 ? gallery.length - 1 : i - 1))
  )

  useEffect(() => {
    fetch(`/api/marketplace/variants?product_id=${encodeURIComponent(p.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.variants) && d.variants.length > 0) {
          setVariants(d.variants as VariantOpt[])
          const at = (Array.isArray(d?.attributes) ? d.attributes : []) as Array<{ name: string; values: string[] }>
          const init: Record<string, string> = {}
          at.forEach((a) => { if (a.values[0]) init[a.name] = a.values[0] })
          setPicked(init)
        }
      })
      .catch(() => {})
  }, [p.id])

  useEffect(() => {
    fetch(`/api/marketplace/detail?product_id=${encodeURIComponent(p.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && (d.short || (Array.isArray(d.paras) && d.paras.length > 0) || (Array.isArray(d.images) && d.images.length > 0) || d.video)) {
          setLiveDetail({
            short: typeof d.short === "string" ? d.short : "",
            paras: Array.isArray(d.paras) ? d.paras : [],
            images: Array.isArray(d.images) ? d.images : [],
            video: typeof d.video === "string" ? d.video : "",
            material: typeof d.material === "string" ? d.material : "",
            weightGrams: Number.isFinite(Number(d.weightGrams)) ? Number(d.weightGrams) : null,
          })
        }
      })
      .catch(() => {})
  }, [p.id])

  useEffect(() => {
    let alive = true
    const reload = () => {
      fetch(`/api/marketplace/reviews?product_id=${encodeURIComponent(p.id)}`)
        .then((r) => r.json())
        .then((d) => { if (alive && Array.isArray(d?.reviews)) setReviews(d.reviews as Review[]) })
        .catch(() => {})
    }
    ;(async () => {
      let cleanup: (() => void) = () => {}
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const ch = supabase
          .channel(`market_reviews_mobile_${p.id}_${Date.now()}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_reviews", filter: `product_id=eq.${p.id}` }, () => reload())
          .subscribe()
        cleanup = () => { supabase.removeChannel(ch) }
      } catch {
        // realtime unavailable — form still posts, list refreshes on focus
      }
      if (!alive) return
      const onFocus = () => reload()
      window.addEventListener("focus", onFocus)
      return () => {
        alive = false
        window.removeEventListener("focus", onFocus)
        try { cleanup() } catch {}
      }
    })()
    return () => { alive = false }
  }, [p.id])

  const avg = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews]
  )

  const detailEff = liveDetail || detail

  const doAdd = useCallback(() => {
    const now = Date.now()
    if (now - lastAddRef.current < 400) return
    lastAddRef.current = now
    if (!inStock) return
    const variantPick = variants.find((v) => {
      const vp = v.label.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean)
      const sp = Object.values(picked)
      return vp.length === sp.length && vp.every((part, i) => part === sp[i])
    })
    addToCart(p.id, qty, variantPick ? { vid: variantPick.vid, label: variantPick.label, image: variantPick.image || null } : null)
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
    openCartPopup(p.id)
  }, [p.id, qty, variants, picked, inStock])

  const buyNow = useCallback(() => {
    if (!inStock) return
    const variantPick = variants.find((v) => {
      const vp = v.label.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean)
      const sp = Object.values(picked)
      return vp.length === sp.length && vp.every((part, i) => part === sp[i])
    })
    addToCart(p.id, qty, variantPick ? { vid: variantPick.vid, label: variantPick.label, image: variantPick.image || null } : null)
    openCheckout()
  }, [p.id, qty, variants, picked, inStock])

  function submitReviewMobile() {
    const textarea = document.getElementById("review-text") as HTMLTextAreaElement | null
    if (!textarea || !textarea.value.trim() || rSending) return
    if (reviewRating < 1) { setRNotice("Please tap a star rating first."); return }
    setRSending(true)
    setRNotice("")
    fetch("/api/marketplace/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: p.id, author_name: "Verified buyer", rating: reviewRating, title: "", comment: textarea.value.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.review) {
          setReviews((prev) => [data.review, ...prev])
          textarea.value = ""
          setReviewRating(0)
          setRNotice("Thanks — your review is live.")
        } else {
          setRNotice(data?.error || "Could not submit your review.")
        }
      })
      .catch(() => setRNotice("Could not submit your review."))
      .finally(() => setRSending(false))
  }

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/marketplace/product/${p.id}`

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  const isOpen = (key: string) => !!openSections[key]

  return (
    <div className="bg-[#F8FAFC] min-h-screen marketplace-body product-detail-mobile">
      {/* ================= Gallery ================= */}
      <section className="px-0 pt-0 pb-1">
        <div className="relative w-full">
          <div
            className="aspect-video bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden relative"
            onDoubleClick={() => setZoomOpen((o) => !o)}
          >
            {gallery.length > 0 ? (
              <>
                {gallery[galleryIndex].type === "video" ? (
                  <video
                    src={gallery[galleryIndex].src}
                    controls playsInline preload="metadata"
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gallery[galleryIndex].src}
                    alt={p.product_name}
                    className="w-full h-full object-contain"
                    loading="eager"
                    decoding="async"
                    {...galleryStart}
                    {...galleryEnd}
                  />
                )}
                {showSale && (
                  <span className="absolute top-3 left-3 z-20 bg-[#EF4444] text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm">
                    -{discount}%
                  </span>
                )}
                <span className="absolute bottom-3 right-3 z-20 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1.5 rounded-full shadow-sm">
                  {galleryIndex + 1} / {gallery.length}
                </span>
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={() => setZoomOpen(true)}
                      className="absolute top-3 right-2 z-30 w-8 h-8 rounded-full bg-white/90 text-[#0F172A] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
                      aria-label="View full screen"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                No image available
              </div>
            )}
          </div>

          {/* Thumbnail strip — slide by touch, no arrows */}
          {gallery.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide" role="group" aria-label="Image thumbnails">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  aria-pressed={galleryIndex === i}
                  className={`shrink-0 w-12 h-12 rounded-xl border-2 overflow-hidden bg-[#F8FAFC] transition-all ${galleryIndex === i ? "border-[#FF6B00] shadow-sm" : "border-[#E2E8F0] hover:border-slate-400"}`}
                >
                  {g.type === "video" ? (
                    <div className="w-full h-full bg-[#0F172A] flex items-center justify-center">
                      <Play className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Sold count only */}
          <div className="mt-2 flex items-center justify-between gap-2 px-4">
            <span className="text-[10px] text-slate-500">{sold > 0 ? `${clipNumber(sold)} sold` : ""}</span>
          </div>
        </div>
      </section>

      {/* ================= Product info ================= */}
      <section className="px-4 space-y-3 pb-2">
        {/* Product title — clean, not bold */}
        <h1 className="text-[17px] font-medium text-[#222222] leading-[1.4] font-sans">
          {rewritten.title || p.product_name || "Product"}
        </h1>

        {/* SKU + stock below title */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span>SKU: <strong className="text-[#0F172A]">{neutralSku(p.id)}</strong></span>
          {hasSupplier && <span className="h-3 w-[1px] bg-[#CBD5E1] shrink-0" />}
          {hasSupplier && <span className="text-slate-400">Supplier item</span>}
          {inStock && <span className="ml-auto text-[10px] font-medium text-[#10B981]">In stock</span>}
          {!inStock && <span className="ml-auto text-[10px] font-medium text-[#EF4444]">Unavailable</span>}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Stars value={avg} size={14} />
          <span className="text-xs font-medium text-[#0F172A]">{avg.toFixed(1)}</span>
          <span className="text-[10px] text-slate-500">({reviews.length})</span>
          {reviews.length > 0 && <span className="text-[9px] bg-[#10B981]/10 text-[#10B981] px-1.5 py-0.5 rounded-full">Verified buyers</span>}
        </div>

        <div className="flex items-baseline gap-2 mt-3">
          <MarketPrice usd={price} className={`text-[22px] font-bold tabular-nums ${showSale ? "text-[#EF4444]" : "text-[#0F172A]"}`} />
          {oldPrice && showSale && (
            <MarketPrice usd={oldPrice} className="text-xs text-slate-400 line-through" />
          )}
          {showSale && (
            <span className="text-[10px] font-semibold text-white bg-[#EF4444] px-1.5 py-0.5 rounded">-{discount}%</span>
          )}
        </div>

        {saleEnd.trim() && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2 py-0.5">
            <Clock className="h-2.5 w-2.5 text-[#F59E0B]" />
            <span className="text-[10px] text-white font-semibold">Sale ends {saleEnd}</span>
          </div>
        )}

        {/* Short description / highlights */}
        {(rewritten.short || detailEff.short) && (
          <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              {rewritten.short || detailEff.short}
            </p>
          </div>
        )}

        {/* Variations — dropdown select */}
        {variants.length > 0 && (
          <section className="mt-2 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <p className="text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">Choose an option</p>
            <select
              value={selected?.label || variants[0]?.label || ""}
              onChange={(e) => {
                const val = e.target.value
                const variant = variants.find((v) => v.label === val)
                if (variant) {
                  // Map variant label parts to attribute names
                  const attrNames = variants[0]?.label.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean) || []
                  const parts = val.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean)
                  const nextPicked: Record<string, string> = {}
                  parts.forEach((part, i) => {
                    if (attrNames[i]) nextPicked[attrNames[i]] = part
                  })
                  setPicked(nextPicked)
                }
              }}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] appearance-none cursor-pointer"
            >
              {variants.map((v) => (
                <option key={v.vid} value={v.label}>
                  {v.label} — {formatMarketPrice(Number(v.price ?? basePrice), rate, currency)}{v.stock != null && v.stock <= 0 ? " (unavailable)" : ""}
                </option>
              ))}
            </select>
            {selected?.stock != null && (
              <p className="text-[10px] mt-1.5 text-slate-500">
                {selected.stock > 0 ? `${selected.stock} available` : "Made to order"}
              </p>
            )}
          </section>
        )}

        {/* Quantity */}
        <div className="mt-2">
          <label className="text-[10px] font-medium text-slate-500 block mb-1 uppercase tracking-wider">Quantity</label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={!inStock}
              className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white flex items-center justify-center text-[#0F172A] font-medium disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-7 text-center text-sm font-bold tabular-nums text-[#0F172A]">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              disabled={!inStock || (selected?.stock != null && qty >= selected.stock)}
              className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white flex items-center justify-center text-[#0F172A] font-medium disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {!inStock && (
            <p className="mt-1 text-[10px] text-slate-500">This option is currently unavailable.</p>
          )}
        </div>

        <div className="pb-2" />
      </section>

      {/* ================= Upsell: Complete your purchase ================= */}
      <section className="px-4 space-y-2 pb-1">
        <CompletePurchase
          productId={p.id}
          mainName={p.product_name}
          mainPrice={price}
          mainWas={oldPrice && showSale ? oldPrice : undefined}
          mainVariant={
            selected
              ? { vid: selected.vid, label: selected.label, image: selected.image || null }
              : null
          }
          mainQty={qty}
        />
      </section>

      {/* ================= Seller Information ================= */}
      <section className="px-4 space-y-2 pb-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
          <div className="flex items-start gap-2 text-sm">
            <StoreIcon className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <div>
              <div className="font-medium text-[#0F172A]">{brandName}</div>
              <div className="text-[10px] text-slate-500">TechPivo Marketplace seller</div>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2">
            <LinkIcon className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <Link href={deptSlug ? `/marketplace/category/${deptSlug}` : "/marketplace"} className="text-sm text-[#FF6B00] hover:underline">
              Browse store
            </Link>
          </div>
        </div>
      </section>

      {/* ================= Delivery & returns ================= */}
      <section className="px-4 space-y-2 pb-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
          <p className="text-[10px] font-medium text-slate-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
            <Truck className="h-3.5 w-3.5 text-[#FF6B00]" />
            Delivery &amp; returns
          </p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-1.5 text-sm">
              <Clock className="h-3 w-3 shrink-0 text-[#B45309] mt-0.5" />
              <span className="text-slate-700">Standard delivery 7–12 days, tracked worldwide. Express 3–7 days.</span>
            </div>
            <div className="flex items-start gap-1.5 text-sm">
              <RotateCcw className="h-3 w-3 shrink-0 text-[#F59E0B] mt-0.5" />
              <span className="text-slate-700">30-day easy returns on eligible items. Start a return from your orders page.</span>
            </div>
            <div className="flex items-start gap-1.5 text-sm">
              <ShieldCheck className="h-3 w-3 shrink-0 text-[#10B981] mt-0.5" />
              <span className="text-slate-700">Secure payments via Flutterwave — card, bank transfer and mobile money.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Collapsible info sections ================= */}
      <section className="px-4 space-y-1.5 pb-[130px]">
        <Accordion
          key="desc"
          title="Product Description"
          icon={<FileTextIcon className="h-4 w-4" />}
          open={isOpen("desc")}
          onToggle={() => toggleSection("desc")}
        >
          <div className="text-sm text-slate-700 leading-relaxed space-y-3">
            {(detailEff.paras.length > 0 ? detailEff.paras : (rewritten.paras.length > 0 ? rewritten.paras : [])).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            {(detailEff.paras.length === 0 && rewritten.paras.length === 0) && (
              <p className="text-slate-500">Full product details are on the way — check back soon.</p>
            )}
          </div>
        </Accordion>

        <Accordion
          title="Key Features"
          icon={<SparklesIcon className="h-4 w-4" />}
          open={isOpen("features")}
          onToggle={() => toggleSection("features")}
        >
          <ul className="space-y-2">
            {featureList(detailEff, rewritten).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#10B981] mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          title="Specifications"
          icon={<SettingsIcon className="h-4 w-4" />}
          open={isOpen("specs")}
          onToggle={() => toggleSection("specs")}
        >
          <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
            <table className="w-full text-sm">
              <tbody>
                {specRows(detailEff, p).map((row) => (
                  <tr key={row.k} className="border-t border-[#E2E8F0]">
                    <th className="w-1/3 bg-[#F8FAFC] px-3 py-2 text-left font-medium text-slate-600">{row.k}</th>
                    <td className="px-3 py-2 text-slate-800">{row.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion
          title="What's in the Box"
          icon={<PackageIcon className="h-4 w-4" />}
          open={isOpen("box")}
          onToggle={() => toggleSection("box")}
        >
          <p className="text-sm text-slate-700 leading-relaxed">{boxContent(detailEff)}</p>
        </Accordion>

        <Accordion
          title="Delivery &amp; Returns"
          icon={<Truck className="h-4 w-4" />}
          open={isOpen("delivery")}
          onToggle={() => toggleSection("delivery")}
        >
          <div className="grid gap-1.5">
            <div className="flex items-start gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#B45309] mt-0.5" />
              <span className="text-slate-700">Standard delivery 7–12 days, tracked worldwide. Express 3–7 days.</span>
            </div>
            <div className="flex items-start gap-1.5 text-sm">
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-[#F59E0B] mt-0.5" />
              <span className="text-slate-700">30-day easy returns on eligible items. Start a return from your orders page.</span>
            </div>
            <div className="flex items-start gap-1.5 text-sm">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#10B981] mt-0.5" />
              <span className="text-slate-700">Secure payments via Flutterwave — card, bank transfer and mobile money.</span>
            </div>
          </div>
        </Accordion>
      </section>

      {/* ================= Reviews ================= */}
      <section className="px-4 space-y-2 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-[#222222]">Customer reviews</h2>
          <span className="text-[10px] text-slate-500">{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-xl font-medium text-[#222222]">{avg.toFixed(1)}</span>
              <span className="text-xs text-slate-500">/ 5</span>
            </div>
            <Stars value={avg} size={16} />
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>5 ★</span>
              <span className="font-medium text-[#0F172A]">{reviews.length ? Math.round((reviews.filter((r) => r.rating === 5).length / reviews.length) * 100) : 0}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-0.5">
              <span>4 ★</span>
              <span className="font-medium text-[#0F172A]">{reviews.length ? Math.round((reviews.filter((r) => r.rating === 4).length / reviews.length) * 100) : 0}%</span>
            </div>
          </div>
        </div>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-3">No reviews yet — be the first to share your thoughts.</p>
        ) : (
          <div className="space-y-1.5">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="border border-[#E2E8F0] rounded-xl p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-medium text-[#222222]">{r.author_name}</span>
                  <Stars value={r.rating} size={11} />
                  <span className="ml-auto text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.title && <p className="text-sm font-medium text-slate-700">{r.title}</p>}
                {r.comment && <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 border-t border-[#E2E8F0] pt-2 space-y-2">
          <h3 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Write a review</h3>
          <textarea
            id="review-text"
            placeholder="What did you think of this product?"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
          />
          <div className="flex items-center gap-1 mt-1" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setReviewRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                aria-pressed={reviewRating === n}
                className={`h-5 w-5 ${n <= reviewRating ? "fill-[#0F172A] text-[#0F172A]" : "text-slate-300"}`}
              >
                <StarIcon />
              </button>
            ))}
            <span className="ml-auto text-[10px] text-slate-500">{reviewRating || 0} / 5</span>
          </div>
          {rNotice && <p className="text-[10px] text-slate-600">{rNotice}</p>}
          <button
            onClick={submitReviewMobile}
            disabled={rSending}
            className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-xs font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {rSending ? "Posting…" : "Post review"}
          </button>
        </div>
      </section>

      {/* ================= Related products carousel — slide by touch, no arrows ================= */}
      {related.length > 0 && (
        <section className="px-4 space-y-1 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-[#222222]">Similar products</h2>
            {deptSlug && (
              <Link href={`/marketplace/category/${deptSlug}`} className="text-[10px] text-slate-500 font-medium hover:underline">
                Shop all →
              </Link>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/marketplace/product/${r.id}`}
                className="shrink-0 w-[148px] group"
              >
                <div className="aspect-[4/5] bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-2 relative">
                  {r.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={marketImage(r.product_image_url)} alt={r.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-[#F1F5F9] flex items-center justify-center text-[10px] text-slate-400">-</div>
                  )}
                </div>
                <h3 className="text-xs font-medium text-[#222222] line-clamp-2 leading-tight">{r.product_name}</h3>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5"><MarketPrice usd={Number(r.sale_price ?? r.original_price ?? 0)} /></p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= Fixed purchase bar ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E2E8F0] bg-white px-4 py-3 [padding-bottom:env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.12)]">
        <div className="max-w-[520px] mx-auto">
          <div className="flex items-baseline justify-between gap-3 mb-2.5">
            <span className="text-[20px] font-bold tabular-nums text-[#0F172A]">
              {formatMarketPrice(price, rate, currency)}
            </span>
            {!inStock && <span className="text-[10px] font-bold text-[#EF4444]">Unavailable</span>}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={doAdd}
              disabled={!inStock || added}
              className={`w-full h-10 rounded-lg font-medium text-[11px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none ${
                added
                  ? "bg-[#0F172A] text-white"
                  : "bg-[#FF6B00] text-[#0F172A] hover:bg-[#e86000]"
              }`}
            >
              {added ? (<><Check className="h-3 w-3" strokeWidth={3} /> <span>Added</span></>) : (<><ShoppingCart className="h-3 w-3" /> <span>Add to Cart</span></>)}
            </button>
            <button
              onClick={buyNow}
              disabled={!inStock}
              className="w-full h-10 rounded-lg border border-[#DC2626] bg-[#DC2626] font-medium text-[11px] transition-all flex items-center justify-center gap-1.5 text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <Zap className="h-3 w-3 text-white" /> <span className="text-white">Buy Now</span>
            </button>
          </div>
          {!inStock && (
            <p className="mt-1.5 text-[10px] text-slate-500 text-center">The selected option is currently unavailable to buy.</p>
          )}
        </div>
      </div>

      {shareOpen && (
        <ShareSheet url={shareUrl} title={rewritten.title || p.product_name} onClose={() => setShareOpen(false)} />
      )}

      {/* Full-screen viewer — slide by touch, no arrows on the cards */}
      {zoomOpen && gallery.length > 0 && gallery[galleryIndex].type === "image" && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen product image"
          onClick={(e) => { if (e.target === e.currentTarget) setZoomOpen(false) }}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative w-full max-w-full max-h-[80vh] flex items-center justify-center" {...viewerStart} {...viewerEnd}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery[galleryIndex].src}
              alt={p.product_name}
              className="max-w-full max-h-[75vh] object-contain"
            />
          </div>
          <span className="mt-3 text-[11px] text-white/80">{galleryIndex + 1} / {gallery.length}</span>
        </div>
      )}
    </div>
  )
}

/* ---------------- shared sub-components ---------------- */

function FileTextIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
}
function SparklesIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M19 3v4m-2 2h4m-6 4a2 2 0 11-4 0 2 2 0 014 0zM12 18a2 2 0 100-4 2 2 0 000 4z" /></svg>
}
function SettingsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function PackageIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.002 23.002 0 0113.483 20.227c-2.6 0-5.067-.257-7.423-.768M21 13.255v-.241c0-1.885 0-3.384-.225-4.665a1 1 0 00-.295-.76l-2.324-1.162a1 1 0 00-.895-.296h-3.416c-.565 0-1.034.459-1.089 1.023l-.295 2.96a1.425 1.425 0 001.396 1.4c.565 0 1.034-.459 1.089-1.023l.295-2.96c.002-.097.008-.191.022-.284l1.843.921c.366.183.77.113.977-.132l2.55-1.275a1 1 0 00.56-.828V13.255zM3.934 20.082c1.212.362 2.502.562 3.76.562h16.61c1.258 0 2.547-.2 3.76-.562m-7.498-3.508L6.06 18.598a2.25 2.25 0 01-1.958-1.536l-.296-2.96a1 1 0 01.615-.963h14.186a1 1 0 01.964.896l.295 2.96a2.25 2.25 0 01-1.957 1.536l-6.14 3.07c-.68.34-1.47.31-2.107-.042z" /></svg>
}
function StoreIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18a2 2 0 012 2v2a2 2 0 01-2 2H3a2 2 0 01-2-2v-2a2 2 0 012-2zM3 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM3 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zM3 19a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z" /></svg>
}
function LinkIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a3 3 0 014.243 4.243M9.88 8.688a3 3 0 000 4.243M12 18a9 9 0 100-18 9 9 0 000 18z" /></svg>
}

function Accordion({ children, title, icon, open, onToggle }: { children: React.ReactNode; title: string; icon: React.ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-background hover:bg-[#F8FAFC]" aria-expanded={open}>
        <div className="flex items-center gap-2">{icon} <span className="text-sm font-medium text-[#0F172A]">{title}</span></div>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div className={`border-t border-[#E2E8F0] ${open ? "" : "hidden"}`}>{children}</div>
    </div>
  )
}

function featureList(detail: { paras: string[]; material?: string; weightGrams?: number | null }, rewritten: { paras: string[] }): string[] {
  const items: string[] = []
  if (detail.material) items.push(`Material: ${detail.material}`)
  if (detail.weightGrams) items.push(`Weight: ${formatWeight(detail.weightGrams)}`)
  const paras = detail.paras.length > 0 ? detail.paras : rewritten.paras
  for (const para of paras) {
    const s = para.replace(/^[•\-–]\s*/, "").trim()
    if (s.length > 0 && s.length < 120) items.push(s)
    if (items.length >= 5) break
  }
  if (items.length === 0) items.push("Quality-checked before dispatch", "Tracked delivery on every order", "Secure payment via Flutterwave")
  return items.slice(0, 5)
}

function specRows(detail: { material?: string; weightGrams?: number | null }, p: Product): Array<{ k: string; v: string }> {
  const rows: Array<{ k: string; v: string }> = [
    { k: "SKU", v: neutralSku(p.id) },
    { k: "Seller", v: (typeof p.cj_data === "object" && p.cj_data !== null && (p.cj_data as { brand?: string })?.brand) || p.program_key || "TechPivo Market" },
    { k: "Category", v: p.subcategory_slug || p.category_slug || "General" },
  ]
  if (detail.material) rows.push({ k: "Material", v: detail.material })
  if (detail.weightGrams) rows.push({ k: "Weight", v: formatWeight(detail.weightGrams) })
  rows.push({ k: "Condition", v: "New" })
  return rows
}

function boxContent(detail: { paras: string[]; material?: string }): string {
  const hint = detail.material ? `Includes the ${detail.material} unit as described.` : ""
  return hint || "Product unit plus any accessories listed in the description above. Check the product details for the full pack contents."
}

function ShareSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[101] flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />
      <div className="bg-white border-t border-[#E2E8F0] rounded-t-3xl p-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium text-[#0F172A] mb-3">Share {title}</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, icon: <Phone className="h-5 w-5" /> },
            { label: "Messenger", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, icon: <SendIcon className="h-5 w-5" /> },
            { label: "X", url: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, icon: <X className="h-5 w-5" /> },
            { label: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, icon: <FacebookIcon className="h-5 w-5" /> },
            { label: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, icon: <PaperPlaneIcon className="h-5 w-5" /> },
            { label: "Copy link", url: "", icon: <Copy className="h-5 w-5" /> },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => {
                if (s.label === "Copy link") {
                  navigator.clipboard.writeText(url).then(() => onClose())
                } else {
                  window.open(s.url, "_blank", "width=600,height=400")
                  onClose()
                }
              }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs transition-colors hover:bg-white"
            >
              <span className="h-7 w-7 rounded-full flex items-center justify-center text-slate-600">{s.icon}</span>
              <span className="text-[#0F172A] font-medium">{s.label}</span>
            </button>
          ))}
          <button onClick={onClose} className="mt-2 w-full py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-slate-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Phone({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 011.168.954l1.872 4.243a1 1 0 001.168.954h4.243a1 1 0 011 1v3.28a2 2 0 01-2 2h-3.28a1 1 0 00-1.168-.954l-1.872-4.243a1 1 0 01-1.168-.954H5.28a2 2 0 00-2 2H3z" /></svg>
}
function SendIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 13L12 5M6 13l6 7M6 13l-1.5-1.5M18 17l1.5-1.5" /></svg>
}
function FacebookIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
}
function PaperPlaneIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.016 11.296A9.0 9.0 0 015.552 6.545l2.237.559a1 1 0 01.57 1.807l-1.135 4.54a1 1 0 00.102 1.323l2.554 1.277c1.034.517 1.797 1.678 1.797 2.94v1.004c0 .558.452 1.01 1.01 1.01h1.004c1.261 0 2.423-.762 2.94-1.797l4.54-1.135a1 1 0 011.323-.103l.559-2.237a9 9 0 01-4.751-3.547l-1.798-.449a1 1 0 01-.404-1.307L5.552 4.389A1 1 0 017 3.439c.562-.14 1.113.254 1.154.815l.001 12.836c0 .561-.456 1.017-1.017 1.017H4.252c-.562 0-1.017-.456-1.017-1.017V9.296a1 1 0 01.781-1.998z" /></svg>
}

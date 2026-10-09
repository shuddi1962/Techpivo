// TechPivo Market Quick View modal (CLIENT) — opens from any product-card
// hover rail via the tpm:quickview event. Reuses the live product row,
// supplier variants, pricing, and cart store. Full details stay on the
// product page.

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Minus, Plus, ShoppingCart, Star, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { addToCart as addLine } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import { MarketPrice } from "./market-price"
import { ModalShell } from "./modal-shell"
import { TPM_QUICKVIEW, TPM_CHECKOUT, openCheckout, trackMarket } from "@/lib/marketplace-events"

interface QVProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  original_price: number | null
  sale_price: number | null
  stock: number | null
  category_slug: string | null
  subcategory_slug: string | null
}

interface VariantOpt {
  vid: string
  label: string
  price: number | null
  image: string
  stock: number | null
}

function QuickViewBody({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [product, setProduct] = useState<QVProduct | null>(null)
  const [gallery, setGallery] = useState<string[]>([])
  const [activeImg, setActiveImg] = useState("")
  const [variants, setVariants] = useState<VariantOpt[]>([])
  const [pickedVid, setPickedVid] = useState("")
  const [qty, setQty] = useState(1)
  const [rating, setRating] = useState(0)
  const [reviews, setReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    trackMarket("quickview_open", productId)
    let alive = true
    setLoading(true)
    setError("")
    const supabase = createClient()
    Promise.all([
      supabase
        .from("affiliate_products")
        .select("id,product_name,product_description,product_image_url,original_price,sale_price,stock,category_slug,subcategory_slug")
        .eq("id", productId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase.from("marketplace_reviews").select("rating").eq("product_id", productId).limit(500),
      fetch(`/api/marketplace/variants?product_id=${encodeURIComponent(productId)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/marketplace/detail?product_id=${encodeURIComponent(productId)}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([prod, rev, v, detail]) => {
        if (!alive) return
        const row = (prod as { data?: QVProduct | null }).data
        if (!row) {
          setError("This product is no longer available.")
          setLoading(false)
          return
        }
        setProduct(row)
        const revRows = ((rev as { data?: Array<{ rating: number }> }).data || []) as Array<{ rating: number }>
        if (revRows.length > 0) {
          setReviews(revRows.length)
          setRating(revRows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / revRows.length)
        }
        const list = (Array.isArray((v as { variants?: VariantOpt[] } | null)?.variants) ? (v as { variants: VariantOpt[] }).variants : []) as VariantOpt[]
        setVariants(list)
        if (list[0]?.vid) setPickedVid(list[0].vid)
        const imgs = [row.product_image_url || "", ...list.map((x) => x.image).filter(Boolean)]
        const dImgs = Array.isArray((detail as { images?: string[] } | null)?.images)
          ? ((detail as { images: string[] }).images as string[])
          : []
        const all = [...new Set([...imgs, ...dImgs].filter(Boolean))].slice(0, 6)
        setGallery(all)
        setActiveImg(all[0] || "")
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setError("Could not load this product. Try again.")
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [productId])

  const selected = useMemo(
    () => variants.find((x) => x.vid === pickedVid) || null,
    [variants, pickedVid]
  )
  const basePrice = Number(product?.sale_price ?? product?.original_price ?? 0)
  const price = selected?.price ?? basePrice
  const old = product?.original_price ? Number(product.original_price) : NaN
  const discount = Number.isFinite(old) && old > price ? Math.round((1 - price / old) * 100) : 0
  const outOfStock = selected ? (selected.stock ?? 1) <= 0 : (product?.stock ?? 1) <= 0

  const doAdd = () => {
    if (!product || busy || outOfStock) return
    if (selected && (selected.stock ?? 1) < qty) return
    setBusy(true)
    try {
      addLine(product.id, qty, selected ? { vid: selected.vid, label: selected.label } : null)
      trackMarket("quickview_add", product.id)
      setAdded(true)
    } finally {
      setTimeout(() => setBusy(false), 500)
      setTimeout(() => setAdded(false), 1600)
    }
  }

  const buyNow = () => {
    if (!product || busy || outOfStock) return
    addLine(product.id, qty, selected ? { vid: selected.vid, label: selected.label } : null)
    trackMarket("quickview_add", product.id)
    onClose()
    setTimeout(() => {
      window.dispatchEvent(new Event(TPM_CHECKOUT))
      openCheckout()
    }, 30)
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-500">Loading product...</p>
  }
  if (error || !product) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-bold text-[#0F172A]">{error || "Product unavailable."}</p>
        <Link href="/marketplace" onClick={onClose} className="mt-3 inline-block rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F172A]">
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
          {activeImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marketImage(activeImg)} alt={product.product_name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-slate-300">No image</span>
          )}
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-[#0B0F19] px-2.5 py-1 text-[11px] font-bold tracking-tight text-white">−{discount}%</span>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto" role="group" aria-label="Product images">
            {gallery.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setActiveImg(g)}
                aria-label="View product image"
                aria-pressed={activeImg === g}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${activeImg === g ? "border-[#F59E0B]" : "border-[#E2E8F0]"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={marketImage(g)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <h3 className="text-lg font-extrabold leading-snug text-[#0F172A]">{product.product_name}</h3>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Star className={`h-3.5 w-3.5 ${reviews > 0 ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`} />
          {reviews > 0 ? `${rating.toFixed(1)} · ${reviews} review${reviews === 1 ? "" : "s"}` : "No reviews yet"}
        </span>
        <span className="mt-2 flex items-baseline gap-2">
          <MarketPrice usd={price} className="text-[26px] font-extrabold tracking-tight text-[#0B0F19]" />
          {discount > 0 && <MarketPrice usd={old} className="text-sm font-medium text-[#94A3B8] line-through" />}
        </span>
        <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${outOfStock ? "text-[#94A3B8]" : "text-[#0B0F19]"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${outOfStock ? "bg-[#CBD5E1]" : "bg-[#0B0F19]"}`} />
          {outOfStock ? "Out of stock" : product.stock != null && product.stock > 0 && product.stock <= 5 ? `Only ${product.stock} left` : "In stock"}
        </p>
        {product.product_description && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-slate-600">{product.product_description}</p>
        )}

        {variants.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Options</p>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto" role="radiogroup" aria-label="Product options">
              {variants.map((x) => {
                const on = x.vid === pickedVid
                const soldOut = (x.stock ?? 1) <= 0
                return (
                  <button
                    key={x.vid}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={soldOut}
                    onClick={() => {
                      setPickedVid(x.vid)
                      if (x.image) setActiveImg(x.image)
                    }}
                    title={soldOut ? `${x.label} (out of stock)` : x.label}
                    className={`max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      on ? "border-[#0B0F19] bg-[#0B0F19] text-white" : "border-[#E2E6EE] bg-white text-[#475569] hover:border-[#0B0F19] hover:text-[#0B0F19]"
                    }`}
                  >
                    {x.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Qty</span>
          <span className="flex items-center overflow-hidden rounded-lg border border-[#CBD5E1]">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2.5 py-1.5 hover:bg-slate-100" aria-label="Decrease quantity">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-2.5 py-1.5 hover:bg-slate-100" aria-label="Increase quantity">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={doAdd}
            disabled={busy || outOfStock}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0B0F19] py-3 text-sm font-bold text-white transition-all hover:bg-black active:scale-[0.99] disabled:opacity-40"
          >
            {added ? <><Check className="h-4 w-4" strokeWidth={3} /> Added</> : <><ShoppingCart className="h-4 w-4" /> Add to Bag</>}
          </button>
          <button
            type="button"
            onClick={buyNow}
            disabled={busy || outOfStock}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] py-3 text-sm font-bold text-[#0B0F19] transition-colors hover:bg-[#D97706] disabled:opacity-40"
          >
            <Zap className="h-4 w-4" /> Buy Now
          </button>
        </div>
        <Link
          href={`/marketplace/product/${product.id}`}
          onClick={onClose}
          className="mt-2 text-center text-[13px] font-semibold text-[#B45309] hover:underline"
        >
          View full details →
        </Link>
      </div>
    </div>
  )
}

export function QuickViewProvider() {
  const [productId, setProductId] = useState<string | null>(null)
  const close = useCallback(() => setProductId(null), [])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ productId: string }>).detail?.productId
      if (id && /^[0-9a-f-]{36}$/i.test(id)) setProductId(id)
    }
    window.addEventListener(TPM_QUICKVIEW, onOpen)
    return () => window.removeEventListener(TPM_QUICKVIEW, onOpen)
  }, [])

  if (!productId) return null
  return (
    <ModalShell label="Quick view" onClose={close}>
      <QuickViewBody productId={productId} onClose={close} />
    </ModalShell>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Check, Heart, Minus, Plus, RotateCcw, ShieldCheck, ShoppingCart, Star, Truck, Zap } from "lucide-react"
import { addToCart } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import { supplierDisplayName } from "@/lib/marketplace"
import { dualPrice, useUsdNgnRate } from "@/lib/marketplace-pricing"

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
}

const RECENT_KEY = "tp_market_recent_v1"
const WISH_KEY = "tp_market_wish_v1"

function recordRecent(id: string) {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const arr = (raw ? JSON.parse(raw) : []) as string[]
    const next = [id, ...arr.filter((x) => x !== id)].slice(0, 8)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`} />
      ))}
    </span>
  )
}

export function ProductDetail({
  product: p,
  reviews: initialReviews,
  related,
  deptSlug,
}: {
  product: Product
  reviews: Review[]
  related: Related[]
  deptSlug: string | null
}) {
  const router = useRouter()
  const rate = useUsdNgnRate()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wished, setWished] = useState(false)
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [rName, setRName] = useState("")
  const [rRating, setRRating] = useState(5)
  const [rText, setRText] = useState("")
  const [rSending, setRSending] = useState(false)
  const [rNotice, setRNotice] = useState("")

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WISH_KEY)
      const arr = (raw ? JSON.parse(raw) : []) as string[]
      setWished(Array.isArray(arr) && arr.includes(p.id))
    } catch {
      // ignore
    }
    recordRecent(p.id)
    fetch("/api/marketplace/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    }).catch(() => {
      // click tracking is best-effort
    })
  }, [p.id])

  const price = Number(p.sale_price ?? p.original_price ?? 0)
  const oldPrice = p.original_price && p.sale_price ? Number(p.original_price) : null
  const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0
  const avg = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews]
  )

  const doAdd = () => {
    addToCart(p.id, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }
  const buyNow = () => {
    addToCart(p.id, qty)
    router.push("/marketplace/checkout")
  }

  const submitReview = async () => {
    if (!rText.trim() || rSending) return
    setRSending(true)
    setRNotice("")
    try {
      const res = await fetch("/api/marketplace/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: p.id, author_name: rName.trim() || "Verified buyer", rating: rRating, comment: rText.trim() }),
      })
      const data = await res.json()
      if (res.ok && data?.review) {
        setReviews((prev) => [data.review, ...prev])
        setRName("")
        setRText("")
        setRRating(5)
        setRNotice("Thanks — your review is live.")
      } else {
        setRNotice(data?.error || "Could not submit your review.")
      }
    } catch {
      setRNotice("Could not submit your review.")
    } finally {
      setRSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="relative rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] aspect-square">
            {p.product_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={marketImage(p.product_image_url)} alt={p.product_name} loading="eager" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">No image</div>
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 bg-[#EF4444] text-white text-xs font-bold px-2 py-1 rounded-full">-{discount}%</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
            <span>Quality checked by the TechPivo editorial team</span>
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{supplierDisplayName(p.program_key)} · Ships tracked in 7–12 days</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1">{p.product_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Stars value={avg || 4} />
            <span className="text-sm text-slate-500">
              {reviews.length > 0 ? `${avg.toFixed(1)} · ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "Be the first to review"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3 flex-wrap">
            <span className={`text-3xl font-extrabold ${discount > 0 ? "text-[#EF4444]" : "text-[#0F172A]"}`}>{dualPrice(price, rate).split(" · ")[0]}</span>
            {oldPrice && <span className="text-lg text-slate-400 line-through">{dualPrice(oldPrice, rate).split(" · ")[0]}</span>}
          </div>
          <p className="text-sm font-semibold text-slate-600 mt-1">≈ {dualPrice(price, rate).split(" · ")[1] || ""} · pay in naira at checkout</p>
          {p.product_description && <p className="text-sm text-slate-600 mt-3">{p.product_description}</p>}

          <div className="flex items-center gap-3 mt-5">
            <span className="text-sm font-semibold text-slate-700">Qty</span>
            <div className="flex items-center border border-[#CBD5E1] rounded-lg overflow-hidden">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-slate-100" aria-label="Decrease quantity">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-3 py-2 hover:bg-slate-100" aria-label="Increase quantity">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {p.stock != null && <span className="text-xs text-slate-500">{p.stock > 0 ? `${p.stock} in stock` : "Ships on demand"}</span>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={doAdd}
              className={`flex-1 text-sm font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${added ? "bg-[#10B981] text-white" : "bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]"}`}
            >
              {added ? <><Check className="h-4 w-4" /> Added to cart</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
            </button>
            <button onClick={buyNow} className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Zap className="h-4 w-4" /> Buy Now
            </button>
            <button
              onClick={() => {
                setWished((w) => {
                  const next = !w
                  try {
                    const raw = window.localStorage.getItem(WISH_KEY)
                    const arr = (raw ? JSON.parse(raw) : []) as string[]
                    const ids = Array.isArray(arr) ? arr.filter((x) => x !== p.id) : []
                    if (next) ids.push(p.id)
                    window.localStorage.setItem(WISH_KEY, JSON.stringify(ids))
                  } catch {
                    // ignore
                  }
                  return next
                })
              }}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              className={`px-4 rounded-lg border flex items-center justify-center transition-colors ${wished ? "border-[#EF4444] text-[#EF4444]" : "border-[#E2E8F0] text-slate-500 hover:text-[#EF4444]"}`}
            >
              <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5 text-xs">
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2.5">
              <Truck className="h-4 w-4 text-[#10B981] shrink-0" />
              <span className="text-slate-600">Express 7–12 days, tracked worldwide</span>
            </div>
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2.5">
              <RotateCcw className="h-4 w-4 text-[#F59E0B] shrink-0" />
              <span className="text-slate-600">30-day easy returns</span>
            </div>
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-[#0F172A] shrink-0" />
              <span className="text-slate-600">Secure Paystack checkout</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[#0F172A]">Customer reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No reviews yet — share the first one below.</p>
        ) : (
          <div className="grid gap-3 mt-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-[#E2E8F0] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#0F172A]">{r.author_name}</span>
                  <Stars value={r.rating} size="h-3.5 w-3.5" />
                </div>
                {r.title && <p className="text-sm font-semibold text-slate-700 mt-1">{r.title}</p>}
                {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                <p className="text-[11px] text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 border-t border-[#E2E8F0] pt-4 space-y-2">
          <h3 className="text-sm font-bold text-[#0F172A]">Write a review</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Your name (optional)" className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[#F59E0B]" maxLength={60} />
            <div className="flex items-center gap-1 border rounded-lg px-3 py-2" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`} aria-pressed={rRating === n}>
                  <Star className={`h-5 w-5 ${n <= rRating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea value={rText} onChange={(e) => setRText(e.target.value)} placeholder="What did you like about this product?" rows={3} maxLength={1000} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]" />
          {rNotice && <p className="text-xs text-slate-600">{rNotice}</p>}
          <button onClick={submitReview} disabled={rSending || !rText.trim()} className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-50">
            {rSending ? "Posting..." : "Post review"}
          </button>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">Similar products</h2>
            {deptSlug && (
              <Link href={`/marketplace/category/${deptSlug}`} className="text-sm text-[#B45309] hover:text-[#D97706] font-semibold">
                Shop all →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {related.map((r) => (
              <Link key={r.id} href={`/marketplace/product/${r.id}`} className="group bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 hover:bg-slate-100 transition-colors">
                <div className="aspect-square bg-white rounded-lg overflow-hidden mb-2">
                  {r.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={marketImage(r.product_image_url)} alt={r.product_name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{supplierDisplayName(r.program_key)}</p>
                <h3 className="text-sm font-semibold text-[#0F172A] line-clamp-1">{r.product_name}</h3>
                <p className="text-base font-bold text-[#0F172A] mt-1">${Number(r.sale_price ?? r.original_price ?? 0).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

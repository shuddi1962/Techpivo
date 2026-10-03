"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Check, Heart, Minus, Play, Plus, RotateCcw, ShieldCheck, ShoppingCart, Star, Truck, Zap } from "lucide-react"
import { addToCart } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import {
  readShipSelection, saveShipSelection, SHIP_COUNTRIES, DEFAULT_SHIP_COUNTRY, FREE_SHIP_THRESHOLD_USD, type ShipOption, type ShipSelection,
} from "@/lib/marketplace-shipping"
import { getGeoOnce } from "@/lib/tools-geo"
import { DeliveryPicker } from "./delivery-picker"
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

const SWATCH_HEX: Record<string, string> = {
  black: "#1F2937", white: "#FFFFFF", red: "#DC2626", blue: "#2563EB",
  green: "#16A34A", yellow: "#EAB308", pink: "#EC4899", purple: "#9333EA",
  orange: "#F97316", gray: "#9CA3AF", grey: "#9CA3AF", silver: "#C0C0C0",
  gold: "#C9A227", brown: "#92400E", beige: "#E7D8C3", navy: "#1E3A8A",
}

function swatchFor(value: string): string | null {
  const v = value.toLowerCase()
  for (const [k, hex] of Object.entries(SWATCH_HEX)) {
    if (v.includes(k)) return hex
  }
  return null
}

interface VariantOpt {
  vid: string
  label: string
  price: number | null
  image: string
  stock: number | null
  weightGrams: number | null
}

export function formatWeight(g: number | null | undefined): string {
  const n = Number(g)
  if (!Number.isFinite(n) || n <= 0) return ""
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)}kg`
  return `${Math.round(n)}g`
}

export function neutralSku(id: string): string {
  return `TPM-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
}

const splitParts = (s: string): string[] =>
  s.split(/[/;|]+/).map((x) => x.trim()).filter(Boolean)

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

export interface ProductDetailData {
  short: string
  paras: string[]
  images: string[]
  video?: string
  material?: string
  weightGrams?: number | null
}

function ProductDetailsTabs({
  description,
  paras,
  specs,
}: {
  description: string | null
  paras: string[]
  specs: Array<{ k: string; v: string }>
}) {
  const [tab, setTab] = useState<"desc" | "ship">("desc")
  const long = paras.length > 0 ? paras : description ? [description] : []
  return (
    <section className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-0" role="tablist" aria-label="Product information">
        {([
          { id: "desc", label: "Description" },
          { id: "ship", label: "Shipping & Returns" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-bold transition-colors ${tab === t.id ? "border-b-2 border-[#DC2626] text-[#0F172A]" : "text-slate-500 hover:text-[#0F172A]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "desc" ? (
        <div className="space-y-3 pt-4">
          {long.length > 0 ? (
            long.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-600">{para}</p>
            ))
          ) : (
            <p className="pt-4 text-sm text-slate-500">Full details for this product are on the way — check back soon.</p>
          )}
          <ul className="grid grid-cols-1 gap-1.5 pt-1 sm:grid-cols-2">
            {["Quality-checked before dispatch", "Secure payment on TechPivo Market", "Tracked delivery on every order", "30-day easy returns"].map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-4 w-4 shrink-0 text-[#10B981]" /> {h}
              </li>
            ))}
          </ul>
          {specs.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-sm">
                <caption className="bg-[#F8FAFC] px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Specifications
                </caption>
                <tbody>
                  {specs.map((s) => (
                    <tr key={s.k} className="border-t border-[#E2E8F0]">
                      <th className="w-32 bg-[#F8FAFC] px-3 py-2 text-left font-semibold text-slate-600">{s.k}</th>
                      <td className="px-3 py-2 text-slate-800">{s.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-4 text-sm text-slate-600">
          <p><strong className="text-[#0F172A]">Standard (7–12 days):</strong> tracked delivery — $5, free on orders over $35.</p>
          <p><strong className="text-[#0F172A]">Express (3–7 days):</strong> priority tracked delivery — $19 flat.</p>
          <p><strong className="text-[#0F172A]">Courier options:</strong> live courier rates with tracking are shown above when available for your country.</p>
          <p><strong className="text-[#0F172A]">Returns:</strong> 30-day easy returns on every order. Need help? <Link href="/contact" className="font-semibold text-[#B45309] hover:underline">Contact us</Link>.</p>
        </div>
      )}
    </section>
  )
}

export function ProductDetail({
  product: p,
  reviews: initialReviews,
  related,
  deptSlug,
  detail,
  sold,
  hasSupplier,
}: {
  product: Product
  reviews: Review[]
  related: Related[]
  deptSlug: string | null
  detail: ProductDetailData
  sold: number
  hasSupplier: boolean
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
  const [variants, setVariants] = useState<VariantOpt[]>([])
  const [attrs, setAttrs] = useState<Array<{ name: string; values: string[] }>>([])
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [liveDetail, setLiveDetail] = useState<ProductDetailData | null>(null)

  // Default ship-to follows the shopper's real location (worldwide store).
  useEffect(() => {
    getGeoOnce()
      .then((g) => {
        const code = g?.countryCode?.toUpperCase()
        if (code && SHIP_COUNTRIES.some((c) => c.code === code)) setShipCountry(code)
      })
      .catch(() => {
        // keep default
      })
  }, [])
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
      .catch(() => {
        // base content stands
      })
  }, [p.id])
  const detailEff = liveDetail ?? detail
  const [shipOptions, setShipOptions] = useState<ShipOption[]>([])
  const [shipPick, setShipPick] = useState<ShipSelection | null>(null)
  const [shipCountry, setShipCountry] = useState(DEFAULT_SHIP_COUNTRY)

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
    // Live supplier options (colors, sizes, types) for this product.
    fetch(`/api/marketplace/variants?product_id=${encodeURIComponent(p.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.variants) && d.variants.length > 0) {
          setVariants(d.variants as VariantOpt[])
          const at = (Array.isArray(d?.attributes) ? d.attributes : []) as Array<{ name: string; values: string[] }>
          setAttrs(at)
          const init: Record<string, string> = {}
          at.forEach((a) => {
            if (a.values[0]) init[a.name] = a.values[0]
          })
          setPicked(init)
        }
      })
      .catch(() => {
        // options unavailable — base product still sells
      })
  }, [p.id])

  const selected: VariantOpt | null =
    variants.length > 0
      ? variants.find((v) => {
          const parts = splitParts(v.label)
          return attrs.every((a, i) => !picked[a.name] || parts[i] === picked[a.name])
        }) || null
      : null
  const activeWeight = selected?.weightGrams ?? detailEff.weightGrams ?? null

  useEffect(() => {
    setShipPick(readShipSelection())
    // Delivery options: live supplier courier rates (with markup) plus
    // store Standard / Express. The pick is honored at checkout.
    fetch(
      `/api/marketplace/shipping?product_id=${encodeURIComponent(p.id)}&variant_vid=${encodeURIComponent(selected?.vid || "")}&qty=${qty}&country=${encodeURIComponent(shipCountry)}&subtotal=${(price * qty).toFixed(2)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.options) && d.options.length > 0) {
          setShipOptions(d.options as ShipOption[])
        }
      })
      .catch(() => {
        // options unavailable — store fallbacks still render below
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id, selected?.vid, qty, shipCountry])

  interface GalleryItem {
    type: "image" | "video"
    src: string
  }

  const gallery: GalleryItem[] = (() => {
    const items: GalleryItem[] = []
    if (detailEff.video) items.push({ type: "video", src: detailEff.video })
    const imgs = [p.product_image_url || "", ...(variants.map((v) => v.image).filter(Boolean) as string[]), ...detailEff.images]
    for (const src of [...new Set(imgs.filter(Boolean))]) items.push({ type: "image", src })
    return items.slice(0, 10)
  })()

  const [activeMedia, setActiveMedia] = useState<GalleryItem>({ type: "image", src: p.product_image_url || "" })

  useEffect(() => {
    if (selected?.image) setActiveMedia({ type: "image", src: selected.image })
  }, [selected?.image])

  useEffect(() => {
    setActiveMedia((cur) => {
      if (cur.src) return cur
      const first = gallery[0]
      return first || cur
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.length])

  const basePrice = Number(p.sale_price ?? p.original_price ?? 0)
  const price = selected?.price ?? basePrice
  const oldPrice = p.original_price && p.sale_price ? Number(p.original_price) : null
  const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0
  const avg = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews]
  )

  const doAdd = () => {
    addToCart(p.id, qty, selected ? { vid: selected.vid, label: selected.label } : null)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }
  const buyNow = () => {
    addToCart(p.id, qty, selected ? { vid: selected.vid, label: selected.label } : null)
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
            {activeMedia.type === "video" ? (
              <video src={activeMedia.src} controls playsInline preload="metadata" className="w-full h-full object-cover" />
            ) : activeMedia.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeMedia.src} alt={p.product_name} loading="eager" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">No image</div>
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 bg-[#EF4444] text-white text-xs font-bold px-2 py-1 rounded-full">-{discount}%</span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2" role="list" aria-label="Product gallery">
              {gallery.slice(0, 10).map((g) => (
                <button
                  key={`${g.type}:${g.src}`}
                  type="button"
                  role="listitem"
                  onClick={() => setActiveMedia(g)}
                  aria-label={g.type === "video" ? "Play product video" : "View product image"}
                  aria-pressed={activeMedia.src === g.src && activeMedia.type === g.type}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-[#F8FAFC] transition-all ${activeMedia.src === g.src && activeMedia.type === g.type ? "border-[#F59E0B]" : "border-[#E2E8F0] hover:border-slate-400"}`}
                >
                  {g.type === "video" ? (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#0F172A]">
                      <Play className="h-6 w-6 fill-white text-white" />
                      <span className="text-[9px] font-bold uppercase text-white/80">Video</span>
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
            <span>Quality checked by the TechPivo editorial team</span>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>SKU: <strong className="text-[#0F172A]">{neutralSku(p.id)}</strong></span>
            {sold > 0 && <span><strong className="text-[#0F172A]">{sold}</strong> sold</span>}
            {hasSupplier && <span>Ships from: <strong className="text-[#0F172A]">China</strong></span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1">{p.product_name}</h1>
          {detailEff.short && (
            <p className="mt-2 rounded-lg border-l-4 border-[#F59E0B] bg-[#FFFBEB] px-3 py-2 text-sm text-slate-700">
              {detailEff.short}
            </p>
          )}
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

          {/* supplier options — colors, sizes, types */}
          {attrs.length > 0 && (
            <div className="mt-5 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              {attrs.map((a) => {
                const isColor = a.name.toLowerCase() === "color"
                return (
                  <div key={a.name}>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      {a.name}: <span className="text-[#0F172A] normal-case">{picked[a.name]}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.values.map((v) => {
                        const on = picked[a.name] === v
                        if (isColor) {
                          // Prefer the option's own photo (AliExpress-style
                          // image swatch), fall back to a color dot.
                          const opt = variants.find((vv) => splitParts(vv.label)[attrs.indexOf(a)] === v)
                          const hex = swatchFor(v)
                          if (opt?.image) {
                            return (
                              <button
                                key={v}
                                type="button"
                                title={v}
                                aria-label={`Select color ${v}`}
                                aria-pressed={on}
                                onClick={() => setPicked((m) => ({ ...m, [a.name]: v }))}
                                className={`relative h-12 w-12 overflow-hidden rounded-lg border-2 transition-all ${on ? "scale-105 border-[#DC2626]" : "border-[#E2E8F0] hover:border-slate-400"}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={opt.image} alt={v} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                {on && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Check className="h-4 w-4 text-white" />
                                  </span>
                                )}
                              </button>
                            )
                          }
                          return (
                            <button
                              key={v}
                              type="button"
                              title={v}
                              aria-label={`Select color ${v}`}
                              aria-pressed={on}
                              onClick={() => setPicked((m) => ({ ...m, [a.name]: v }))}
                              className={`flex h-9 items-center gap-1.5 rounded-full border-2 py-1 pl-1.5 pr-3 transition-all ${on ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#E2E8F0] hover:border-slate-400"}`}
                            >
                              <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: hex || "#F1F5F9" }} />
                              <span className="text-xs font-semibold text-[#0F172A]">{v}</span>
                            </button>
                          )
                        }
                        return (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setPicked((m) => ({ ...m, [a.name]: v }))}
                            className={`min-w-10 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${on ? "border-[#DC2626] bg-[#DC2626] text-white" : "border-[#CBD5E1] bg-white text-slate-600 hover:border-[#DC2626]"}`}
                          >
                            {v}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {selected?.stock != null && (
                <p className="text-[11px] text-slate-500">
                  {selected.stock > 0 ? `${selected.stock} available in this option` : "Made to order in this option"}
                </p>
              )}
            </div>
          )}

          {/* delivery — ship-to country + method, CJ style */}
          <div className="mt-5">
            <DeliveryPicker
              country={shipCountry}
              onCountry={setShipCountry}
              options={shipOptions}
              fallbackOptions={[
                { id: "standard", name: "Standard", eta: "7–12 days", feeUsd: price * qty >= FREE_SHIP_THRESHOLD_USD ? 0 : 5, source: "store" },
                { id: "express", name: "Express", eta: "3–7 days", feeUsd: 19, source: "store" },
              ]}
              value={shipPick}
              hideFees
              onChange={(sel) => {
                setShipPick(sel)
                saveShipSelection(sel)
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Qty</span>
              <span className="flex items-center border border-[#CBD5E1] rounded-lg overflow-hidden">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-slate-100" aria-label="Decrease quantity">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-3 py-2 hover:bg-slate-100" aria-label="Increase quantity">
                  <Plus className="h-4 w-4" />
                </button>
              </span>
            </span>
            {activeWeight ? (
              <span className="text-xs text-slate-500">{formatWeight(activeWeight)} · {selected?.stock != null && selected.stock > 0 ? `${selected.stock} available` : p.stock != null && p.stock > 0 ? `${p.stock} in stock` : "In stock"} · ships in 1–3 days</span>
            ) : p.stock != null ? (
              <span className="text-xs text-slate-500">{p.stock > 0 ? `${p.stock} in stock` : "Ships on demand"} · ships in 1–3 days</span>
            ) : (
              <span className="text-xs text-slate-500">In stock · ships in 1–3 days</span>
            )}
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

      <ProductDetailsTabs
        description={p.product_description}
        paras={detailEff.paras}
        specs={[
          { k: "SKU", v: neutralSku(p.id) },
          ...(detailEff.material ? [{ k: "Material", v: detailEff.material }] : []),
          ...(activeWeight ? [{ k: "Weight", v: formatWeight(activeWeight) }] : []),
        ]}
      />

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

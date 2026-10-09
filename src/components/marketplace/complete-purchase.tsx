// TechPivo Market "Complete Your Purchase" (CLIENT) — complementary-product
// upsell directly below Add to Cart / Buy Now on the single-product page.
// Picks come from /api/marketplace/recommendations (admin overrides ->
// co-purchase history -> category compatibility). Nothing is pre-selected:
// the customer explicitly opts into every add-on.

import { useEffect, useMemo, useState } from "react"
import { Check, ShoppingCart, Zap } from "lucide-react"
import { getCart, addToCart as addLine } from "@/lib/marketplace-cart"
import type { CartVariant } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import { MarketPrice } from "./market-price"
import { TPM_CHECKOUT, openCartPopup, openCheckout, trackMarket } from "@/lib/marketplace-events"

interface UpsellItem {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
  stock: number | null
  recommend_reason?: string
  bought_together?: number
}

export function CompletePurchase({
  productId,
  mainName,
  mainPrice,
  mainVariant,
  mainQty,
}: {
  productId: string
  mainName: string
  mainPrice: number
  mainVariant: CartVariant | null
  mainQty: number
}) {
  const [items, setItems] = useState<UpsellItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let alive = true
    fetch(`/api/marketplace/recommendations?product_id=${encodeURIComponent(productId)}&limit=4`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        const list = (Array.isArray(d?.items) ? d.items : []) as UpsellItem[]
        setItems(list.filter((x) => x.id !== productId).slice(0, 4))
        setLoaded(true)
        if (list.length > 0) trackMarket("recommend_impression", productId)
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [productId])

  const picked = useMemo(() => items.filter((x) => selected[x.id]), [items, selected])
  const pickedTotal = picked.reduce((s, x) => s + Number(x.sale_price ?? x.original_price ?? 0), 0)
  const grandTotal = mainPrice * mainQty + pickedTotal

  const toggle = (x: UpsellItem) => {
    setSelected((m) => {
      const next = { ...m }
      if (next[x.id]) delete next[x.id]
      else {
        next[x.id] = true
        trackMarket("recommend_select", x.id)
      }
      return next
    })
  }

  // Main is only added when it isn't already in the cart with the same
  // option — never duplicated by the upsell action.
  const ensureMain = () => {
    const lines = getCart()
    const vid = mainVariant?.vid || ""
    const already = lines.some((l) => l.id === productId && (l.variant?.vid || "") === vid)
    if (!already) addLine(productId, mainQty, mainVariant)
    return !already
  }

  const addSelected = () => {
    if (busy) return
    setBusy(true)
    setNotice("")
    try {
      const mainAdded = ensureMain()
      for (const x of picked) {
        addLine(x.id, 1)
        trackMarket("recommend_add", x.id)
      }
      if (picked.length > 0) trackMarket("bundle_add", productId)
      setNotice(
        picked.length === 0
          ? mainAdded
            ? `${mainName} added to your cart.`
            : "That item is already in your cart."
          : `${mainAdded ? "Main item + " : ""}${picked.length} add-on${picked.length === 1 ? "" : "s"} added to your cart.`
      )
      openCartPopup(productId)
    } finally {
      setTimeout(() => setBusy(false), 600)
    }
  }

  const buy = (withAddons: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      ensureMain()
      if (withAddons) {
        for (const x of picked) {
          addLine(x.id, 1)
          trackMarket("recommend_add", x.id)
        }
        if (picked.length > 0) trackMarket("bundle_add", productId)
      }
      window.dispatchEvent(new Event(TPM_CHECKOUT))
      openCheckout()
    } finally {
      setTimeout(() => setBusy(false), 600)
    }
  }

  if (!loaded || items.length === 0) return null

  return (
    <section aria-label="Complete your purchase" className="rounded-2xl border border-[#FED7AA] bg-gradient-to-b from-[#FFFBEB] to-white p-4 sm:p-5">
      <h2 className="text-base font-extrabold text-[#0F172A] sm:text-lg">Complete Your Purchase</h2>
      <p className="mt-0.5 text-[13px] text-slate-500">Get everything you need to make the most of your purchase.</p>

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((x) => {
          const on = !!selected[x.id]
          const unit = Number(x.sale_price ?? x.original_price ?? 0)
          const old = x.original_price ? Number(x.original_price) : NaN
          const pct = x.sale_price && Number.isFinite(old) && old > unit ? Math.round((1 - unit / old) * 100) : 0
          const lowStock = x.stock != null && x.stock > 0 && x.stock <= 5
          return (
            <li key={x.id}>
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border-2 bg-white p-2.5 transition-colors ${
                  on ? "border-[#F59E0B] shadow-sm" : "border-[#E2E8F0] hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(x)}
                  aria-label={`Add ${x.product_name} to your order`}
                  className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#F59E0B]"
                />
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  {x.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={marketImage(x.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#0F172A]">{x.product_name}</span>
                  {x.recommend_reason && (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-[#B45309]">{x.recommend_reason}</span>
                  )}
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <MarketPrice usd={unit} className="text-sm font-extrabold text-[#0F172A]" />
                    {pct > 0 && <span className="text-[11px] text-slate-400 line-through"><MarketPrice usd={old} /></span>}
                    {pct > 0 && <span className="rounded-full bg-[#FEF2F2] px-1.5 text-[10px] font-bold text-[#DC2626]">-{pct}%</span>}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {x.stock != null && x.stock <= 0 ? "Made to order" : lowStock ? `Only ${x.stock} left` : "In stock"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-[#F59E0B] bg-[#F59E0B] text-[#0F172A]" : "border-slate-300 text-transparent"}`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 text-[13px] text-slate-600">
        <span>Main product: <MarketPrice usd={mainPrice * mainQty} className="font-bold text-[#0F172A]" /></span>
        <span className="mx-2 text-slate-300">·</span>
        <span>Selected add-ons ({picked.length}): <MarketPrice usd={pickedTotal} className="font-bold text-[#0F172A]" /></span>
        <span className="mx-2 text-slate-300">·</span>
        <span>Total: <MarketPrice usd={grandTotal} className="font-extrabold text-[#0F172A]" /></span>
      </div>

      {notice && <p role="status" className="mt-2 text-[13px] font-semibold text-[#047857]">{notice}</p>}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={addSelected}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-60 sm:col-span-1"
        >
          <ShoppingCart className="h-4 w-4" /> Add selected to cart
        </button>
        <button
          type="button"
          onClick={() => buy(false)}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-slate-50 disabled:opacity-60"
        >
          <Zap className="h-4 w-4" /> Buy main only
        </button>
        <button
          type="button"
          onClick={() => buy(true)}
          disabled={busy || picked.length === 0}
          title={picked.length === 0 ? "Select at least one add-on first" : `Buy main + ${picked.length} add-on${picked.length === 1 ? "" : "s"}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
        >
          <Zap className="h-4 w-4" /> Buy with selected ({picked.length})
        </button>
      </div>
    </section>
  )
}

// TechPivo Market "Complete Your Purchase" (CLIENT) — complementary-product
// upsell directly below Add to Cart / Buy Now on the single-product page.
// Picks come from /api/marketplace/recommendations (admin overrides ->
// co-purchase history -> category compatibility). Nothing is pre-selected:
// the customer explicitly opts into every add-on.

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check } from "lucide-react"
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
            ? `${mainName} added to your bag.`
            : "That item is already in your bag."
          : `${mainAdded ? "Main item + " : ""}${picked.length} add-on${picked.length === 1 ? "" : "s"} added to your bag.`
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
    <section
      aria-label="Complete your purchase"
      className="rounded-3xl border border-[#E9EBF1] bg-white p-5 shadow-[0_12px_40px_rgba(11,15,25,0.07)] sm:p-6"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309]">
        Pairs well with your pick
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-[#0B0F19]">
          Complete your purchase
        </h2>
        <span className="hidden shrink-0 rounded-full bg-[#F6F7F9] px-2.5 py-1 text-[11px] font-bold text-[#64748B] sm:inline">
          {picked.length} of {items.length} selected
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
        Everything you need to make the most of it — tick what you want, pay for nothing you don&apos;t.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {items.map((x) => {
          const on = !!selected[x.id]
          const unit = Number(x.sale_price ?? x.original_price ?? 0)
          const old = x.original_price ? Number(x.original_price) : NaN
          const pct = x.sale_price && Number.isFinite(old) && old > unit ? Math.round((1 - unit / old) * 100) : 0
          const out = x.stock != null && x.stock <= 0
          const low = !out && x.stock != null && x.stock <= 5
          return (
            <li key={x.id}>
              <label
                className={`group flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 transition-all duration-200 ${
                  on
                    ? "border-[#0B0F19] shadow-[0_8px_24px_rgba(11,15,25,0.12)]"
                    : "border-[#E9EBF1] hover:border-[#C3C9D5] hover:shadow-[0_6px_18px_rgba(11,15,25,0.08)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(x)}
                  aria-label={`Add ${x.product_name} to your order`}
                  className="sr-only"
                />
                <span className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-[#EDEFF3] bg-[#F6F7F9]">
                  {x.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={marketImage(x.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  {x.recommend_reason && (
                    <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#B45309]">
                      {x.recommend_reason}
                    </span>
                  )}
                  <span className="mt-0.5 line-clamp-2 block text-[13px] font-semibold leading-snug text-[#0B0F19]">
                    {x.product_name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <MarketPrice usd={unit} className="text-[15px] font-extrabold tracking-tight text-[#0B0F19]" />
                    {pct > 0 && <span className="text-[11px] font-medium text-[#94A3B8] line-through"><MarketPrice usd={old} /></span>}
                    {pct > 0 && <span className="rounded-full bg-[#0B0F19] px-1.5 py-px text-[10px] font-bold text-white">−{pct}%</span>}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
                    <span className={`h-1.5 w-1.5 rounded-full ${out ? "bg-[#CBD5E1]" : low ? "bg-[#F59E0B]" : "bg-[#0B0F19]"}`} />
                    {out ? "Made to order" : low ? `Only ${x.stock} left` : "In stock"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-200 ${
                    on ? "border-[#0B0F19] bg-[#0B0F19] text-white" : "border-[#D4D9E2] text-transparent group-hover:border-[#0B0F19]"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 rounded-2xl bg-[#0B0F19] px-4 py-3.5 text-white">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-white/60">Main item</span>
          <MarketPrice usd={mainPrice * mainQty} className="font-bold tabular-nums" />
        </div>
        <div className="mt-1 flex items-center justify-between text-[13px]">
          <span className="text-white/60">Selected add-ons ({picked.length})</span>
          <MarketPrice usd={pickedTotal} className="font-bold tabular-nums" />
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2.5">
          <span className="text-sm font-bold">Total</span>
          <MarketPrice usd={grandTotal} className="text-xl font-extrabold tracking-tight tabular-nums text-[#FBBF24]" />
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-[#F6F7F9] px-3 py-2 text-[13px] font-semibold text-[#0B0F19]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B0F19] text-white">
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
          {notice}
        </p>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={addSelected}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B0F19] px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-black active:scale-[0.99] disabled:opacity-60"
        >
          Add {picked.length > 0 ? `${picked.length} selected` : "main item"} to bag
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => buy(false)}
            disabled={busy}
            className="rounded-xl border border-[#E2E6EE] px-4 py-2.5 text-[13px] font-bold text-[#0B0F19] transition-colors hover:border-[#0B0F19] disabled:opacity-60"
          >
            Buy main only
          </button>
          <button
            type="button"
            onClick={() => buy(true)}
            disabled={busy || picked.length === 0}
            title={picked.length === 0 ? "Select at least one add-on first" : `Buy main + ${picked.length} add-on${picked.length === 1 ? "" : "s"}`}
            className="rounded-xl bg-[#F59E0B] px-4 py-2.5 text-[13px] font-bold text-[#0B0F19] transition-colors hover:bg-[#D97706] disabled:opacity-40"
          >
            Buy with selected ({picked.length})
          </button>
        </div>
      </div>
    </section>
  )
}

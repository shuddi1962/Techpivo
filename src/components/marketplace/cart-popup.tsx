// TechPivo Market instant cart popup (CLIENT) — opens after every successful
// add-to-cart via the tpm:cart-open event. Reads the SAME cart store
// (tp_market_cart_v1) as the cart page, so it can never disagree with it.

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  getCart, removeFromCart, setQty, addToCart as addLine, useMarketCart,
} from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import { FREE_SHIP_THRESHOLD_USD } from "@/lib/marketplace-shipping"
import { MarketPrice } from "./market-price"
import { ModalShell } from "./modal-shell"
import { TPM_CART_OPEN, TPM_CHECKOUT, openCheckout, trackMarket } from "@/lib/marketplace-events"

interface Row {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
  category_slug: string | null
  subcategory_slug: string | null
}

interface MiniAddon {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
  recommend_reason?: string
}

function CartPopupBody({ highlightId, onClose }: { highlightId?: string; onClose: () => void }) {
  const cart = useMarketCart()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [addons, setAddons] = useState<MiniAddon[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    trackMarket("cart_open", highlightId)
  }, [highlightId])

  useEffect(() => {
    const ids = getCart().map((l) => l.id)
    if (ids.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    ;(async () => {
      try {
        const { data } = await supabase
          .from("affiliate_products")
          .select("id,product_name,product_image_url,sale_price,original_price,category_slug,subcategory_slug")
          .in("id", ids)
          .eq("is_active", true)
        setRows((data || []) as Row[])
      } catch {
        // keep previous rows
      } finally {
        setLoading(false)
      }
    })()
  }, [cart.length])

  const lines = useMemo(
    () => cart.map((l) => ({ ...l, product: rows.find((r) => r.id === l.id) })).filter((l) => l.product),
    [cart, rows]
  )
  const subtotal = lines.reduce((s, l) => s + Number(l.product!.sale_price ?? l.product!.original_price ?? 0) * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const highlight = lines.find((l) => l.id === highlightId) || lines[lines.length - 1]
  const shipPct = Math.max(0, Math.min(100, (subtotal / FREE_SHIP_THRESHOLD_USD) * 100))
  const shipLeft = FREE_SHIP_THRESHOLD_USD - subtotal

  // One or two compact add-ons tied to the just-added product (never filler).
  useEffect(() => {
    const anchor = highlight?.product ? highlight.id : lines[0]?.id
    if (!anchor) {
      setAddons([])
      return
    }
    fetch(`/api/marketplace/recommendations?product_id=${encodeURIComponent(anchor)}&limit=2`)
      .then((r) => r.json())
      .then((d) => {
        const items = (Array.isArray(d?.items) ? d.items : []) as MiniAddon[]
        setAddons(items.filter((a) => !lines.some((l) => l.id === a.id)).slice(0, 2))
      })
      .catch(() => setAddons([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight?.id, lines.length])

  const addAddon = (a: MiniAddon) => {
    if (addingId) return
    setAddingId(a.id)
    try {
      addLine(a.id, 1)
      trackMarket("recommend_add", a.id)
    } finally {
      setTimeout(() => setAddingId(null), 600)
    }
  }

  const goCheckout = () => {
    onClose()
    // Let the popup unmount before the checkout modal mounts.
    setTimeout(() => {
      window.dispatchEvent(new Event(TPM_CHECKOUT))
      openCheckout()
    }, 30)
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {highlight?.product && (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B0F19] text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-[#0B0F19]">Added to your bag</p>
            <p className="truncate text-xs text-[#64748B]">
              {count} item{count === 1 ? "" : "s"} · <MarketPrice usd={subtotal} className="font-bold text-[#0B0F19]" />
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5 py-2" aria-label="Loading your bag">
          {[0, 1].map((i) => (
            <div key={i} className="flex animate-pulse gap-3">
              <div className="h-[60px] w-[60px] shrink-0 rounded-xl bg-[#EDEFF3]" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-3/4 rounded bg-[#EDEFF3]" />
                <div className="h-3 w-1/3 rounded bg-[#EDEFF3]" />
              </div>
            </div>
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="py-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F6F7F9]">
            <ShoppingCart className="h-6 w-6 text-[#94A3B8]" />
          </span>
          <p className="mt-3 text-sm font-extrabold tracking-tight text-[#0B0F19]">Your bag is empty</p>
          <p className="mt-0.5 text-xs text-[#64748B]">Beautiful things await in the store.</p>
        </div>
      ) : (
        <>
          <ul className="max-h-64 divide-y divide-[#EFF1F5] overflow-y-auto">
            {lines.map((l) => {
              const unit = Number(l.product!.sale_price ?? l.product!.original_price ?? 0)
              const key = `${l.id}::${l.variant?.vid || ""}`
              const isNew = highlightId ? l.id === highlightId : false
              return (
                <li key={key} className={`flex gap-3 py-3 ${isNew ? "rounded-2xl bg-[#F6F7F9] px-2.5" : ""}`}>
                  <span className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-xl border border-[#EDEFF3] bg-[#F6F7F9]">
                    {l.product!.product_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={marketImage(l.product!.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[13px] font-semibold leading-snug text-[#0B0F19]">{l.product!.product_name}</span>
                    {l.variant?.label && <span className="mt-0.5 block truncate text-[11px] font-medium text-[#94A3B8]">{l.variant.label}</span>}
                    <span className="mt-1.5 flex items-center gap-2.5">
                      <span className="flex items-center rounded-full border border-[#E2E6EE]">
                        <button type="button" onClick={() => { setQty(l.id, l.qty - 1, l.variant); trackMarket("cart_qty", l.id) }} className="px-2 py-1.5 text-[#0B0F19] transition-colors hover:text-black" aria-label="Decrease quantity">
                          <Minus className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold tabular-nums text-[#0B0F19]">{l.qty}</span>
                        <button type="button" onClick={() => { setQty(l.id, l.qty + 1, l.variant); trackMarket("cart_qty", l.id) }} className="px-2 py-1.5 text-[#0B0F19] transition-colors hover:text-black" aria-label="Increase quantity">
                          <Plus className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      </span>
                      <button type="button" onClick={() => { removeFromCart(l.id, l.variant); trackMarket("cart_remove", l.id) }} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#94A3B8] transition-colors hover:text-[#0B0F19]" aria-label={`Remove ${l.product!.product_name}`}>
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-extrabold tabular-nums text-[#0B0F19]">
                    <MarketPrice usd={unit * l.qty} />
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="rounded-2xl bg-[#F6F7F9] px-3.5 py-3">
            {shipLeft > 0 ? (
              <>
                <p className="text-xs text-[#475569]">
                  <MarketPrice usd={shipLeft} className="font-extrabold text-[#0B0F19]" /> away from{" "}
                  <strong className="font-extrabold text-[#0B0F19]">FREE Standard delivery</strong>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E6EE]" role="progressbar" aria-valuenow={Math.round(shipPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
                  <div className="h-full rounded-full bg-[#0B0F19] transition-all duration-500" style={{ width: `${shipPct}%` }} />
                </div>
              </>
            ) : (
              <p className="flex items-center gap-2 text-xs font-bold text-[#0B0F19]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B0F19] text-white">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                You&apos;ve unlocked FREE Standard delivery
              </p>
            )}
          </div>

          {addons.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B45309]">
                Complete your setup
              </p>
              <ul className="mt-2 space-y-2">
                {addons.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-[#E9EBF1] p-2.5 transition-colors hover:border-[#C3C9D5]">
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#EDEFF3] bg-[#F6F7F9]">
                      {a.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={marketImage(a.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/marketplace/product/${a.id}`} onClick={onClose} className="line-clamp-1 block text-[13px] font-semibold text-[#0B0F19] hover:underline">
                        {a.product_name}
                      </Link>
                      <span className="text-[13px] font-extrabold tabular-nums text-[#0B0F19]">
                        <MarketPrice usd={Number(a.sale_price ?? a.original_price ?? 0)} />
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addAddon(a)}
                      disabled={addingId === a.id}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-60 ${
                        addingId === a.id
                          ? "bg-[#0B0F19] text-white"
                          : "border-[1.5px] border-[#0B0F19] text-[#0B0F19] hover:bg-[#0B0F19] hover:text-white"
                      }`}
                    >
                      {addingId === a.id ? "Added" : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#EFF1F5] pt-3.5">
            <span className="text-[13px] text-[#64748B]">Subtotal · {count} item{count === 1 ? "" : "s"}</span>
            <MarketPrice usd={subtotal} className="text-xl font-extrabold tracking-tight tabular-nums text-[#0B0F19]" />
          </div>
        </>
      )}

      <div className="space-y-2">
        <button
          type="button"
          onClick={goCheckout}
          disabled={lines.length === 0}
          className="w-full rounded-xl bg-[#0B0F19] py-3.5 text-sm font-bold text-white transition-all hover:bg-black active:scale-[0.99] disabled:opacity-40"
        >
          Checkout · <MarketPrice usd={subtotal} />
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E6EE] py-2.5 text-[13px] font-bold text-[#0B0F19] transition-colors hover:border-[#0B0F19]"
          >
            Keep shopping
          </button>
          <Link
            href="/marketplace/cart"
            onClick={onClose}
            className="rounded-xl bg-[#F6F7F9] py-2.5 text-center text-[13px] font-bold text-[#0B0F19] transition-colors hover:bg-[#EDEFF3]"
          >
            View bag
          </Link>
        </div>
      </div>
    </div>
  )
}

export function CartPopupProvider() {
  const [open, setOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined)

  const close = useCallback(() => {
    setOpen(false)
    setHighlightId(undefined)
  }, [])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ productId?: string }>).detail?.productId
      setHighlightId(id)
      setOpen(true)
    }
    window.addEventListener(TPM_CART_OPEN, onOpen)
    return () => window.removeEventListener(TPM_CART_OPEN, onOpen)
  }, [])

  if (!open) return null
  return (
    <ModalShell label="Your bag" onClose={close}>
      <CartPopupBody highlightId={highlightId} onClose={close} />
    </ModalShell>
  )
}

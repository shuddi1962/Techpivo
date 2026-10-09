// TechPivo Market instant cart popup (CLIENT) — opens after every successful
// add-to-cart via the tpm:cart-open event. Reads the SAME cart store
// (tp_market_cart_v1) as the cart page, so it can never disagree with it.

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Minus, Plus, Trash2, ShoppingCart, Truck } from "lucide-react"
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
    <div className="p-4 space-y-4">
      {highlight?.product && (
        <p className="flex items-center gap-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2.5 text-sm font-bold text-[#047857]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-white">
            <Check className="h-4 w-4" />
          </span>
          Added to your cart
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading your cart...</p>
      ) : lines.length === 0 ? (
        <div className="py-6 text-center">
          <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-bold text-[#0F172A]">Your cart is empty</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto">
            {lines.map((l) => {
              const unit = Number(l.product!.sale_price ?? l.product!.original_price ?? 0)
              const key = `${l.id}::${l.variant?.vid || ""}`
              const isNew = highlightId ? l.id === highlightId : false
              return (
                <li key={key} className={`flex gap-3 py-2.5 ${isNew ? "rounded-lg bg-[#FFFBEB] px-2" : ""}`}>
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    {l.product!.product_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={marketImage(l.product!.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[#0F172A]">{l.product!.product_name}</span>
                    {l.variant?.label && <span className="block truncate text-[11px] text-slate-400">{l.variant.label}</span>}
                    <span className="mt-1 flex items-center gap-2">
                      <span className="flex items-center rounded-lg border border-[#CBD5E1] overflow-hidden">
                        <button type="button" onClick={() => { setQty(l.id, l.qty - 1, l.variant); trackMarket("cart_qty", l.id) }} className="px-2 py-1 hover:bg-slate-100" aria-label="Decrease quantity">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold tabular-nums">{l.qty}</span>
                        <button type="button" onClick={() => { setQty(l.id, l.qty + 1, l.variant); trackMarket("cart_qty", l.id) }} className="px-2 py-1 hover:bg-slate-100" aria-label="Increase quantity">
                          <Plus className="h-3 w-3" />
                        </button>
                      </span>
                      <button type="button" onClick={() => { removeFromCart(l.id, l.variant); trackMarket("cart_remove", l.id) }} className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-[#EF4444]" aria-label={`Remove ${l.product!.product_name}`}>
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-extrabold text-[#0F172A]">
                    <MarketPrice usd={unit * l.qty} />
                  </span>
                </li>
              )
            })}
          </ul>

          {subtotal < FREE_SHIP_THRESHOLD_USD ? (
            <p className="rounded-xl bg-[#FFFBEB] border border-[#FED7AA] px-3 py-2 text-xs text-slate-600">
              Add <MarketPrice usd={FREE_SHIP_THRESHOLD_USD - subtotal} className="font-bold text-[#0F172A]" /> more for <strong className="text-[#10B981]">FREE Standard shipping</strong>
            </p>
          ) : (
            <p className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2 text-xs font-semibold text-[#047857]">
              <Truck className="mr-1 inline h-3.5 w-3.5" />You unlocked FREE Standard shipping.
            </p>
          )}

          {addons.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="text-xs font-bold text-[#0F172A]">Complete your setup with...</p>
              <ul className="mt-2 space-y-2">
                {addons.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                      {a.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={marketImage(a.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/marketplace/product/${a.id}`} onClick={onClose} className="block truncate text-xs font-semibold text-[#0F172A] hover:text-[#B45309]">
                        {a.product_name}
                      </Link>
                      <span className="text-xs font-bold text-[#0F172A]">
                        <MarketPrice usd={Number(a.sale_price ?? a.original_price ?? 0)} />
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addAddon(a)}
                      disabled={addingId === a.id}
                      className="shrink-0 rounded-lg bg-[#0F172A] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-black disabled:opacity-60"
                    >
                      {addingId === a.id ? "Added" : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3">
            <span className="text-sm text-slate-500">Subtotal · {count} item{count === 1 ? "" : "s"}</span>
            <MarketPrice usd={subtotal} className="text-lg font-extrabold text-[#0F172A]" />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={goCheckout}
          disabled={lines.length === 0}
          className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706] disabled:opacity-50"
        >
          Proceed to checkout
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            Continue shopping
          </button>
          <Link
            href="/marketplace/cart"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] py-2.5 text-center text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            View cart
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
    <ModalShell label="Added to your cart" onClose={close}>
      <CartPopupBody highlightId={highlightId} onClose={close} />
    </ModalShell>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCart, removeFromCart, setQty, useMarketCart } from "@/lib/marketplace-cart"
import { dualPrice, useUsdNgnRate } from "@/lib/marketplace-pricing"

interface Row {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
}

export function CartPage() {
  const cart = useMarketCart()
  const rate = useUsdNgnRate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = getCart().map((l) => l.id)
    if (ids.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("id,product_name,product_image_url,sale_price,original_price")
      .in("id", ids)
      .eq("is_active", true)
      .then(({ data }) => {
        setRows((data || []) as Row[])
        setLoading(false)
      })
  }, [cart.length])

  const lines = useMemo(
    () =>
      cart
        .map((l) => ({ ...l, product: rows.find((r) => r.id === l.id) }))
        .filter((l) => l.product),
    [cart, rows]
  )
  const subtotal = lines.reduce((s, l) => s + Number(l.product!.sale_price ?? l.product!.original_price ?? 0) * l.qty, 0)
  const shipping = subtotal === 0 ? 0 : subtotal >= 49 ? 0 : 5

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-sm text-slate-500">
        Loading your cart...
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
        <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="font-bold text-[#0F172A] text-lg">Your cart is empty</p>
        <p className="text-sm text-slate-500 mt-1">Discover curated tech products below.</p>
        <Link href="/marketplace" className="inline-block mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold px-6 py-3 rounded-lg">
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-extrabold text-[#0F172A]">Your Cart ({lines.reduce((s, l) => s + l.qty, 0)})</h1>
          <Link href="/marketplace" className="text-sm text-[#B45309] font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Continue shopping
          </Link>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {lines.map((l) => {
            const unit = Number(l.product!.sale_price ?? l.product!.original_price ?? 0)
            return (
              <div key={l.id} className="py-3 flex gap-3">
                <Link href={`/marketplace/product/${l.id}`} className="w-20 h-20 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden shrink-0">
                  {l.product!.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.product!.product_image_url} alt={l.product!.product_name} className="w-full h-full object-cover" />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/marketplace/product/${l.id}`} className="text-sm font-semibold text-[#0F172A] line-clamp-2 hover:text-[#B45309]">
                    {l.product!.product_name}
                  </Link>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">{dualPrice(unit, rate)}</p>
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <div className="flex items-center border border-[#CBD5E1] rounded-lg overflow-hidden">
                      <button onClick={() => setQty(l.id, l.qty - 1)} className="px-2.5 py-1.5 hover:bg-slate-100" aria-label="Decrease quantity">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                      <button onClick={() => setQty(l.id, l.qty + 1)} className="px-2.5 py-1.5 hover:bg-slate-100" aria-label="Increase quantity">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(l.id)} className="text-xs text-slate-400 hover:text-[#EF4444] inline-flex items-center gap-1" aria-label={`Remove ${l.product!.product_name}`}>
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
                <p className="text-sm font-extrabold text-[#0F172A] whitespace-nowrap">${(unit * l.qty).toFixed(2)}</p>
              </div>
            )
          })}
        </div>
      </div>
      <div className="lg:col-span-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 sticky top-4 space-y-2">
          <h2 className="font-bold text-[#0F172A]">Order summary</h2>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-[#0F172A]">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Shipping</span>
            <span className="font-semibold text-[#0F172A]">{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
          </div>
          {shipping > 0 && <p className="text-[11px] text-slate-400">Free shipping on orders over $49.</p>}
          <div className="border-t border-[#E2E8F0] pt-2 flex justify-between items-baseline">
            <span className="text-sm font-bold text-[#0F172A]">Total</span>
            <span className="text-right">
              <span className="block text-xl font-extrabold text-[#0F172A]">${(subtotal + shipping).toFixed(2)}</span>
              <span className="block text-xs text-slate-500">≈ ₦{Math.round((subtotal + shipping) * rate).toLocaleString()} at checkout</span>
            </span>
          </div>
          <Link href="/marketplace/checkout" className="block text-center bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold py-3 rounded-lg mt-2">
            Proceed to checkout
          </Link>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-center pt-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure Paystack checkout · pay in naira
          </p>
        </div>
      </div>
    </div>
  )
}

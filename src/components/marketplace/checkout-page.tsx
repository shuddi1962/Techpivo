"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { clearCart, getCart, useMarketCart } from "@/lib/marketplace-cart"
import { useUsdNgnRate } from "@/lib/marketplace-pricing"
import {
  SHIP_METHODS, readShipMethod, saveShipMethod, shippingCost,
  type ShipMethodId,
} from "@/lib/marketplace-shipping"

interface Row {
  id: string
  product_name: string
  sale_price: number | null
  original_price: number | null
}

export function CheckoutPage() {
  const router = useRouter()
  const cart = useMarketCart()
  const rate = useUsdNgnRate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", name: "", phone: "", address: "", city: "", state: "", zip: "", country: "NG" })
  const [shipMethod, setShipMethod] = useState<ShipMethodId>("standard")

  useEffect(() => {
    const ids = getCart().map((l) => l.id)
    if (ids.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("id,product_name,sale_price,original_price")
      .in("id", ids)
      .eq("is_active", true)
      .then(({ data }) => {
        setRows((data || []) as Row[])
        setLoading(false)
      })
  }, [cart.length])

  const lines = useMemo(
    () => cart.map((l) => ({ ...l, product: rows.find((r) => r.id === l.id) })).filter((l) => l.product),
    [cart, rows]
  )
  const subtotal = lines.reduce((s, l) => s + Number(l.product!.sale_price ?? l.product!.original_price ?? 0) * l.qty, 0)
  const shipping = shippingCost(subtotal, shipMethod)
  const totalUsd = subtotal + shipping
  const totalNgn = Math.round(totalUsd * rate)

  useEffect(() => {
    setShipMethod(readShipMethod())
  }, [])

  useEffect(() => {
    if (!loading && lines.length === 0) router.replace("/marketplace/cart")
  }, [loading, lines.length, router])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const pay = async () => {
    setError("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email for your receipt.")
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim()) {
      return setError("Name, phone, address and city are required for delivery.")
    }
    setPaying(true)
    try {
      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          ship_name: form.name,
          ship_phone: form.phone,
          ship_address: form.address,
          ship_city: form.city,
          ship_state: form.state,
          ship_zip: form.zip,
          ship_country: form.country,
          items: lines.map((l) => ({ id: l.id, qty: l.qty, variant: l.variant ? { vid: l.variant.vid, label: l.variant.label } : null })),
          shipping_method: shipMethod,
        }),
      })
      const data = await res.json()
      if (res.ok && data?.authorization_url) {
        try {
          sessionStorage.setItem("tpm_last_order", JSON.stringify({ reference: data.reference, email: form.email.trim() }))
        } catch {
          // ignore
        }
        window.location.href = data.authorization_url as string
      } else {
        setError(data?.error || "Could not start payment.")
      }
    } catch {
      setError("Could not start payment. Check your connection and try again.")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-sm text-slate-500">Preparing checkout...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/marketplace/cart" className="text-sm text-[#B45309] font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to cart
          </Link>
        </div>
        <h1 className="text-xl font-extrabold text-[#0F172A]">Delivery details</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="sm:col-span-2 text-sm">
            <span className="font-semibold text-slate-700">Email (receipt + tracking) *</span>
            <input value={form.email} onChange={set("email")} type="email" placeholder="you@example.com" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">Full name *</span>
            <input value={form.name} onChange={set("name")} placeholder="Adaeze Okafor" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">Phone *</span>
            <input value={form.phone} onChange={set("phone")} placeholder="+234 ..." className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <label className="sm:col-span-2 text-sm">
            <span className="font-semibold text-slate-700">Street address *</span>
            <input value={form.address} onChange={set("address")} placeholder="12 Adeola Odeku St, Victoria Island" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">City *</span>
            <input value={form.city} onChange={set("city")} placeholder="Lagos" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="font-semibold text-slate-700">State</span>
              <input value={form.state} onChange={set("state")} placeholder="Lagos" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Postal code</span>
              <input value={form.zip} onChange={set("zip")} placeholder="101241" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
            </label>
          </div>
          <label className="sm:col-span-2 text-sm">
            <span className="font-semibold text-slate-700">Country</span>
            <select value={form.country} onChange={set("country")} className="mt-1 w-full border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-[#F59E0B]">
              {["NG", "GH", "KE", "ZA", "US", "GB"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Delivery method</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery method">
            {SHIP_METHODS.map((m) => {
              const on = shipMethod === m.id
              const fee = shippingCost(subtotal, m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { setShipMethod(m.id); saveShipMethod(m.id) }}
                  className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${on ? "border-[#F59E0B] bg-[#FFFBEB]" : "border-[#E2E8F0] hover:border-slate-400"}`}
                >
                  <span>
                    <span className="block text-sm font-bold text-[#0F172A]">{m.name}</span>
                    <span className="block text-[11px] text-slate-500">{m.eta} · tracked</span>
                  </span>
                  <span className={`text-sm font-extrabold ${fee === 0 ? "text-[#10B981]" : "text-[#0F172A]"}`}>
                    {fee === 0 ? "FREE" : `$${fee.toFixed(2)}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 sticky top-4 space-y-2">
          <h2 className="font-bold text-[#0F172A]">Pay {lines.reduce((s, l) => s + l.qty, 0)} item(s)</h2>
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm text-slate-600">
              <span className="line-clamp-1 mr-2">{l.product!.product_name} × {l.qty}</span>
              <span className="font-semibold text-[#0F172A] whitespace-nowrap">
                ${(Number(l.product!.sale_price ?? l.product!.original_price ?? 0) * l.qty).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm text-slate-600 border-t border-[#E2E8F0] pt-2">
            <span>Shipping</span>
            <span className="font-semibold text-[#0F172A]">{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-bold text-[#0F172A]">Total</span>
            <span className="text-right">
              <span className="block text-2xl font-extrabold text-[#0F172A]">₦{totalNgn.toLocaleString()}</span>
              <span className="block text-xs text-slate-500">≈ ${totalUsd.toFixed(2)}</span>
            </span>
          </div>
          <button onClick={pay} disabled={paying || lines.length === 0} className="w-full bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold py-3 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
            {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting payment...</> : <><Lock className="h-4 w-4" /> Pay ₦{totalNgn.toLocaleString()}</>}
          </button>
          <p className="text-[11px] text-slate-400 text-center">Cards, bank transfer & USSD via Paystack · 7–12 day tracked delivery</p>
          <button onClick={() => { clearCart(); router.push("/marketplace") }} className="w-full text-xs text-slate-400 hover:text-slate-600">
            Clear cart
          </button>
        </div>
      </div>
    </div>
  )
}

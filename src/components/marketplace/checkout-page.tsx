"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Lock, RotateCcw, ShieldCheck, Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { marketImage } from "@/lib/marketplace-images"
import { clearCart, getCart, useMarketCart } from "@/lib/marketplace-cart"
import { useMarketCurrency, useUsdNgnRate } from "@/lib/marketplace-pricing"
import { MarketPrice } from "./market-price"
import {
  readShipSelection, saveShipSelection, storeShipOptions, SHIP_COUNTRIES, DEFAULT_SHIP_COUNTRY, FREE_SHIP_THRESHOLD_USD,
  type ShipOption, type ShipSelection,
} from "@/lib/marketplace-shipping"
import { getGeoOnce } from "@/lib/tools-geo"
import { countryPreset, DIAL_CODES } from "@/lib/marketplace-locale"
import { DeliveryPicker } from "./delivery-picker"

interface Row {
  id: string
  product_name: string
  product_image_url: string | null
  sale_price: number | null
  original_price: number | null
}

export function CheckoutPage() {
  const router = useRouter()
  const cart = useMarketCart()
  const rate = useUsdNgnRate()
  const currency = useMarketCurrency()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", name: "", phone: "", dial: "", address: "", city: "", state: "", zip: "", country: DEFAULT_SHIP_COUNTRY })
  const [dialTouched, setDialTouched] = useState(false)
  const preset = countryPreset(form.country)
  // Dial code follows the country until the buyer picks one manually.
  useEffect(() => {
    if (!dialTouched) setForm((f) => ({ ...f, dial: countryPreset(f.country).dial }))
  }, [form.country, dialTouched])
  const [shipOptions, setShipOptions] = useState<ShipOption[]>([])
  const [shipPick, setShipPick] = useState<ShipSelection | null>(null)

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
      .select("id,product_name,product_image_url,sale_price,original_price")
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
  // Delivery options for the whole cart (supplier rates + store fallbacks).
  useEffect(() => {
    setShipPick(readShipSelection())
    if (lines.length === 0) return
    fetch("/api/marketplace/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((l) => ({ product_id: l.id, variant_vid: l.variant?.vid || "", qty: l.qty })),
        country: form.country,
        subtotal,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.options)) setShipOptions(d.options as ShipOption[])
      })
      .catch(() => {
        // fallbacks below still render
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lines.length, form.country])
  const effectiveOptions = shipOptions.length > 0 ? shipOptions : storeShipOptions(subtotal)
  const activePick = effectiveOptions.find((o) => o.id === shipPick?.id) || effectiveOptions[0]
  const shipping = activePick ? activePick.feeUsd : 0
  const totalUsd = subtotal + shipping
  const totalNgn = Math.round(totalUsd * rate)

  // Default country follows the shopper's real location (worldwide store).
  useEffect(() => {
    getGeoOnce()
      .then((g) => {
        const code = g?.countryCode?.toUpperCase()
        if (code && SHIP_COUNTRIES.some((c) => c.code === code)) {
          setForm((f) => ({ ...f, country: code }))
        }
      })
      .catch(() => {
        // keep default
      })
  }, [])

  useEffect(() => {
    if (!loading && lines.length === 0) router.replace("/marketplace/cart")
  }, [loading, lines.length, router])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const fullPhone = `${form.dial || preset.dial} ${form.phone.trim()}`.trim()

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
          ship_phone: fullPhone.slice(0, 40),
          ship_address: form.address,
          ship_city: form.city,
          ship_state: form.state,
          ship_zip: form.zip,
          ship_country: form.country,
          items: lines.map((l) => ({ id: l.id, qty: l.qty, variant: l.variant ? { vid: l.variant.vid, label: l.variant.label } : null })),
          shipping_id: activePick?.id || "standard",
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
        {/* checkout steps */}
        <ol className="flex items-center gap-2 text-xs font-bold" aria-label="Checkout steps">
          <li className="flex items-center gap-1.5 text-[#0F172A]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B] text-[#0F172A]">1</span> Details
          </li>
          <li className="h-px flex-1 bg-[#E2E8F0]" aria-hidden />
          <li className="flex items-center gap-1.5 text-slate-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">2</span> Payment
          </li>
        </ol>
        <h1 className="text-xl font-extrabold text-[#0F172A]">Delivery details</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="sm:col-span-2 text-sm">
            <span className="font-semibold text-slate-700">Email (receipt + tracking) *</span>
            <input value={form.email} onChange={set("email")} type="email" placeholder="you@example.com" className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">Full name *</span>
            <input value={form.name} onChange={set("name")} placeholder={preset.name} className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <div className="text-sm">
            <span className="font-semibold text-slate-700">Phone *</span>
            <div className="mt-1 flex gap-2">
              <select
                value={form.dial || preset.dial}
                onChange={(e) => { setDialTouched(true); setForm((f) => ({ ...f, dial: e.target.value })) }}
                aria-label="Country dial code"
                className="w-44 shrink-0 cursor-pointer border rounded-lg px-2 py-2.5 bg-white focus:outline-none focus:border-[#F59E0B]"
              >
                {DIAL_CODES.map((d) => (
                  <option key={`${d.code}-${d.dial}`} value={d.dial}>{d.dial}</option>
                ))}
              </select>
              <input value={form.phone} onChange={set("phone")} inputMode="tel" placeholder={preset.phone} className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
            </div>
          </div>
          <label className="sm:col-span-2 text-sm">
            <span className="font-semibold text-slate-700">Street address *</span>
            <input value={form.address} onChange={set("address")} placeholder={preset.street} className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">City *</span>
            <input value={form.city} onChange={set("city")} placeholder={preset.city} className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="font-semibold text-slate-700">State</span>
              <input value={form.state} onChange={set("state")} placeholder={preset.state} className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Postal code</span>
              <input value={form.zip} onChange={set("zip")} placeholder={preset.zip} className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#F59E0B]" />
            </label>
          </div>
          <label className="sm:col-span-2 text-sm">
            <span className="font-semibold text-slate-700">Country</span>
            <select value={form.country} onChange={set("country")} className="mt-1 w-full border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-[#F59E0B]">
              {SHIP_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Delivery</p>
          <DeliveryPicker
            country={form.country}
            onCountry={(code) => setForm((f) => ({ ...f, country: code }))}
            options={shipOptions}
            fallbackOptions={storeShipOptions(subtotal)}
            value={shipPick}
            onChange={(sel) => {
              setShipPick(sel)
              saveShipSelection(sel)
            }}
          />
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 sticky top-4 space-y-3">
          <h2 className="font-bold text-[#0F172A]">Order summary · {lines.reduce((s, l) => s + l.qty, 0)} item(s)</h2>
          {/* free-shipping meter */}
          {subtotal < FREE_SHIP_THRESHOLD_USD ? (
            <div className="rounded-xl bg-[#FFFBEB] border border-[#FED7AA] p-3">
              <p className="text-xs text-slate-600">Add <MarketPrice usd={FREE_SHIP_THRESHOLD_USD - subtotal} className="font-bold text-[#0F172A]" /> more for <strong className="text-[#10B981]">FREE Standard shipping</strong></p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#FDEBD3]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] transition-all" style={{ width: `${Math.min(100, Math.round((subtotal / FREE_SHIP_THRESHOLD_USD) * 100))}%` }} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3">
              <p className="text-xs font-semibold text-[#047857]">You unlocked FREE Standard shipping on this order.</p>
            </div>
          )}
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={`${l.id}::${l.variant?.vid || ""}`} className="flex items-center gap-2.5">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  {l.product!.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={marketImage(l.product!.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute -right-0 -top-0 rounded-bl-lg bg-[#0F172A] px-1.5 text-[10px] font-bold text-white">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-700">{l.product!.product_name}</span>
                  {l.variant?.label && <span className="block truncate text-[11px] text-slate-400">{l.variant.label}</span>}
                </span>
                <span className="whitespace-nowrap text-sm font-semibold text-[#0F172A]">
                  <MarketPrice usd={Number(l.product!.sale_price ?? l.product!.original_price ?? 0) * l.qty} />
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-slate-600 border-t border-[#E2E8F0] pt-2">
            <span>Subtotal</span>
            <MarketPrice usd={subtotal} className="font-semibold text-[#0F172A]" />
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Shipping{activePick ? ` (${activePick.name})` : ""}</span>
            {shipping === 0 ? (
              <span className="font-semibold text-[#0F172A]">FREE</span>
            ) : (
              <MarketPrice usd={shipping} className="font-semibold text-[#0F172A]" />
            )}
          </div>
          {lines.length > 1 && (
            <p className="text-[11px] leading-relaxed text-slate-500">
              Items may ship in separate parcels and arrive on different days — one delivery fee covers the whole order, and every parcel is tracked.
            </p>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-bold text-[#0F172A]">Total</span>
            <span className="text-right">
              <MarketPrice usd={totalUsd} className="block text-2xl font-extrabold text-[#0F172A]" />
              <span className="block text-xs text-slate-500">
                {currency === "NGN" ? `≈ $${totalUsd.toFixed(2)}` : `≈ ₦${totalNgn.toLocaleString()}`} · charged in naira
              </span>
            </span>
          </div>
          <button onClick={pay} disabled={paying || lines.length === 0} className="w-full bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold py-3 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
            {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting payment...</> : <><Lock className="h-4 w-4" /> Pay ₦{totalNgn.toLocaleString()}</>}
          </button>
          <div className="flex items-center justify-center gap-1.5">
            {["VISA", "MASTERCARD", "VERVE", "PAYSTACK"].map((b) => (
              <span key={b} className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-bold text-slate-500">{b}</span>
            ))}
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-[11px] leading-relaxed text-slate-500">
            <p className="font-bold text-[#0F172A] mb-1">International delivery notes</p>
            <p>Orders ship tracked from abroad. Duties &amp; taxes (where applicable) are the buyer&apos;s responsibility — customs inspection rates are low (under 10%). Delayed-order claims are handled 100 days after dispatch.</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" /> Secure checkout</span>
            <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-[#F59E0B]" /> Tracked delivery</span>
            <span className="inline-flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5 text-[#F59E0B]" /> 30-day returns</span>
          </div>
          <button onClick={() => { clearCart(); router.push("/marketplace") }} className="w-full text-xs text-slate-400 hover:text-slate-600">
            Clear cart
          </button>
        </div>
      </div>
    </div>
  )
}

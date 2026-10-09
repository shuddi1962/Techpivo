// TechPivo Market checkout modal (CLIENT) — the SAME checkout + Korapay
// flow as /marketplace/checkout, presented as a responsive modal (desktop)
// / full-screen sheet (mobile) instead of a page redirect. Server prices,
// validates stock, creates the order, and initializes Korapay; the
// customer completes payment on Korapay's authorized hosted flow (required
// external step — never simulated), then returns to checkout/success.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Lock, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCart, useMarketCart } from "@/lib/marketplace-cart"
import { marketImage } from "@/lib/marketplace-images"
import { useMarketCurrency, useUsdNgnRate } from "@/lib/marketplace-pricing"
import { MarketPrice } from "./market-price"
import { ModalShell } from "./modal-shell"
import { TPM_CHECKOUT, trackMarket } from "@/lib/marketplace-events"
import {
  readShipSelection, saveShipSelection, storeShipOptions, visibleShipOptions,
  resolveShipActive, SHIP_COUNTRIES, DEFAULT_SHIP_COUNTRY,
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

function CheckoutModalBody({ onClose }: { onClose: () => void }) {
  const cart = useMarketCart()
  const rate = useUsdNgnRate()
  const currency = useMarketCurrency()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", name: "", phone: "", dial: "", address: "", city: "", state: "", zip: "", country: DEFAULT_SHIP_COUNTRY })
  const [dialTouched, setDialTouched] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [shipOptions, setShipOptions] = useState<ShipOption[]>([])
  const [shipPick, setShipPick] = useState<ShipSelection | null>(null)

  const preset = countryPreset(form.country)
  useEffect(() => {
    if (!dialTouched) setForm((f) => ({ ...f, dial: countryPreset(f.country).dial }))
  }, [form.country, dialTouched])

  useEffect(() => {
    trackMarket("checkout_start")
  }, [])

  useEffect(() => {
    const ids = getCart().map((l) => l.id)
    if (ids.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    const supabase = createClient()
    ;(async () => {
      try {
        const { data } = await supabase
          .from("affiliate_products")
          .select("id,product_name,product_image_url,sale_price,original_price")
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
        // store fallbacks below still render
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lines.length, form.country])

  const effectiveOptions = shipOptions.length > 0 ? shipOptions : storeShipOptions(subtotal)
  const shownOptions = useMemo(() => visibleShipOptions(effectiveOptions, []), [effectiveOptions])
  const activePick = resolveShipActive(shownOptions, shipPick)
  useEffect(() => {
    if (!activePick) return
    if ((shipPick?.id || "standard") !== activePick.id) {
      const sel: ShipSelection = { id: activePick.id, name: activePick.name, eta: activePick.eta, feeUsd: activePick.feeUsd }
      setShipPick(sel)
      saveShipSelection(sel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePick?.id])

  const shipping = activePick ? activePick.feeUsd : 0
  const totalUsd = subtotal + shipping
  const totalNgn = Math.round(totalUsd * rate)

  useEffect(() => {
    getGeoOnce()
      .then((g) => {
        const code = g?.countryCode?.toUpperCase()
        if (code && SHIP_COUNTRIES.some((c) => c.code === code)) setForm((f) => ({ ...f, country: code }))
      })
      .catch(() => {
        // keep default
      })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const pay = async () => {
    setError("")
    const fe: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) fe.email = "Enter a valid email for your receipt."
    if (!form.name.trim()) fe.name = "Full name is required."
    if (!form.phone.trim()) fe.phone = "Phone is required."
    if (!form.address.trim()) fe.address = "Street address is required."
    if (!form.city.trim()) fe.city = "City is required."
    setFieldErrors(fe)
    if (Object.keys(fe).length > 0) return
    if (paying) return // duplicate-submission guard
    setPaying(true)
    trackMarket("checkout_pay_attempt")
    try {
      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          ship_name: form.name,
          ship_phone: `${form.dial || preset.dial} ${form.phone.trim()}`.trim().slice(0, 40),
          ship_address: form.address,
          ship_city: form.city,
          ship_state: form.state,
          ship_zip: form.zip,
          ship_country: form.country,
          items: lines.map((l) => ({ id: l.id, qty: l.qty, variant: l.variant ? { vid: l.variant.vid, label: l.variant.label } : null })),
          shipping_id: activePick?.id || "standard",
        }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.authorization_url) {
        try {
          sessionStorage.setItem("tpm_last_order", JSON.stringify({ reference: data.reference, email: form.email.trim() }))
        } catch {
          // ignore
        }
        trackMarket("checkout_success")
        // Korapay's authorized hosted payment step (required external flow).
        window.location.href = data.authorization_url as string
      } else {
        trackMarket("checkout_fail")
        // Inputs are preserved — only the message changes.
        setError(data?.error || "Could not start payment. Your details are saved above — try again.")
      }
    } catch {
      trackMarket("checkout_fail")
      setError("Could not start payment. Check your connection and try again.")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-500">Preparing checkout...</p>
  }
  if (lines.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-bold text-[#0F172A]">Your cart is empty</p>
        <button type="button" onClick={onClose} className="mt-3 rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F172A]">
          Continue shopping
        </button>
      </div>
    )
  }

  const inputCls = (bad?: string) =>
    `mt-1 w-full rounded-lg border px-3 py-2.5 focus:outline-none ${bad ? "border-[#EF4444]" : "border-[#E2E8F0] focus:border-[#F59E0B]"}`
  const err = (k: string) => fieldErrors[k] && <span className="mt-0.5 block text-xs text-[#EF4444]">{fieldErrors[k]}</span>

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-[#0F172A]">Contact & delivery</h3>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Email (receipt + tracking) *</span>
          <input value={form.email} onChange={set("email")} type="email" placeholder="you@example.com" className={inputCls(fieldErrors.email)} aria-invalid={!!fieldErrors.email} />
          {err("email")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Full name *</span>
            <input value={form.name} onChange={set("name")} placeholder={preset.name} className={inputCls(fieldErrors.name)} aria-invalid={!!fieldErrors.name} />
            {err("name")}
          </label>
          <div className="text-sm">
            <span className="font-semibold text-slate-700">Phone *</span>
            <div className="mt-1 flex gap-1.5">
              <select
                value={form.dial || preset.dial}
                onChange={(e) => { setDialTouched(true); setForm((f) => ({ ...f, dial: e.target.value })) }}
                aria-label="Country dial code"
                className="w-24 shrink-0 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-1.5 py-2.5 focus:outline-none focus:border-[#F59E0B]"
              >
                {DIAL_CODES.map((d) => (
                  <option key={`${d.code}-${d.dial}`} value={d.dial}>{d.dial}</option>
                ))}
              </select>
              <input value={form.phone} onChange={set("phone")} inputMode="tel" placeholder={preset.phone} className={inputCls(fieldErrors.phone)} aria-invalid={!!fieldErrors.phone} />
            </div>
            {err("phone")}
          </div>
        </div>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Street address *</span>
          <input value={form.address} onChange={set("address")} placeholder={preset.street} className={inputCls(fieldErrors.address)} aria-invalid={!!fieldErrors.address} />
          {err("address")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">City *</span>
            <input value={form.city} onChange={set("city")} placeholder={preset.city} className={inputCls(fieldErrors.city)} aria-invalid={!!fieldErrors.city} />
            {err("city")}
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">State</span>
            <input value={form.state} onChange={set("state")} placeholder={preset.state} className={inputCls()} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Postal code</span>
            <input value={form.zip} onChange={set("zip")} placeholder={preset.zip} className={inputCls()} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Country</span>
            <select value={form.country} onChange={set("country")} className={`${inputCls()} bg-white`}>
              {SHIP_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Delivery</p>
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
        {error && <p role="alert" className="rounded-xl border border-[#E9EBF1] bg-[#F6F7F9] px-3 py-2.5 text-[13px] font-semibold text-[#B91C1C]">{error}</p>}
      </div>

      <div className="space-y-3 rounded-2xl border border-[#E9EBF1] bg-[#F6F7F9] p-4">
        <h3 className="text-sm font-extrabold text-[#0F172A]">Order summary · {lines.reduce((s, l) => s + l.qty, 0)} item(s)</h3>
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {lines.map((l) => (
            <li key={`${l.id}::${l.variant?.vid || ""}`} className="flex items-center gap-2.5">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                {l.product!.product_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marketImage(l.product!.product_image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute right-0 top-0 rounded-bl-lg bg-[#0F172A] px-1 text-[10px] font-bold text-white">{l.qty}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-700">{l.product!.product_name}</span>
                {l.variant?.label && <span className="block truncate text-[11px] text-slate-400">{l.variant.label}</span>}
              </span>
              <span className="whitespace-nowrap text-[13px] font-bold text-[#0F172A]">
                <MarketPrice usd={Number(l.product!.sale_price ?? l.product!.original_price ?? 0) * l.qty} />
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-[#E2E8F0] pt-2 text-sm text-slate-600">
          <span>Subtotal</span>
          <MarketPrice usd={subtotal} className="font-semibold text-[#0F172A]" />
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Shipping{activePick ? ` (${activePick.name})` : ""}</span>
          {shipping === 0 ? <span className="font-semibold text-[#0F172A]">FREE</span> : <MarketPrice usd={shipping} className="font-semibold text-[#0F172A]" />}
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-[#0F172A]">Total</span>
          <span className="text-right">
            <MarketPrice usd={totalUsd} className="block text-2xl font-extrabold text-[#0F172A]" />
            <span className="block text-xs text-slate-500">
              {currency === "NGN" ? `≈ $${totalUsd.toFixed(2)}` : `≈ ₦${totalNgn.toLocaleString()}`} · charged in naira
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={pay}
          disabled={paying || lines.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B0F19] py-3.5 text-sm font-bold text-white transition-all hover:bg-black active:scale-[0.99] disabled:opacity-60"
        >
          {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting payment...</> : <><Lock className="h-4 w-4" /> Pay ₦{totalNgn.toLocaleString()}</>}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#94A3B8]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0B0F19]" /> Secure Korapay checkout · back to cart keeps your items
        </p>
        <button type="button" onClick={onClose} disabled={paying} className="w-full text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50">
          Return to cart
        </button>
      </div>
    </div>
  )
}

export function CheckoutModalProvider() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(TPM_CHECKOUT, onOpen)
    return () => window.removeEventListener(TPM_CHECKOUT, onOpen)
  }, [])

  if (!open) return null
  return (
    <ModalShell label="Checkout" onClose={close} size="xl" fullOnMobile>
      <CheckoutModalBody onClose={close} />
    </ModalShell>
  )
}

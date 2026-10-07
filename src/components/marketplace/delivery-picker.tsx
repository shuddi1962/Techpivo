"use client"

import { Truck } from "lucide-react"
import { SHIP_COUNTRIES, visibleShipOptions, resolveShipActive, type ShipOption, type ShipSelection } from "@/lib/marketplace-shipping"
import { formatMarketPrice, useMarketCurrency, useUsdNgnRate } from "@/lib/marketplace-pricing"

// CJ-style delivery picker: "Ship to [full country name] by [method]"
// with the selected method's processing time, ETA and fee below.
export function DeliveryPicker({
  country,
  onCountry,
  options,
  fallbackOptions,
  value,
  onChange,
  compact = false,
  hideFees = false,
}: {
  country: string
  onCountry: (code: string) => void
  options: ShipOption[]
  fallbackOptions: ShipOption[]
  value: ShipSelection | null
  onChange: (sel: ShipSelection) => void
  compact?: boolean
  hideFees?: boolean
}) {
  const list = options.length > 0 ? options : fallbackOptions
  // When live supplier couriers exist, they are the ONLY methods — the
  // buyer always pays the real marked-up courier rate, never less.
  // (visibleShipOptions/resolveShipActive are shared with checkout-page so
  // displayed === charged.)
  const shown = visibleShipOptions(list, [])
  const active = resolveShipActive(shown, value)
  const live = shown.filter((o) => o.source === "supplier")
  const currency = useMarketCurrency()
  const rate = useUsdNgnRate()
  const feeLabel = (feeUsd: number) =>
    feeUsd === 0 ? "FREE" : formatMarketPrice(feeUsd, rate, currency)

  const pick = (id: string) => {
    const o = shown.find((x) => x.id === id)
    if (o) onChange({ id: o.id, name: o.name, eta: o.eta, feeUsd: o.feeUsd })
  }

  return (
    <div>
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        <label className="text-xs">
          <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Ship to</span>
          <select
            value={country}
            onChange={(e) => onCountry(e.target.value)}
            aria-label="Ship to country"
            className="w-full cursor-pointer rounded-xl border-2 border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-bold text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
          >
            {SHIP_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">By shipping method</span>
          <select
            value={active?.id || "standard"}
            onChange={(e) => pick(e.target.value)}
            aria-label="Shipping method"
            className="w-full cursor-pointer rounded-xl border-2 border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-bold text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
          >
            {shown.map((o) => (
              <option key={o.id} value={o.id}>
                {hideFees ? o.name : `${o.name} — ${feeLabel(o.feeUsd)}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      {active && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-[#B45309]" />
            <span>
              <span className="block text-sm font-bold text-[#0F172A]">{active.name}</span>
              <span className="block text-[11px] text-slate-500">
                Processing 1–3 days{active.eta ? ` · ${active.eta}` : ""} · tracked
              </span>
            </span>
          </span>
          <span className={`text-sm font-extrabold ${!hideFees && active.feeUsd === 0 ? "text-[#10B981]" : "text-[#0F172A]"}`}>
            {!hideFees && feeLabel(active.feeUsd)}
            {hideFees && <span className="text-xs font-semibold text-slate-500">Priced at checkout</span>}
          </span>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-slate-500">
        {live.length > 0
          ? "Live courier rates with tracking — one fee covers your whole order at checkout."
          : "Standard is free on orders over $35. Final shipping is calculated once per order at checkout."}
      </p>
    </div>
  )
}

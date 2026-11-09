"use client"

// Client-only shipping hooks. These use React hooks (useState/useEffect) and
// must live in a separate "use client" module so the server-safe
// marketplace-shipping.ts can still be imported by api/marketplace/shipping
// route.ts (a Route Handler, which runs server-side).
//
// Both the cart page and the checkout page call useShippingOptions with
// identical inputs, so they always render the same quote — fixing the
// cart<->checkout shipping mismatch.

import { useEffect, useState } from "react"

import {
  DEFAULT_SHIP_COUNTRY,
  SHIP_COUNTRIES,
  ShipOption,
  ShipSelection,
  resolveShipActive,
  readShipSelection,
  saveShipSelection,
  storeShipOptions,
  visibleShipOptions,
} from "./marketplace-shipping"
import { getGeoOnce } from "@/lib/tools-geo"

interface ShippingLines {
  product_id: string
  variant_vid: string
  qty: number
}

export interface UseShippingOptionsResult {
  options: ShipOption[]
  shownOptions: ShipOption[]
  activePick: ShipOption | undefined
  shipping: number
  fetchOptions: () => void
}

/**
 * Resolve the ship-to country shared by both cart and checkout so the CJ
 * shipping quote (and the store fallback) is identical in both places.
 * Geo detection is cached (tools-geo.getGeoOnce) so both pages observe the
 * same country and never diverge (cart CJPacket Postal vs checkout Standard).
 */
export function useShippingCountry(): string {
  const [country, setCountry] = useState<string>(DEFAULT_SHIP_COUNTRY)
  useEffect(() => {
    getGeoOnce()
      .then((g) => {
        const code = g?.countryCode?.toUpperCase()
        if (code && SHIP_COUNTRIES.some((c) => c.code === code)) setCountry(code)
      })
      .catch(() => {})
  }, [])
  return country
}

/**
 * Resolve live shipping options for a set of cart lines.
 * `country` defaults to DEFAULT_SHIP_COUNTRY; `subtotal` is the cart subtotal in USD.
 * Returns options + the active pick (resolved against the stored selection so
 * the method the buyer sees is always the method they are charged for).
 *
 * Both the cart page and the checkout page call this with identical inputs so
 * they always render the same quote — fixing the cart<->checkout shipping
 * mismatch. The active pick is derived from the stored selection
 * (readShipSelection) but falls back to the first available option when the
 * stored method isn't offered for this cart/country.
 */
export function useShippingOptions({
  lines,
  country,
  subtotal,
}: {
  lines: ShippingLines[]
  country: string
  subtotal: number
}): UseShippingOptionsResult {
  const [options, setOptions] = useState<ShipOption[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchOptions = () => {
    if (lines.length === 0) {
      setOptions([])
      return
    }
    fetch("/api/marketplace/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines, country, subtotal }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (mounted && Array.isArray(d?.options)) setOptions(d.options as ShipOption[])
      })
      .catch(() => {
        // fallbacks below still render
      })
  }

  useEffect(() => {
    fetchOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), country, String(subtotal)])

  const effectiveOptions = options.length > 0 ? options : storeShipOptions(subtotal)
  const shownOptions = visibleShipOptions(effectiveOptions, [])
  // Resolve the active method against the stored selection; if the stored
  // method isn't offered for this cart/country, fall back to the first option
  // so the buyer is always charged for a method that is actually shown.
  const activePick = resolveShipActive(shownOptions, readShipSelection())
  const shipping = activePick ? activePick.feeUsd : 0

  return { options, shownOptions, activePick, shipping, fetchOptions }
}

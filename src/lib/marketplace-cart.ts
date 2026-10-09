"use client"

// TechPivo Market — persistent cart (localStorage + cross-component sync)
// Key: tp_market_cart_v1 = Array<{ id: string; qty: number }>
// Product details are always resolved live from affiliate_products so
// prices/names stay correct even if the cart outlives a catalog edit.

import { useSyncExternalStore } from "react"

export interface CartVariant {
  vid: string
  label: string
  /** Supplier option photo — shown in bag/cart/checkout instead of the generic product shot. */
  image?: string | null
}

export interface CartLine {
  id: string
  qty: number
  variant?: CartVariant | null
}

const KEY = "tp_market_cart_v1"

// useSyncExternalStore calls getSnapshot on EVERY render and re-renders
// while the snapshot identity keeps changing — so the snapshot MUST be
// referentially stable. Returning a freshly-parsed array each call caused
// "Minified React error #185 / Maximum update depth exceeded" (infinite
// re-render loop) on every store page as soon as any state update (product
// load, countdown tick) triggered a re-render. Cache keyed on the raw
// localStorage string: identical storage → identical array reference.
let snapshotCache: { raw: string | null; lines: CartLine[] } | null = null

function normalizeVariant(v: unknown): CartVariant | null {
  if (!v || typeof v !== "object") return null
  const o = v as Record<string, unknown>
  if (typeof o.vid !== "string" || typeof o.label !== "string") return null
  const vid = o.vid.slice(0, 80)
  // An empty vid is no variant at all — normalizing here keeps
  // option-less adds merging with each other instead of forking lines.
  if (!vid) return null
  return {
    vid,
    label: o.label.slice(0, 120),
    image: typeof o.image === "string" && o.image ? o.image.slice(0, 500) : null,
  }
}

function parseLines(raw: string | null): CartLine[] {
  try {
    const arr = raw ? (JSON.parse(raw) as CartLine[]) : []
    if (!Array.isArray(arr)) return []
    return arr
      .filter((l) => typeof l?.id === "string" && Number.isFinite(l?.qty))
      .map((l) => ({
        id: l.id,
        qty: Math.max(1, Math.min(99, Math.floor(l.qty))),
        variant: normalizeVariant(l.variant),
      }))
  } catch {
    return []
  }
}

function read(): CartLine[] {
  if (typeof window === "undefined") return []
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    return snapshotCache?.lines ?? []
  }
  if (snapshotCache && snapshotCache.raw === raw) return snapshotCache.lines
  const lines = parseLines(raw)
  snapshotCache = { raw, lines }
  return lines
}

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((fn) => fn())
  window.dispatchEvent(new Event("tp-market-cart"))
}

function write(lines: CartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    // storage full/blocked — cart just won't persist
  }
  emit()
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit()
  })
  window.addEventListener("tp-market-cart", () => {
    listeners.forEach((fn) => fn())
  })
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getCart(): CartLine[] {
  return read()
}

function sameLine(a: CartLine, id: string, variant?: CartVariant | null): boolean {
  return a.id === id && (a.variant?.vid || "") === (normalizeVariant(variant)?.vid || "")
}

function cleanVariant(variant?: CartVariant | null): CartVariant | null {
  return normalizeVariant(variant)
}

export function setQty(id: string, qty: number, variant?: CartVariant | null) {
  const v = cleanVariant(variant)
  const lines = read()
  if (qty <= 0) {
    write(lines.filter((l) => !sameLine(l, id, v)))
    return
  }
  const found = lines.find((l) => sameLine(l, id, v))
  if (found) found.qty = Math.max(1, Math.min(99, Math.floor(qty)))
  else lines.push({ id, qty: Math.max(1, Math.min(99, Math.floor(qty))), variant: v })
  write(lines)
}

export function addToCart(id: string, qty = 1, variant?: CartVariant | null) {
  const v = cleanVariant(variant)
  const lines = read()
  const found = lines.find((l) => sameLine(l, id, v))
  if (found) found.qty = Math.min(99, found.qty + Math.max(1, Math.floor(qty)))
  else lines.push({ id, qty: Math.max(1, Math.floor(qty)), variant: v })
  write(lines)
}

export function removeFromCart(id: string, variant?: CartVariant | null) {
  write(read().filter((l) => !sameLine(l, id, cleanVariant(variant))))
}

export function clearCart() {
  write([])
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.qty, 0)
}

export function useMarketCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => [] as CartLine[])
}

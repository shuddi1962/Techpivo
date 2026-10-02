"use client"

// TechPivo Market — persistent cart (localStorage + cross-component sync)
// Key: tp_market_cart_v1 = Array<{ id: string; qty: number }>
// Product details are always resolved live from affiliate_products so
// prices/names stay correct even if the cart outlives a catalog edit.

import { useSyncExternalStore } from "react"

export interface CartLine {
  id: string
  qty: number
}

const KEY = "tp_market_cart_v1"

function read(): CartLine[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as CartLine[]
    if (!Array.isArray(arr)) return []
    return arr
      .filter((l) => typeof l?.id === "string" && Number.isFinite(l?.qty))
      .map((l) => ({ id: l.id, qty: Math.max(1, Math.min(99, Math.floor(l.qty))) }))
  } catch {
    return []
  }
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

export function setQty(id: string, qty: number) {
  const lines = read()
  if (qty <= 0) {
    write(lines.filter((l) => l.id !== id))
    return
  }
  const found = lines.find((l) => l.id === id)
  if (found) found.qty = Math.max(1, Math.min(99, Math.floor(qty)))
  else lines.push({ id, qty: Math.max(1, Math.min(99, Math.floor(qty))) })
  write(lines)
}

export function addToCart(id: string, qty = 1) {
  const lines = read()
  const found = lines.find((l) => l.id === id)
  if (found) found.qty = Math.min(99, found.qty + Math.max(1, Math.floor(qty)))
  else lines.push({ id, qty: Math.max(1, Math.floor(qty)) })
  write(lines)
}

export function removeFromCart(id: string) {
  write(read().filter((l) => l.id !== id))
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

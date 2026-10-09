// TechPivo Market — compare-list helpers (localStorage, client-safe).
// Compare state is visual-only shortlisting; the key is shared by every
// storefront card so a product compared in one section shows everywhere.

"use client"

import { useSyncExternalStore } from "react"

export const COMPARE_KEY = "tp_market_compare_v1"

export function readCompare(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Object.fromEntries((Array.isArray(arr) ? arr : []).map((id) => [id, true]))
  } catch {
    return {}
  }
}

/** Flip the stored compare flag for a product; returns the new state. */
export function toggleCompareStored(id: string): boolean {
  const cur = readCompare()
  const next = !cur[id]
  try {
    if (next) cur[id] = true
    else delete cur[id]
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(Object.keys(cur)))
  } catch {
    // storage blocked — caller still toggles its visual state
  }
  notifyCompare()
  return next
}

export function clearCompare() {
  try {
    window.localStorage.removeItem(COMPARE_KEY)
  } catch {
    // ignore
  }
  notifyCompare()
}

const cmpListeners = new Set<() => void>()

function notifyCompare() {
  cmpListeners.forEach((fn) => fn())
  try {
    window.dispatchEvent(new Event("tp-market-compare"))
  } catch {
    // ssr — no window
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === COMPARE_KEY) notifyCompare()
  })
  window.addEventListener("tp-market-compare", () => {
    cmpListeners.forEach((fn) => fn())
  })
}

/** Live compare ids for badges, tray, and the compare page. */
export function useCompareIds(): string[] {
  return useSyncExternalStore(subscribeCompare, readCompareIds, () => EMPTY_IDS)
}

const EMPTY_IDS: string[] = []

// Snapshot MUST be referentially stable: useSyncExternalStore re-renders
// while the snapshot identity keeps changing, and a fresh Object.keys()
// per call is React error #185 ("Maximum update depth exceeded") — the
// exact crash this fix resolves. Cache keyed on the raw storage string.
let idsCache: { raw: string | null; ids: string[] } | null = null

function readCompareIds(): string[] {
  if (typeof window === "undefined") return EMPTY_IDS
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(COMPARE_KEY)
  } catch {
    return idsCache?.ids ?? EMPTY_IDS
  }
  if (idsCache && idsCache.raw === raw) return idsCache.ids
  const ids = Object.keys(readCompare())
  idsCache = { raw, ids }
  return ids
}

function subscribeCompare(fn: () => void) {
  cmpListeners.add(fn)
  return () => {
    cmpListeners.delete(fn)
  }
}

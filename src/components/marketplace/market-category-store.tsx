"use client"

// Live category tree for the storefront.
//
// The tree starts as the bundled code tree (so SSR never flashes an empty
// menu) and is replaced with the admin-editable database tree as soon as
// /api/marketplace/categories responds. Admin edits therefore show up on
// the storefront without a redeploy.

import { useEffect, useSyncExternalStore } from "react"
import { MARKET_DEPARTMENTS, type MarketDepartment } from "@/lib/marketplace-categories"

let tree: MarketDepartment[] = MARKET_DEPARTMENTS
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function subscribeMarketplaceTree(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getMarketplaceTree() {
  return tree
}

export function setMarketplaceTree(next: MarketDepartment[]) {
  if (!Array.isArray(next) || next.length === 0) return
  tree = next
  emit()
}

/** The live tree inside a client component. */
export function useMarketplaceTree(): MarketDepartment[] {
  return useSyncExternalStore(subscribeMarketplaceTree, getMarketplaceTree, getMarketplaceTree)
}

/** Mounts once per store page and keeps the tree fresh (mount + focus). */
export function MarketCategorySync() {
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/marketplace/categories", { cache: "no-store" })
        const data = await res.json()
        if (!cancelled && Array.isArray(data?.tree) && data.tree.length > 0) {
          setMarketplaceTree(data.tree as MarketDepartment[])
        }
      } catch {
        // keep the bundled tree
      }
    }
    void load()
    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)
    const poll = setInterval(load, 60_000)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
      clearInterval(poll)
    }
  }, [])
  return null
}

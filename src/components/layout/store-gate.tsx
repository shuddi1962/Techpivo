"use client"

import { usePathname } from "next/navigation"

/**
 * Hides main-site overlays/trackers inside the TechPivo Market storefront.
 * The market is a standalone store (own header/footer, own analytics), so
 * main-site widgets — popup ads, cookie banner, CMP, page-view tracker —
 * must never mount, fetch, or pop over `/marketplace*` routes.
 */
export function HideOnStorefront({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === "/marketplace" || pathname?.startsWith("/marketplace/")) {
    return null
  }
  return <>{children}</>
}

"use client"

import Link from "next/link"
import { useState } from "react"
import { Heart, Menu, Search, ShoppingBasket, X } from "lucide-react"
import { useMarketCart } from "@/lib/marketplace-cart"

const WISH_KEY = "tp_market_wish_v1"

function readWishCount(): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = window.localStorage.getItem(WISH_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

/**
 * NEW MOBILE HOMEPAGE HEADER — replaces the previous mobile header +
 * mobile search block on the marketplace homepage.
 *
 * Built flush and compact for mobile (md:hidden). Desktop is completely
 * untouched — this component only renders below the 768px breakpoint.
 *
 * Props:
 *   onSearch       — called with the search query on submit
 *   onMenuToggle   — toggles the mobile drawer (wired to MarketplaceHeader's open state)
 *   hideBottomNav  — reserved for future use (kept for signature compatibility)
 */
export function MobileHomeHeader({
  onSearch,
  onMenuToggle,
}: {
  onSearch?: (q: string) => void
  onMenuToggle?: () => void
}) {
  const [query, setQuery] = useState("")
  const [suggestOpen, setSuggestOpen] = useState(false)

  const cartLines = useMarketCart()
  const liveCartCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const liveWishCount = readWishCount()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuggestOpen(false)
    if (onSearch) onSearch(query.trim())
  }

  return (
    <header className="w-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-2 h-14 relative">
        {/* Logo — centered on mobile */}
        <Link href="/marketplace" className="flex items-center shrink-0 self-center" aria-label="TechPivo Market home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/market-logo.svg" alt="TechPivo Market" className="h-10 w-auto" />
        </Link>

        {/* Icons row: Wishlist | Cart | Menu (hamburger) */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/marketplace/wishlist"
            aria-label={`Wishlist${liveWishCount > 0 ? `, ${liveWishCount} saved` : ""}`}
            className="relative flex items-center justify-center rounded-full hover:bg-[#FF6B00]/10 transition-colors h-12 w-12 shrink-0 min-h-[48px] min-w-[48px] p-2"
          >
            <Heart className="h-6 w-6 text-slate-600" />
            {liveWishCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm ring-2 ring-white">
                {liveWishCount}
              </span>
            )}
          </Link>
          <Link
            href="/marketplace/cart"
            aria-label={`Your basket, ${liveCartCount} item${liveCartCount === 1 ? "" : "s"}`}
            className="relative flex items-center justify-center rounded-full hover:bg-[#FF6B00]/10 transition-colors h-12 w-12 shrink-0 min-h-[48px] min-w-[48px] p-2"
          >
            <ShoppingBasket className="h-6 w-6 text-slate-600" />
            {liveCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm ring-2 ring-white tabular-nums">
                {liveCartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Open menu"
            aria-expanded={false}
            className="relative flex items-center justify-center rounded-full hover:bg-[#FF6B00]/10 transition-colors h-12 w-12 shrink-0 min-h-[48px] min-w-[48px] p-2"
          >
            <Menu className="h-6 w-6 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Mobile search — full width, clean, flush under the icon row */}
      <div className="w-full mt-0">
        <form className="flex w-full h-11 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00]/30 m-0" onSubmit={submit} role="search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.trim().length >= 2) setSuggestOpen(true) }}
            className="flex-1 bg-transparent px-4 text-sm text-black placeholder:text-slate-600 focus:outline-none h-full m-0"
            placeholder="Search TechPivo Market..."
          />
          <button type="submit" aria-label="Search" className="bg-[#FF6B00] hover:bg-[#e86000] text-white px-4 flex items-center justify-center transition-all duration-200 rounded-r-xl h-full m-0">
            <Search className="h-6 w-6 shrink-0" />
          </button>
        </form>
      </div>
    </header>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Home, LayoutGrid, Search, ArrowLeftRight, User } from "lucide-react"
import { useMarketCart } from "@/lib/marketplace-cart"
import { useCompareIds } from "@/lib/marketplace-compare"

const BOTTOM_NAV_ITEMS: Array<{
  id: string
  href: string
  label: string
  icon: React.ElementType
  external?: boolean
}> = [
  { id: "home", href: "/marketplace", label: "Home", icon: Home },
  { id: "categories", href: "/marketplace/shop", label: "Categories", icon: LayoutGrid },
  { id: "search", href: "#", label: "Search", icon: Search },
  { id: "compare", href: "/marketplace/compare", label: "Compare", icon: ArrowLeftRight },
  { id: "account", href: "#", label: "Account", icon: User },
]

interface MarketBottomNavProps {
  /** When true, the Search item opens/closes the mobile search panel. */
  onSearchToggle?: () => void
  /** When set, highlights that nav item as active. */
  active?: string
}

export function MarketBottomNav({ onSearchToggle, active }: MarketBottomNavProps) {
  const compareIds = useCompareIds()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (id: string) => {
    if (active) return active === id
    return false
  }

  const handleSearch = (e: React.MouseEvent) => {
    e.preventDefault()
    onSearchToggle?.()
    setDrawerOpen(false)
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[64px] bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-[0_-4px_16px_rgba(15,23,42,0.10)]"
        aria-label="Marketplace bottom navigation"
      >
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-4 py-2 flex items-center justify-between gap-1">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const count = item.id === "compare" ? compareIds.length : 0
            const selected = isActive(item.id)
            const isSearch = item.id === "search"
            return (
              <button
                key={item.id}
                type="button"
                onClick={isSearch ? handleSearch : undefined}
                onKeyDown={(e) => {
                  if (isSearch && e.key === "Enter") handleSearch(e as unknown as React.MouseEvent)
                }}
                role={isSearch ? "button" : undefined}
                aria-label={`${item.label}${selected ? ", active" : ""}${count > 0 ? `, ${count} items` : ""}`}
                aria-expanded={isSearch ? drawerOpen : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 text-xs font-semibold transition-colors min-w-[48px] ${
                  selected
                    ? "text-[#FF6B00]"
                    : "text-slate-600 hover:text-[#FF6B00]"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${
                    selected ? "text-[#FF6B00]" : "text-slate-500 hover:text-[#FF6B00]"
                  }`}
                />
                <span className="leading-none">{item.label}</span>
                {count > 0 && (
                  <span className="absolute top-0 right-0 bg-[#EF4444] text-[8px] font-bold text-white min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 shadow-sm">
                    +{Math.min(count, 9)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind the fixed bottom nav on mobile */}
      <div className="md:hidden h-[64px]" />
    </>
  )
}

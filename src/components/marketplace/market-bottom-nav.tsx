"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, LayoutGrid, Search, ArrowLeftRight, User, ShoppingCart, Heart } from "lucide-react"
import { useMarketCart } from "@/lib/marketplace-cart"
import { useCompareIds } from "@/lib/marketplace-compare"
import { readWishCount } from "@/lib/marketplace-wish"

const BOTTOM_NAV_ITEMS: Array<{
  id: string
  href: string
  label: string
  icon: React.ElementType
  activeHref?: string
}> = [
  { id: "home", href: "/marketplace", label: "Home", icon: Home, activeHref: "/marketplace" },
  { id: "categories", href: "/marketplace/shop", label: "Categories", icon: LayoutGrid, activeHref: "/marketplace/shop" },
  { id: "search", href: "#", label: "Search", icon: Search },
  { id: "compare", href: "/marketplace/compare", label: "Compare", icon: ArrowLeftRight },
  { id: "account", href: "/marketplace/account", label: "Account", icon: User },
]

interface MarketBottomNavProps {
  /** When true, the Search item opens/closes the mobile search panel. */
  onSearchToggle?: () => void
  /** When set, clicking the Categories item opens this callback instead of navigating. */
  onCategoryOpen?: () => void
}

export function MarketBottomNav({ onSearchToggle, onCategoryOpen }: MarketBottomNavProps) {
  const pathname = usePathname()
  const compareIds = useCompareIds()
  const cartLines = useMarketCart()
  const liveCartCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (item: typeof BOTTOM_NAV_ITEMS[number]) => {
    if (item.id === "search") return false
    if (item.activeHref) return pathname === item.activeHref
    return pathname.startsWith(item.href + "/") || pathname === item.href
  }

  const handleSearch = (e: React.MouseEvent) => {
    e.preventDefault()
    onSearchToggle?.()
    setDrawerOpen(false)
  }

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onCategoryOpen?.()
    setDrawerOpen(false)
  }

  const wishCount = readWishCount()

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[76px] bg-white border-t border-[#E2E8F0] shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        aria-label="Marketplace bottom navigation"
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-3 pt-1 flex items-center justify-between gap-1 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const count =
              item.id === "compare"
                ? compareIds.length
                : item.id === "home"
                  ? liveCartCount
                  : item.id === "account"
                    ? wishCount
                    : 0
            const selected = isActive(item)
            const isSearch = item.id === "search"
            const isCategory = item.id === "categories"
            return (
              <button
                key={item.id}
                type="button"
                onClick={
                  isSearch
                    ? handleSearch
                    : isCategory
                    ? handleCategoryClick
                    : undefined
                }
                onKeyDown={(e) => {
                  if (isSearch && e.key === "Enter") handleSearch(e as unknown as React.MouseEvent)
                  if (isCategory && e.key === "Enter") handleCategoryClick(e as unknown as React.MouseEvent)
                }}
                role="button"
                aria-label={`${item.label}${selected ? ", active" : ""}${count > 0 ? `, ${count} items` : ""}`}
                aria-expanded={isSearch ? drawerOpen : undefined}
                aria-current={selected ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold transition-colors min-w-[52px] ${
                  selected
                    ? "text-[#FF6B00]"
                    : "text-slate-500 hover:text-[#FF6B00]"
                }`}
              >
                <item.icon
                  className={`h-6 w-6 ${
                    selected ? "text-[#FF6B00]" : "text-slate-400 hover:text-[#FF6B00]"
                  }`}
                />
                <span className="leading-none">{item.label}</span>
                {count > 0 && (
                  <span className="absolute top-1 right-1 bg-[#EF4444] text-[9px] font-bold text-white min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 shadow-lg z-10">
                    {Math.min(count, 9)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind the fixed bottom nav on mobile */}
      <div className="md:hidden h-[76px]" />
    </>
  )
}

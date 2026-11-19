"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, LayoutGrid, Search, ArrowLeftRight, User, ShoppingCart, Heart } from "lucide-react"
import { useMarketCart } from "@/lib/marketplace-cart"
import { useCompareIds } from "@/lib/marketplace-compare"

const BOTTOM_NAV_ITEMS: Array<{
  id: string
  href: string
  label: string
  icon: React.ElementType
  activeHref?: string
  isAction?: boolean
}> = [
  { id: "home", href: "/marketplace", label: "Home", icon: Home, activeHref: "/marketplace" },
  { id: "categories", href: "/marketplace", label: "Categories", icon: LayoutGrid, isAction: true },
  { id: "search", href: "/marketplace/shop?q=", label: "Search", icon: Search, isAction: true },
  { id: "compare", href: "/marketplace/compare", label: "Compare", icon: ArrowLeftRight },
  { id: "account", href: "/marketplace/account", label: "Account", icon: User },
]

interface MarketBottomNavProps {
  onSearchToggle?: () => void
  onCategoryOpen?: () => void
}

export function MarketBottomNav({ onSearchToggle, onCategoryOpen }: MarketBottomNavProps) {
  const pathname = usePathname()
  const compareIds = useCompareIds()
  const cartLines = useMarketCart()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (item: typeof BOTTOM_NAV_ITEMS[number]) => {
    if (item.id === "search") return isSearchActive
    // Categories: only active on the exact marketplace homepage, not on
    // category detail pages (those are their own section).
    if (item.id === "categories") return pathname === item.activeHref
    if (item.activeHref) return pathname === item.activeHref
    return pathname === item.href
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

  const isSearchActive = pathname.includes("/marketplace") && pathname.includes("q=")

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
                  ? cartLines.reduce((s, l) => s + l.qty, 0)
                  : 0
            const selected = isActive(item)
            const isSearch = item.id === "search"
            const isCategory = item.id === "categories"
            const isAction = item.isAction

            if (isAction) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={isSearch ? handleSearch : handleCategoryClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isSearch) handleSearch(e as unknown as React.MouseEvent)
                      if (isCategory) handleCategoryClick(e as unknown as React.MouseEvent)
                    }
                  }}
                  role="button"
                  aria-label={`${item.label}${selected ? ", active" : ""}${count > 0 ? `, ${count} items` : ""}`}
                  aria-expanded={isSearch ? drawerOpen : undefined}
                  aria-current={selected ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-colors min-w-[52px] ${
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
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-colors min-w-[52px] ${
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
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind the fixed bottom nav on mobile */}
      <div className="md:hidden h-0" />
    </>
  )
}

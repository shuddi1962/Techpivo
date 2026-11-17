"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useMarketCart } from "@/lib/marketplace-cart"
import { cn } from "@/lib/utils"

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
 * Mobile search bar — standalone component rendered between the header
 * and the hero banner on mobile. Renders a full-width search input with
 * an orange Search button flush at the right edge.
 */
export function MobileHomeHeader({
  className,
  onSearch,
}: {
  className?: string
  onSearch?: (q: string) => void
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
    <div className={cn("w-full bg-white mt-0 mb-0 pt-0 pb-0", className)} style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}>
      <div className="rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#F8FAFC]">
        <form className="flex w-full h-11 m-0" onSubmit={submit} role="search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-4 text-sm text-black placeholder:text-slate-600 focus:outline-none h-full m-0"
          placeholder="Search TechPivo Market..."
        />
        <button type="submit" aria-label="Search" className="rounded-none bg-[#FF6B00] hover:bg-[#e86000] text-white px-3 flex items-center justify-center transition-all duration-200 h-full m-0">
          <Search className="h-6 w-6 shrink-0" />
        </button>
      </form>
    </div>
  </div>
  )
}

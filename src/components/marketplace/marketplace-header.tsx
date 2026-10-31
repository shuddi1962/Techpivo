"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Search, Heart, User, ShoppingBasket, Menu, X,   ChevronDown, ChevronRight, ChevronLeft,
  Flame, MapPin, Phone, Mail, Truck, RefreshCcw, Headset, ShieldCheck,
  ArrowLeftRight, LayoutGrid, Cpu, Smartphone, Laptop, Car, Wrench, Monitor,
  Package, Globe, CreditCard, ShoppingCart,
} from "lucide-react"
import { MarketCategorySync, useMarketplaceTree } from "./market-category-store"
import { MARKETPLACE_BRAND } from "@/lib/marketplace"
import type { MarketBanners } from "@/lib/marketplace-banners"
import { cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import { useCompareIds } from "@/lib/marketplace-compare"
import { SuggestDropdown, useRemoteSuggest } from "./search-suggest"
import { MarketCommerce } from "./market-commerce"
import { readMarketCurrency, setMarketCurrency } from "@/lib/marketplace-pricing"
import { MARKET_STORE_DEFAULTS } from "@/lib/marketplace-store"

const NAV: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "Home", href: "/marketplace" },
  { label: "Shop", href: "/marketplace/shop" },
  { label: "Deals of the Day", href: "/marketplace/deals" },
  { label: "Flash Sale Specials", href: "/marketplace/deals/flash-sale" },
  { label: "Best Sellers", href: "/marketplace/best-sellers" },
  { label: "Top Stores", href: "/marketplace/top-stores" },
  { label: "New Arrivals", href: "/marketplace/new-arrivals" },
  { label: "Track Order", href: "/marketplace/track" },
  { label: "Blog", href: "https://techpivo.com/", external: true },
]

const WISH_KEY = "tp_market_wish_v1"

// Live tree icons are stored as lucide name strings; map them to components.
const DEPT_ICONS: Record<string, any> = {
  Cpu, Smartphone, Laptop, Car, Wrench, Monitor, Package, Globe, CreditCard,
  ShoppingCart, Flame, MapPin, Phone, Mail,
}

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

function readCurrency(): string {
  return readMarketCurrency()
}

export function MarketplaceHeader({
  cartCount,
  wishCount,
  onSearch,
  onShopDept,
}: {
  cartCount?: number
  /** Legacy — the header now shows the live item count, never a price. */
  cartTotal?: string
  wishCount?: number
  onSearch?: (q: string) => void
  onShopDept?: (slug: string | null) => void
}) {
  // ├──────────────────────────────────────────────────────────────────────┤
  // │ MarketplaceHeader — 3‑level cascade mega‑menu + mobile drawer       │
  // │                                                                      │
  // │ State:                                                               │
  // │   openDept    — currently highlighted department slug (hover)         │
  // │   openCat     — currently highlighted sub‑category slug (open)        │
  // │   open        — mobile drawer open state                              │
  // │   mobileExpanded — last‑expanded department slug for mobile list      │
  // │   deptOpen    — hover‑intent flag; panels close on outside‑click/Esc   │
  // │   promoBanners — live banners from site_settings (promo + flash)      │
  // │   departments — live tree fetched via useMarketplaceTree               │
  // │                                                                      │
  // │ 3‑level cascade (desktop):                                            │
  // │   L1 — department list (grid, left dept rows with subs, right flash card)   │
  // │   L2 — when a department is open → sub‑category list; each sub column reveals leaves      │
  // │   L3 — when a sub‑category is open → leaf list; back row → parent      │
  // │                                                                      │
  // │ Hover intent (deptOpen): panels stay open while mouse is over them;   │
  // │ outside‑click + Escape reset all three states (openDept/openCat/deptOpen). │
  // │                                                                      │
  // │ Mobile drawer: simple accordion of departments (subs.slice(0,4)).      │
  // │                                                                      │
  // │ Banners: promo_banners from site_settings; when set, the Black Friday │
  // │ promo switch hides promo surfaces publicly (default ON).               │
  // │                                                                      │
  // │ Live cart / wishlist counts are subscribed so badges stay correct      │
  // │ across store pages even when the page doesn't pass cartCount.          │
  // └──────────────────────────────────────────────────────────────────────┤
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [dept, setDept] = useState("")
  const [deptOpen, setDeptOpen] = useState(false)
  const [openDept, setOpenDept] = useState<string | null>(null)
const [openCat, setOpenCat] = useState<string | null>(null)
const [mobileExpanded, setMobileExpanded] = useState("")
const [currency, setCurrency] = useState("USD")
  const [currencyOpen, setCurrencyOpen] = useState(false)
  // Live, admin-editable category tree (falls back to the bundled tree).
  const departments = useMarketplaceTree()
  const deptWrapRef = useRef<HTMLDivElement>(null)
  const currencyWrapRef = useRef<HTMLDivElement>(null)
  // Live AJAX suggestions under both search boxes — product names pop up
  // as you type; Escape / outside click / submit dismisses the panel.
  const { items: suggestItems, loading: suggestLoading } = useRemoteSuggest(query)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const mobileBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (query.trim().length >= 2) setSuggestOpen(true)
    else setSuggestOpen(false)
  }, [query])
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (searchBoxRef.current && !searchBoxRef.current.contains(t) && mobileBoxRef.current && !mobileBoxRef.current.contains(t)) {
        setSuggestOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSuggestOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  // Live cart lines — always subscribed so the badge is correct on every
  // store page even when the page doesn't pass cartCount.
  const liveLines = useMarketCart()
  const liveCount = countLines(liveLines)
  const shownCartCount = cartCount ?? liveCount

  // Live wishlist count (same localStorage key the home grid writes).
  const [liveWish, setLiveWish] = useState(0)
  const compareIds = useCompareIds()
  // Signed-in shopper — same Supabase auth as the general site
  // (profiles.full_name → user_metadata → email prefix, like Header).
  const [acctName, setAcctName] = useState<string | null>(null)
  const [acctAvatar, setAcctAvatar] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!alive || !user) return
        let name: string | null = null
        try {
          const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
          name = (data as { full_name?: string | null } | null)?.full_name || null
        } catch {
          // profile unreadable — fall back to metadata below
        }
        if (!alive) return
        const meta = (user.user_metadata || {}) as Record<string, unknown>
        if (typeof meta.avatar_url === "string" && meta.avatar_url) setAcctAvatar(meta.avatar_url)
        setAcctName(
          name ||
          (typeof meta.full_name === "string" && meta.full_name ? meta.full_name : null) ||
          user.email?.split("@")[0] ||
          "Account"
        )
      } catch {
        // logged out — generic Sign In stays
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  const acctFirst = acctName ? acctName.split(" ")[0] : null
  const [deptCovers, setDeptCovers] = useState<Record<string, string>>({})
  // Admin Black Friday promo switch + promo-bar / flash-sale copy —
  // editable in Admin → Marketplace → Banners (public site_settings
  // read; promo switch hides promo surfaces publicly, default ON).
  const [promoBanners, setPromoBanners] = useState<MarketBanners | null>(null)
  const promoOn = promoBanners?.promo_enabled !== false
  useEffect(() => {
    setLiveWish(readWishCount())
    setCurrency(readCurrency())
    const sync = () => {
      setLiveWish(readWishCount())
      setCurrency(readCurrency())
    }
    window.addEventListener("storage", sync)
    window.addEventListener("focus", sync)
    window.addEventListener("tp-market-currency", sync)
    // Admin-custom storefront banners (public site_settings read): the
    // mega-menu shows the same imagery as the homepage tiles, and the
    // Black Friday promo switch hides promo surfaces publicly.
    ;(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const { parseBanners } = await import("@/lib/marketplace-banners")
        const { data } = await createClient()
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_banners")
          .maybeSingle()
        const b = parseBanners((data as { value?: unknown } | null)?.value)
        if (b.departments) setDeptCovers(b.departments)
        setPromoBanners(b)
      } catch {
        // banners unavailable — built-in photos stay, promo stays on
      }
    })()
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("focus", sync)
      window.removeEventListener("tp-market-currency", sync)
    }
  }, [])
  const shownWishCount = wishCount ?? liveWish

  // Close the departments mega-menu + currency menu on outside click / Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (deptWrapRef.current && !deptWrapRef.current.contains(e.target as Node)) {
        setDeptOpen(false)
        setOpenDept(null)
        setOpenCat(null)
      }
      if (currencyWrapRef.current && !currencyWrapRef.current.contains(e.target as Node)) setCurrencyOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeptOpen(false)
        setOpenDept(null)
        setOpenCat(null)
        setCurrencyOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSuggestOpen(false)
    const q = query.trim()
    if (onSearch) {
      // Homepage: filter the live grid in place.
      onSearch(query)
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (dept) params.set("dept", dept)
      router.replace(params.size > 0 ? `/marketplace?${params.toString()}` : "/marketplace", { scroll: false })
    } else if (dept) {
      // Any other store page: department wins → its category page (with query).
      router.push(q ? `/marketplace/category/${dept}?q=${encodeURIComponent(q)}` : `/marketplace/category/${dept}`)
    } else if (q) {
      // No department picked → homepage live search.
      router.push(`/marketplace?q=${encodeURIComponent(q)}`)
    }
  }

  const pickDept = (slug: string) => {
    setDept(slug)
    if (onShopDept) {
      onShopDept(slug || null)
    } else if (slug) {
      router.push(`/marketplace/category/${slug}`)
    } else {
      router.push("/marketplace")
    }
  }

  const setCurrencyChoice = (code: string) => {
    setCurrency(code)
    setCurrencyOpen(false)
    setMarketCurrency(code === "NGN" ? "NGN" : "USD")
  }

  return (
    <>
      {/* Keeps the department menu in sync with Admin → Categories */}
      <MarketCategorySync />
      <MarketCommerce />
      {/* utility bar — promo copy + colors editable in Admin → Marketplace → Banners */}
      <div className="relative z-[60] w-full bg-white text-slate-800">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 flex items-center justify-between h-10 text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {promoOn ? (
            <>
            <span style={{ background: promoBanners?.promo_badge_bg || "#FF6B00" }} className="text-white px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide shrink-0">
              {promoBanners?.promo_badge_text || "Limited Deal"}
            </span>
            <p className="text-slate-300 hidden sm:block truncate">{promoBanners?.promo_message || "Black Friday Sale! Special offers up to 50% Off at TechPivo Market"}</p>
            <p className="text-slate-300 sm:hidden truncate">{promoBanners?.promo_message_mobile || "Up to 50% Off at TechPivo Market"}</p>
            </>
            ) : (
            <p className="text-slate-300 truncate">Quality-checked tech, tracked delivery</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <div ref={currencyWrapRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setCurrencyOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={currencyOpen}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800"
              >
                {currency} <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {currencyOpen && (
                <div role="listbox" className="absolute right-0 top-full mt-2 w-28 rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-xl z-[70]">
                  {["USD", "NGN"].map((code) => (
                    <button
                      key={code}
                      type="button"
                      role="option"
                      aria-selected={currency === code}
                      onClick={() => setCurrencyChoice(code)}
                      className={`block w-full px-3 py-2 text-left text-xs font-semibold ${currency === code ? "text-[#e86000] bg-[#FF6B00]/10" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="hidden sm:inline text-slate-600">|</span>
            <Link href="/marketplace/track" className="hover:text-slate-800 hidden md:inline">Track Order</Link>
            <span className="hidden md:inline text-slate-600">|</span>
            <Link href="/marketplace/help" className="hover:text-slate-800 hidden md:inline">Help Center</Link>
          </div>
        </div>
      </div>

      {/* sticky main header — logo/search/menu stay visible while scrolling */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {/* main bar — full width */}
      <div className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-4 h-16 md:h-20">
          <Link href="/marketplace" className="flex items-center shrink-0" aria-label="TechPivo Market home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market-logo.svg" alt="TechPivo Market" className="h-10 w-auto sm:h-11" />
          </Link>

          {/* search (desktop) with live AJAX suggestions */}
          <div ref={searchBoxRef} className="hidden md:flex flex-1 max-w-2xl relative">
          <form
            className="flex w-full h-12 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-2 focus-within:ring-[#FF6B00]/20"
            onSubmit={submitSearch}
            role="search"
          >
            <select
              aria-label="Department"
              value={dept}
              onChange={(e) => pickDept(e.target.value)}
              className="bg-transparent px-3 text-sm text-slate-500 border-r border-[#E2E8F0] focus:outline-none cursor-pointer hidden lg:block max-w-[190px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (query.trim().length >= 2) setSuggestOpen(true) }}
              className="flex-1 bg-transparent px-4 text-sm text-[#0A1628] placeholder:text-slate-400 focus:outline-none"
              placeholder="Search TechPivo Market — gadgets, laptops, cameras..."
            />
            <button type="submit" aria-label="Search" className="bg-[#FF6B00] hover:bg-[#e86000] text-[#0A1628] px-5 flex items-center justify-center transition-colors">
              <Search className="h-5 w-5" />
            </button>
          </form>
          {suggestOpen && (
            <SuggestDropdown
              items={suggestItems}
              loading={suggestLoading}
              query={query}
              onPick={() => setSuggestOpen(false)}
              onSubmitAll={() => { setSuggestOpen(false); submitSearch({ preventDefault: () => {} } as React.FormEvent) }}
            />
          )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link href="/marketplace/wishlist" aria-label="Wishlist" className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <Heart className="h-6 w-6 text-slate-600" />
              {shownWishCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FF6B00] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">{shownWishCount}</span>
              )}
            </Link>
            <Link href="/marketplace/compare" aria-label={compareIds.length > 0 ? `Compare ${compareIds.length} products` : "Compare products"} className="relative p-2 rounded-full hover:bg-slate-100 hidden sm:flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-slate-600" />
              {compareIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#0A1628] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">{compareIds.length}</span>
              )}
            </Link>
            <Link href="/marketplace/cart" aria-label={`Your basket, ${shownCartCount} item${shownCartCount === 1 ? "" : "s"}`} className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <ShoppingBasket className="h-6 w-6 text-slate-600" />
              {shownCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FF6B00] text-[#0A1628] text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold tabular-nums">{shownCartCount}</span>
              )}
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden sm:block" />
            <Link href={acctName ? "/marketplace/account" : "/login"} className="hidden sm:flex items-center gap-2 hover:opacity-90 p-1" aria-label={acctName ? `My marketplace account (${acctName})` : "Sign in"}>
              <span className="w-8 h-8 rounded-full bg-[#0A1628] flex items-center justify-center shrink-0 overflow-hidden">
                {acctAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={acctAvatar} alt="" className="h-full w-full object-cover" />
                ) : acctFirst ? (
                  <span className="text-sm font-extrabold text-white">{acctFirst.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </span>
              <span className="hidden xl:flex flex-col text-left max-w-[140px]">
                <span className="text-[11px] text-slate-400 uppercase leading-none">{acctFirst ? `Hi, ${acctFirst}` : "Sign In"}</span>
                <span className="text-sm font-semibold text-[#0A1628] leading-tight truncate">{acctName || "My Account"}</span>
              </span>
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden sm:block" />
            <button
              className="lg:hidden p-2 rounded-lg border border-[#0A1628] bg-[#0A1628] text-white"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile search with live AJAX suggestions */}
        <div className="md:hidden px-4 pb-3">
          <div ref={mobileBoxRef} className="relative">
          <form className="flex h-11 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden" onSubmit={submitSearch} role="search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (query.trim().length >= 2) setSuggestOpen(true) }}
              className="flex-1 bg-transparent px-3 text-sm focus:outline-none"
              placeholder="Search TechPivo Market..."
            />
            <button type="submit" aria-label="Search" className="bg-[#FF6B00] text-[#0A1628] px-4 flex items-center justify-center">
              <Search className="h-5 w-5" />
            </button>
          </form>
          {suggestOpen && (
            <SuggestDropdown
              items={suggestItems}
              loading={suggestLoading}
              query={query}
              onPick={() => setSuggestOpen(false)}
              onSubmitAll={() => { setSuggestOpen(false); submitSearch({ preventDefault: () => {} } as React.FormEvent) }}
            />
          )}
          </div>
        </div>
      </div>

      {/* nav bar — single row, never wraps: horizontal scroll instead of pushing content down */}
      <div className="relative hidden w-full bg-[#0A1628] lg:block">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 hidden lg:flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
          ref={deptWrapRef}
          onMouseEnter={() => setDeptOpen(true)}
          className="relative shrink-0"
            >
            <button
              onClick={() => {
                setDeptOpen(!deptOpen);
                setOpenCat("");
              }}
              onMouseEnter={() => setDeptOpen(true)}
              className="mega-btn text-white h-12 px-6 flex items-center gap-2 font-semibold text-sm transition-colors cursor-pointer"
            >
              <LayoutGrid className="h-5 w-5" />
              <span>All Departments</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${deptOpen ? "rotate-180" : ""}`} />
            </button>
        {deptOpen && (
          <div className="absolute top-full left-0 bg-white rounded-b-xl shadow-2xl z-50 flex animate-slide-down" onMouseEnter={() => setDeptOpen(true)} style={{ width: "1120px" }}>
            <div className="w-full max-w-[calc(100vw-2rem)]">
              <div className="border border-t-0 border-[#E2E8F0] bg-white p-6 lg:p-8 max-h-[82vh] overflow-y-auto">
                <div className="flex flex-col lg:flex-row h-full gap-0">
                  {/* Left: departments sidebar */}
                  <div className="w-[270px] border-r border-[#E2E8F0] flex flex-col shrink-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">All Departments</span>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
                      {departments.map((d) => {
                        const isActive = openDept === d.slug
                        const Icon = DEPT_ICONS[d.icon]
                        return (
                          <div
                            key={d.slug}
                            onMouseEnter={() => { setDeptOpen(true); setOpenDept(d.slug); setOpenCat(null) }}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              isActive
                                ? "bg-[#FFF7F0] text-[#FF6B00]"
                                : "text-slate-600 hover:bg-[#F8FAFC]"
                            }`}
                          >
                            {Icon ? (
                              <span className="flex h-5 w-5 items-center justify-center shrink-0" style={{ color: isActive ? "#FF6B00" : "#cbd5e1" }}>
                                <Icon size={15} />
                              </span>
                            ) : (
                              <span className="h-5 w-5" />
                            )}
                            <span className="text-sm font-medium truncate">{d.name}</span>
                            <ChevronRight size={12} className="text-gray-400 shrink-0" />
                          </div>
                        );
                      })}
                      <div className="px-4 py-3 border-t border-[#E2E8F0]">
                        <button className="w-full flex items-center gap-2 text-xs text-[#FF6B00] font-medium hover:text-[#e86000]">
                          See More + <ChevronRight size={12} className="text-[#FF6B00]" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Right: sub-columns + promo banner */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {openDept ? (
                      (() => {
                        const dNode = departments.find((d) => d.slug === openDept)
                        const subs = dNode?.subs ?? []
                        const sNode = subs.find((s) => s.slug === openCat)
                        const items = sNode?.items ?? []
                        // Group subs into 3 columns
                        const columns = []
                        for (let i = 0; i < subs.length; i += 3) {
                          columns.push(subs.slice(i, i + 3))
                        }
                        return (
                          <div className="flex-1 overflow-y-auto p-4">
                            {openCat ? (
                              // L3 — leaf list under a sub-category
                              <div>
                                <button
                                  type="button"
                                  onClick={() => { setDeptOpen(true); setOpenCat(null) }}
                                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#FF6B00] mb-4"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" /> Back to {dNode?.name}
                                </button>
                                <h4 className="mb-3 text-sm font-bold text-[#0A1628]">{sNode?.name}</h4>
                                <div className="grid grid-cols-1 gap-y-1.5">
                                  {items.map((it) => (
                                    <Link
                                      key={it.slug}
                                      href={`/marketplace/category/${openDept}/${openCat}#leaf-${it.slug}`}
                                      onClick={() => { setDeptOpen(false); setOpenDept(null); setOpenCat(null) }}
                                      className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] hover:bg-[#FFF7F0]"
                                    >
                                      <span>{it.name}</span>
                                      <ChevronRight size={13} className="text-gray-300 shrink-0" />
                                    </Link>
                                  ))}
                                  {items.length === 0 && (
                                    <p className="mt-2 text-sm text-slate-400">No items in this category yet.</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              // L2 — sub-category columns
                              <div className="grid gap-6 lg:grid-cols-3">
                                {columns.map((col, ci) => (
                                  <div key={ci} className="space-y-4">
                                    <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#0A1628]">{col[0]?.name}</h4>
                                    <div className="space-y-1.5">
                                      {col.map((s) => (
                                        <Link
                                          key={s.slug}
                                          href={`/marketplace/category/${openDept}/${s.slug}`}
                                          onMouseEnter={() => { setDeptOpen(true); setOpenCat(s.slug) }}
                                          onMouseLeave={() => { if (openCat === s.slug) setOpenCat(null) }}
                                          className="block rounded border border-transparent px-3 py-2 text-sm text-slate-600 transition-colors hover:border-[#E2E8F0] hover:text-[#FF6B00] hover:bg-[#F8FAFC]"
                                        >
                                          {s.name}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                {/* Promo banner column */}
                                <div className="lg:col-span-3 relative rounded-xl overflow-hidden h-40 flex items-center justify-center group">
                                  {promoBanners?.flash_image && promoOn ? (
                                    <Link
                                      href={promoBanners?.specials_link || "/marketplace#flash-deals"}
                                      className="absolute inset-0 w-full h-full"
                                      onClick={() => { setDeptOpen(false); setOpenDept(null); setOpenCat(null) }}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={promoBanners.flash_image} alt="Flash deals" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">{promoBanners?.flash_title || "Flash Sale Specials"}</span>
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="absolute inset-0 bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                                      <span className="text-sm text-slate-400">Special offers coming soon</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()
                    ) : (
                      // L1 default — nothing selected yet
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center h-full">
                        <div className="h-32 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center mb-4">
                          <span className="text-sm text-slate-400">Hover a department</span>
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Select a department to browse sub-categories</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
            </div>
            <nav className="hidden lg:flex items-center gap-1 min-w-0 flex-1 overflow-x-auto whitespace-nowrap" aria-label="Marketplace" style={{ scrollbarWidth: "none" }}>
              {NAV.map((item, i) => (
                item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener"
                  className="shrink-0 px-3 py-2 rounded-lg text-white/90 hover:text-white text-sm"
                >
                  {item.label}
                </a>
                ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={i === 0 ? "page" : undefined}
                  className={
                    i === 0
                      ? "shrink-0 px-3 py-2 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] font-semibold text-sm"
                      : "shrink-0 px-3 py-2 rounded-lg text-white/80 hover:text-white text-sm"
                  }
                >
                  {item.label}
                </Link>
                )
              ))}
            </nav>
          </div>
          {promoBanners?.specials_enabled !== false && (
          <Link
            href={promoBanners?.specials_link || "/marketplace#flash-deals"}
            className="flex items-center gap-2 bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-[#FF6B00]/20 shrink-0"
          >
            <Flame className="h-4 w-4" />
            <span className="hidden xl:inline">{promoBanners?.specials_label || "Flash Sale Specials"}</span>
            <span className="xl:hidden truncate max-w-[110px]">{promoBanners?.specials_label || "Specials"}</span>
          </Link>
          )}
        </div>

        {/* mobile nav drawer */}
        <div className={`lg:hidden ${open ? "" : "hidden"}`}>
          {open && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}
          <nav
            className="fixed top-0 left-0 z-50 h-full w-[85%] max-w-[360px] overflow-y-auto bg-white shadow-2xl"
            aria-label="Marketplace mobile"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
              <span className="text-sm font-bold text-[#0A1628]">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg border border-[#E2E8F0] text-[#0A1628]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-2 py-3 grid gap-1">
              {NAV.map((item) => (
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>
            <p className="px-4 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Departments</p>
            <div className="px-2 pb-4 grid gap-1">
              {departments.map((d) => {
                const expanded = mobileExpanded === d.slug;
                return (
                  <div key={d.slug}>
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(expanded ? "" : d.slug)}
                      aria-expanded={expanded}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-[#0A1628] hover:bg-slate-100 text-left"
                    >
                      {d.name}
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expanded && (
                      <div className="pl-5 grid">
                        <Link
                          href={`/marketplace/category/${d.slug}`}
                          onClick={() => setOpen(false)}
                          className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FF6B00] hover:bg-slate-100 text-left"
                        >
                          All {d.name}
                        </Link>
                        {d.subs.map((s) => (
                          <Link
                            key={s.slug}
                            href={`/marketplace/category/${s.slug}`}
                            onClick={() => setOpen(false)}
                            className="block px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 text-left"
                          >
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
      </header>
    </>
  )
}

const PERKS = [
  { icon: Truck, title: "Free Shipping", copy: "On all orders over $35" },
  { icon: RefreshCcw, title: "Money Guarantee", copy: "30-day easy returns" },
  { icon: Headset, title: "Online Support 24/7", copy: "Dedicated care team" },
  { icon: ShieldCheck, title: "Secure Payments", copy: "Encrypted checkout" },
]

export function MarketplaceFooter() {
  const [email, setEmail] = useState("")
  const [subMsg, setSubMsg] = useState("")
  const [subBusy, setSubBusy] = useState(false)
  // Live, admin-editable department tree.
  const departments = useMarketplaceTree()
  // Store contact info — editable in Admin → Marketplace → Banners
  // ("Store contact info"), reflected here live.
  const [store, setStore] = useState(MARKET_STORE_DEFAULTS)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const { sanitizeStore } = await import("@/lib/marketplace-store")
        const { data } = await createClient()
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_store")
          .maybeSingle()
        if (alive) setStore(sanitizeStore((data as { value?: unknown } | null)?.value))
      } catch {
        // offline — defaults stay
      }
    }
    load()
    window.addEventListener("focus", load)
    return () => {
      alive = false
      window.removeEventListener("focus", load)
    }
  }, [])
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || subBusy) return
    setSubBusy(true)
    setSubMsg("")
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setSubMsg("You're in — watch your inbox for tech drops.")
        setEmail("")
      } else {
        setSubMsg(data?.error || "Subscription failed. Try again.")
      }
    } catch {
      setSubMsg("Subscription failed. Try again.")
    } finally {
      setSubBusy(false)
    }
  }
  return (
    <footer className="mt-12 w-full">
      {/* perks strip — full width */}
      <div className="w-full border-y border-[#E2E8F0] bg-white">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-5 px-3 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#FF6B00]">
                <p.icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0A1628]">{p.title}</h4>
                <p className="text-sm text-slate-500">{p.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* main footer — formal charcoal */}
      <div className="w-full text-white" style={{ background: `linear-gradient(180deg, ${MARKETPLACE_BRAND.navy} 0%, ${MARKETPLACE_BRAND.navyDeep} 100%)` }}>
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-10 px-3 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-xl bg-white px-2.5 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market-logo.svg" alt="TechPivo Market" className="h-9 w-auto" />
            </span>
          </div>
            <p className="text-sm leading-relaxed text-slate-300">Curated tech products, reviewed by the TechPivo editorial team. Every purchase supports independent tech journalism.</p>
            {store.contact_visible !== false && (
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]" /><span>{store.address}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-[#FF6B00}" /><span>{store.phone}</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-[#FF6B00}" /><span>{store.email}</span></div>
            </div>
            )}
          </div>
          <nav aria-label="Shop departments">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Shop</h5>
            <ul className="grid grid-cols-1 gap-2.5 text-sm text-slate-300">
              {departments.map((d) => (
                <li key={d.slug}><Link className="transition-colors hover:text-[#FF6B00]" href={`/marketplace/category/${d.slug}`}>{d.name}</Link></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Customer service">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Customer Service</h5>
            <ul className="grid grid-cols-1 gap-2.5 text-sm text-slate-300">
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/help">Help Center</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/faq">FAQ</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/track">Order Tracking</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/cart">Your Cart</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/wishlist">Your Wishlist</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/compare">Compare Products</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/marketplace/faq">Returns & Warranty</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link className="transition-colors hover:text-[#FF6B00]" href="/terms-of-use">Terms of Use</Link></li>
              <li><a className="transition-colors hover:text-[#FF6B00]" href="https://techpivo.com/" target="_blank" rel="noopener">Blog</a></li>
            </ul>
          </nav>
          <div>
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Newsletter</h5>
            <p className="mb-3 text-sm text-slate-300">Weekly tech drops and member coupons.</p>
            <form className="space-y-2" onSubmit={subscribe}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none" placeholder="Your email" type="email" aria-label="Email" />
              <button className="w-full rounded-lg bg-[#FF6B00] py-2.5 text-sm font-bold text-[#0A1628] transition-colors hover:bg-[#e86000] disabled:opacity-60" type="submit" disabled={subBusy}>
                {subBusy ? "Subscribing..." : "Subscribe"}
              </button>
              {subMsg && <p className="text-xs text-slate-300">{subMsg}</p>}
            </form>
          </div>
        </div>
      </div>
      {/* bottom bar — full width */}
      <div className="w-full text-white" style={{ background: MARKETPLACE_BRAND.navyDeep }}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-2 px-3 py-5 text-xs sm:flex-row sm:px-6 sm:text-sm lg:px-10">
          <p className="text-slate-400">© {new Date().getFullYear()} TechPivo Market. All rights reserved.</p>
          <p className="text-[11px] leading-relaxed text-slate-500">Quality-checked products · secure payment · tracked delivery on every order.</p>
        </div>
      </div>
    </footer>
  )
}

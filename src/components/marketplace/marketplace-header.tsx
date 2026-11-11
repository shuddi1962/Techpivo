"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Search, Heart, User, ShoppingBasket, Menu, X,   ChevronDown, ChevronRight, ChevronUp,
  Flame, MapPin, Phone, Mail, Truck, RefreshCcw, Headset, ShieldCheck,
  ArrowLeftRight, LayoutGrid, Cpu, Smartphone, Laptop, Car, Wrench, Monitor,
  Package, Globe, CreditCard, ShoppingCart, Home, Trophy, Shirt, Baby, Hammer,
  Book, ShoppingBag, Clock, Sparkles, Star, Gift,
} from "lucide-react"
import { MarketCategorySync, useMarketplaceTree } from "./market-category-store"
import { MarketBottomNav } from "./market-bottom-nav"
import { MARKETPLACE_BRAND } from "@/lib/marketplace"
import type { MarketBanners } from "@/lib/marketplace-banners"
import { useMarketCart } from "@/lib/marketplace-cart"
import { useCompareIds } from "@/lib/marketplace-compare"
import { SuggestDropdown, useRemoteSuggest } from "./search-suggest"
import { MarketCommerce } from "./market-commerce"
import { readMarketCurrency, setMarketCurrency, MARKET_CURRENCIES, type MarketCurrency } from "@/lib/marketplace-pricing"
import { MARKET_STORE_DEFAULTS } from "@/lib/marketplace-store"

const NAV: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "Home", href: "/marketplace" },
  { label: "Shop", href: "/marketplace/shop" },
  { label: "Deals of the Day", href: "/marketplace/deals" },
  { label: "Flash Sale Specials", href: "/marketplace/deals", external: false },
  { label: "Best Sellers", href: "/marketplace/best-sellers" },
  { label: "Top Stores", href: "/marketplace/top-stores" },
  { label: "New Arrivals", href: "/marketplace/new-arrivals" },
  { label: "Track Order", href: "/marketplace/track" },
  { label: "Blog", href: "https://techpivo.com/", external: true },
]

const WISH_KEY = "tp_market_wish_v1"

// Live tree icons are stored as lucide name strings; map them to components.
// One representative icon per department so every major category is visually
// identified. Colours follow the TechPivo Market palette: blue = main,
// red / orange = accent (sale, flash, limited deal).
const DEPT_ICONS: Record<string, any> = {
  Cpu, Smartphone, Laptop, Car, Wrench, Home, Heart, Trophy, Shirt, Baby,
  Hammer, Book, ShoppingBag, Clock, Sparkles, Monitor, Package, Globe,
  CreditCard, ShoppingCart, Flame, MapPin, Phone, Mail,
}

// Name/slug-based icon fallback for departments whose `icon` field isn't set
// in the live database tree. Keys are matched case-insensitively against
// department name then slug. Covers every department in the storefront tree.
const DEPT_ICON_BY_NAME: Record<string, string> = {
  "consumer electronics": "Cpu",
  "electronics": "Cpu",
  "phones": "Smartphone",
  "phone": "Smartphone",
  "mobile": "Smartphone",
  "computer": "Laptop",
  "laptop": "Laptop",
  "automobiles": "Car",
  "motorcycles": "Car",
  "auto": "Car",
  "home improvement": "Wrench",
  "tools": "Wrench",
  "women's clothing": "Shirt",
  "womens clothing": "Shirt",
  "women": "Shirt",
  "men's clothing": "Shirt",
  "mens clothing": "Shirt",
  "men": "Shirt",
  "fashion": "Shirt",
  "clothing": "Shirt",
  "beauty": "Sparkles",
  "health": "Heart",
  "health beauty": "Sparkles",
  "skincare": "Sparkles",
  "makeup": "Sparkles",
  "hair care": "Sparkles",
  "jewelry": "Clock",
  "watches": "Clock",
  "watch": "Clock",
  "sports": "Trophy",
  "outdoors": "Trophy",
  "sports & outdoors": "Trophy",
  "home & garden": "Home",
  "home garden": "Home",
  "home": "Home",
  "garden": "Home",
  "furniture": "Home",
  "pet supplies": "Package",
  "pet": "Package",
  "baby": "Baby",
  "kids": "Baby",
  "toys": "Baby",
  "toys kids": "Baby",
  "bags": "ShoppingBag",
  "luggage": "ShoppingBag",
  "handbags": "ShoppingBag",
  "shoes": "ShoppingBag",
  "footwear": "ShoppingBag",
  "books": "Book",
  "media": "Book",
}

// Resolve an icon component for a department: tries `d.icon` field first,
// then name-based fallback (substring match against department name/slug),
// then undefined (no icon).
function resolveDeptIcon(d: { icon?: string | null; name: string; slug: string }) {
  if (d.icon && DEPT_ICONS[d.icon]) return DEPT_ICONS[d.icon]
  const nameKey = d.name.toLowerCase()
  const slugKey = d.slug.toLowerCase()
  for (const key of Object.keys(DEPT_ICON_BY_NAME)) {
    if (nameKey.includes(key) || slugKey.includes(key)) {
      const iconName = DEPT_ICON_BY_NAME[key]
      if (iconName && DEPT_ICONS[iconName]) return DEPT_ICONS[iconName]
    }
  }
  return undefined
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

function readCurrency(): MarketCurrency {
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
const [mobileExpanded, setMobileExpanded] = useState("")
const [seeMore, setSeeMore] = useState(false)
const [currency, setCurrency] = useState<MarketCurrency>(readMarketCurrency())
const [promoBarDismissed, setPromoBarDismissed] = useState(false)
const [currencyOpen, setCurrencyOpen] = useState(false)
const [showBackToTop, setShowBackToTop] = useState(false)
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
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
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

  // Cart badge — always derived from the live cart so it never shows stale
  // items (e.g. after the last item is removed the badge goes to zero).
  // The `cartCount` prop is intentionally ignored: it can be stale when
  // passed from a parent render, while the live cart always reflects the
  // current contents (including removals).
  const cartLines = useMarketCart()
  const liveCartCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const shownCartCount = liveCartCount

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
  // Mega menu colours — driven by Admin → Marketplace → Banners ("Mega menu
  // colours"). menu_bg colours the nav bar trigger + mega panel border /
  // active row; menu_text colours nav links / buttons. Falls back to the
  // kit defaults (#1453D6 / #ffffff) when unset. Saved values reflect on the
  // storefront instantly because promoBanners refetches on focus / storage.
  const menuBg = (promoBanners?.menu_bg || "#1453D6");
  const menuText = (promoBanners?.menu_text || "#ffffff");
  const menuBgHover = menuBg === "#1453D6" ? "#0B3A9A" : menuBg;
  const isPrimary = menuBg === "#1453D6";
  const navLinkActive = isPrimary ? "hover:bg-[#EFF6FF] hover:text-[#1453D6]" : "hover:bg-[" + menuBg + "]/10 hover:text-[" + menuBg + "]";
  const navLinkCls = "px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 transition-colors " + navLinkActive;
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
      }
      if (currencyWrapRef.current && !currencyWrapRef.current.contains(e.target as Node)) setCurrencyOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeptOpen(false)
        setOpenDept(null)
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

  // Back-to-top button visibility
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const setCurrencyChoice = (code: string) => {
    setCurrency(code as MarketCurrency)
    setCurrencyOpen(false)
    setMarketCurrency(code as MarketCurrency)
  }

  const CURRENCY_LABEL: Record<string, string> = {
    USD: "US Dollar", NGN: "Nigerian Naira", EUR: "Euro", GBP: "British Pound",
    GHS: "Ghanaian Cedi", KES: "Kenyan Shilling", ZAR: "South African Rand",
    CAD: "Canadian Dollar", AUD: "Australian Dollar", INR: "Indian Rupee",
    JPY: "Japanese Yen", AED: "UAE Dirham",
  }

  const VISIBLE_DEPT_COUNT = 6
  const visibleDepartments = departments.slice(0, seeMore ? departments.length : VISIBLE_DEPT_COUNT)
  const toggleSeeMore = () => setSeeMore((v) => !v)

  // Default to Women's Clothing when the mega-panel opens so shoppers see
  // a populated sub-category panel immediately instead of an empty state.
  const womenDept = departments.find((d) => d.slug === "womens-clothing" || d.name.toLowerCase().includes("women"))
  const firstDeptSlug = womenDept ? womenDept.slug : (departments.length > 0 ? departments[0].slug : "")

  return (
    <>
      {/* Keeps the department menu in sync with Admin → Categories */}
      <MarketCategorySync />
      <MarketCommerce />
      {/* utility bar — blue Limited Deal / Black Friday banner, dismissable */}
      {!promoBarDismissed && (
      <div className="marketplace-promo-bar relative z-[60] w-full text-white shadow-lg border-b border-white/25" style={{ backgroundImage: `linear-gradient(90deg, ${promoBanners?.promo_bar_from || "#1668DC"}, ${promoBanners?.promo_bar_to || "#0F4FB3"})` }}>
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 flex items-center justify-between h-12 text-[11px] sm:text-xs gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="marketplace-badge-pill shrink-0" style={{ backgroundColor: promoBanners?.promo_badge_bg || "#FF3B30" }}>
              <span className="mp-dot" aria-hidden="true" />
              {promoBanners?.promo_badge_text || "Limited Deal"}
            </span>
            <p className="marketplace-promo-text text-white/95 hidden sm:block truncate">{promoBanners?.promo_message || "Black Friday Sale! Special offers up to 50% Off at TechPivo Market"}</p>
            <p className="marketplace-promo-text-mobile text-white/90 sm:hidden truncate">{promoBanners?.promo_message_mobile || "Up to 50% Off at TechPivo Market"}</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 text-white/90">
              <div ref={currencyWrapRef} className="relative z-[50] group">
                <button
                  type="button"
                  onClick={() => setCurrencyOpen((o) => !o)}
                  aria-label="Switch currency"
                  aria-expanded={currencyOpen}
                  className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg px-3 py-1.5 text-white font-bold border border-white/20 bg-white/10 hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none shadow-sm backdrop-blur-sm"
                >
                  <span className="text-xs">{currency}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white" />
                </button>
                {currencyOpen && (
                  <div role="listbox" className="fixed top-[44px] left-0 z-[9999] w-48 rounded-xl border border-[#E2E8F0] bg-white py-2 shadow-2xl">
                    {MARKET_CURRENCIES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        role="option"
                        aria-selected={currency === code}
                        onClick={() => setCurrencyChoice(code)}
                        className={`block w-full px-3 py-2 text-left text-sm font-semibold transition-colors ${currency === code ? "text-[#FF6B00] bg-[#FFF1F2] border-r-2 border-[#FF6B00]" : "text-slate-800 hover:bg-[#FFF1F2] hover:text-[#FF6B00]"}`}
                      >
                        <span className="font-medium">{code}</span>
                        <span className="ml-2 text-xs text-slate-400">{CURRENCY_LABEL[code]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            <span className="hidden sm:inline text-white/50">|</span>
            <Link
              href="/marketplace/track"
              className="hover:text-white hidden md:inline transition-colors"
            >
              Track Order
            </Link>
            <span className="hidden md:inline text-white/50">|</span>
            <Link
              href="/marketplace/help"
              className="hover:text-white hidden md:inline transition-colors"
            >
              Help Center
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setPromoBarDismissed(true)}
            aria-label="Dismiss offer banner"
            className="p-1.5 hover:bg-white/20 rounded-full"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
      )}

      {/* sticky main header — logo/search/menu stay visible while scrolling */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {/* main bar — full width */}
      <div className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-2 h-14 sm:h-16 md:h-20">
          {/* Hamburger menu — first on mobile */}
          <button
            className="md:hidden p-2 rounded-lg border border-[#1668DC] bg-[#1668DC] text-white shadow-md hover:bg-[#0F4FB3] transition-all duration-200"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo — centered on mobile */}
          <Link href="/marketplace" className="flex items-center shrink-0" aria-label="TechPivo Market home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market-logo.svg" alt="TechPivo Market" className="h-10 w-auto sm:h-11" />
          </Link>

          {/* Mobile icons: Wishlist + Cart */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 md:hidden">
            <Link href="/marketplace/wishlist" aria-label="Wishlist" className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <Heart className="h-5 w-5 text-slate-600" />
              {shownWishCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm">{shownWishCount}</span>
              )}
            </Link>
            <Link href="/marketplace/cart" aria-label={`Your basket, ${shownCartCount} item${shownCartCount === 1 ? "" : "s"}`} className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <ShoppingBasket className="h-5 w-5 text-slate-600" />
              {shownCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm tabular-nums">{shownCartCount}</span>
              )}
            </Link>
          </div>

          {/* Desktop search (hidden on mobile) */}
          <div ref={searchBoxRef} className="hidden md:flex flex-1 max-w-2xl relative">
          <form
            className="flex w-full h-12 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden focus-within:border-[#1668DC] focus-within:ring-2 focus-within:ring-[#1668DC]/20"
            onSubmit={submitSearch}
            role="search"
          >
            <select
              aria-label="Department"
              value={dept}
              onChange={(e) => pickDept(e.target.value)}
              className="bg-transparent px-3 text-sm text-black border-r border-[#E2E8F0] focus:outline-none cursor-pointer hidden lg:block max-w-[190px]"
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
              className="flex-1 bg-transparent px-4 text-sm text-black placeholder:text-slate-600 focus:outline-none"
              placeholder="Search TechPivo Market — gadgets, laptops, cameras..."
            />
            <button type="submit" aria-label="Search" className={`bg-[${menuBg}] hover:opacity-90 text-[${menuText}] px-5 flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg rounded-r-xl`}>
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

          {/* Desktop icons row — wishlist, compare, cart, account */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/marketplace/wishlist" aria-label="Wishlist" className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <Heart className="h-6 w-6 text-slate-600" />
              {shownWishCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm">{shownWishCount}</span>
              )}
            </Link>
            <Link href="/marketplace/compare" aria-label={compareIds.length > 0 ? `Compare ${compareIds.length} products` : "Compare products"} className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-slate-600" />
              {compareIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm">{compareIds.length}</span>
              )}
            </Link>
            <Link href="/marketplace/cart" aria-label={`Your basket, ${shownCartCount} item${shownCartCount === 1 ? "" : "s"}`} className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <ShoppingBasket className="h-6 w-6 text-slate-600" />
              {shownCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm tabular-nums">{shownCartCount}</span>
              )}
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0]" />
            <Link href={acctName ? "/marketplace/account" : "/login"} className="hidden xl:flex items-center gap-2 hover:opacity-90 p-1" aria-label={acctName ? `My marketplace account (${acctName})` : "Sign in"}>
              <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-[#E2E8F0]">
                {acctAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={acctAvatar} alt="" className="h-full w-full object-cover" />
                ) : acctFirst ? (
                  <span className="text-sm font-extrabold text-black">{acctFirst.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="h-4 w-4 text-black" />
                )}
              </span>
              <span className="hidden xl:flex flex-col text-left max-w-[140px]">
                <span className="text-[11px] text-black uppercase leading-none">{acctFirst ? `Hi, ${acctFirst}` : "Sign In"}</span>
                <span className="text-sm font-semibold text-black leading-tight truncate">{acctName || "My Account"}</span>
              </span>
            </Link>
          </div>
        </div>

        {/* mobile search with live AJAX suggestions — full width, clean */}
        <div className="md:hidden px-4 pb-4">
          <div ref={mobileBoxRef} className="relative w-full">
          <form className="flex h-11 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden" onSubmit={submitSearch} role="search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (query.trim().length >= 2) setSuggestOpen(true) }}
              ref={mobileSearchInputRef}
              className="flex-1 bg-transparent px-4 text-sm text-black placeholder:text-slate-600 focus:outline-none"
              placeholder="Search TechPivo Market..."
            />
            <button type="submit" aria-label="Search" className={`bg-[${menuBg}] hover:opacity-90 text-[${menuText}] px-4 flex items-center justify-center transition-all duration-200 shadow-md hover:bg-[${menuBg}] hover:shadow-lg rounded-r-xl`}>
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
      <div className="relative hidden w-full border-b border-[#E2E8F0] shadow-sm md:block bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 hidden md:flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
          ref={deptWrapRef}
          onMouseEnter={() => setDeptOpen(true)}
          onMouseLeave={() => setDeptOpen(false)}
          className="relative shrink-0"
            >
              <button
                onClick={() => {
                  setDeptOpen(!deptOpen);
                }}
                onMouseEnter={() => setDeptOpen(true)}
                className="mega-btn text-white h-10 px-4 flex items-center gap-2 font-semibold text-sm cursor-pointer bg-[#FF6B00] rounded-xl hover:bg-[#e86000] transition-colors"
              >
                <LayoutGrid className="h-4 w-4 text-white" />
                <span>All Departments</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${deptOpen ? "rotate-180" : ""} text-white`} />
              </button>
        {deptOpen && (
          <div
            className="absolute top-full left-0 border-t-2 rounded-b-2xl shadow-2xl z-50 flex animate-slide-down"
            onMouseEnter={() => {
              setDeptOpen(true)
              if (!openDept && firstDeptSlug) setOpenDept(firstDeptSlug)
            }}
            style={{ width: "1120px", borderTopColor: menuBg }}
          >
            <div className="w-full max-w-[calc(100vw-2rem)]">
              <div className="border border-t-0 border-[#E2E8F0] bg-white p-6 lg:p-8 max-h-[86vh] overflow-y-auto">
                <div className="flex flex-col lg:flex-row h-full gap-0">
                  {/* Left: departments */}
                  <div className="w-[280px] border-r border-[#E2E8F0] flex flex-col shrink-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2">
                        <LayoutGrid
                          className={
                            "h-4 w-4" +
                            (menuBg === "#1453D6" ? " text-[#FF6B00]" : " text-[" + menuText + "]")
                          }
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">All Departments</span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleSeeMore}
                        className={
                          "text-xs font-medium underline-offset-4 hover:underline" +
                          (menuBg === "#1453D6" ? " text-[#FF6B00]" : " text-[" + menuText + "]")
                        }
                      >
                        {seeMore ? "See Less" : "See More"}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
                      {visibleDepartments.map((d) => {
                          const isActive = openDept === d.slug
                          const Icon = resolveDeptIcon(d)
                          return (
                            <div
                              key={d.slug}
                              onMouseEnter={() => { setDeptOpen(true); setOpenDept(d.slug) }}
                            className={
                              "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-150" +
                              (isActive
                                ? " text-[" + menuText + "] bg-[" + menuBg + "] border border-[" + menuBg + "]/50 rounded-xl"
                                : " text-slate-700 border border-transparent rounded-xl")
                            }
                          >
                              {Icon ? (
                                <span className="flex items-center gap-2 px-1" style={{ color: isActive ? menuBg : "#94a3b8" }}>
                                  <Icon
                                    size={13}
                                    className={
                                      isActive ? "text-[" + menuBg + "]" : "text-slate-400"
                                    }
                                  />
                                </span>
                              ) : null}
                              <span className="text-sm font-semibold truncate leading-none">{d.name}</span>
                              <ChevronRight
                                size={10}
                                className={isActive ? "text-[" + menuBg + "]" : "text-slate-400"}
                              />
                            </div>
                          )
                      })}
                      {!seeMore && departments.length > VISIBLE_DEPT_COUNT && (
                        <div className="px-4 py-3 border-t border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={toggleSeeMore}
                          className="w-full flex items-center justify-between text-xs font-medium text-[#1668DC] underline-offset-4 hover:underline"
                        >
                          <span>See more departments</span>
                            <ChevronDown className="h-4 w-4 text-[#1668DC]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Right: all sub-categories + items of the hovered department — single level, no drill-down */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {openDept ? (
                      (() => {
                        const dNode = departments.find((d) => d.slug === openDept)
                        const subs = dNode?.subs ?? []
                        const totalItems = subs.reduce((n, s) => n + s.items.length, 0)
                        const Icon = dNode ? DEPT_ICONS[dNode.icon] : undefined
                        return (
                          <div className="flex-1 overflow-y-auto p-4">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#FF3B30] shadow-sm border border-[#FF3B30]/20">
                                {Icon ? <Icon size={22} /> : <ChevronRight size={16} className="text-slate-400" />}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-[#111827] leading-none">{dNode?.name}</h3>
                                <p className="text-[11px] text-slate-400 leading-none">
                                  {subs.length} category{subs.length !== 1 ? "s" : ""} · {totalItems} item{totalItems !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                              <div className="grid gap-3 lg:grid-cols-3">
                               {subs.map((s) => (
                                <div key={s.slug} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/25 p-3 hover:bg-[#FFF1F2] hover:border-[#FF3B30]/60 transition-all duration-150 group">
                                  <Link
                                    href={`/marketplace/category/${s.slug}`}
                                    className="block mb-1.5 text-sm font-bold text-[#111827] hover:text-[#FF3B30] leading-none transition-colors"
                                  >
                                    {s.name}
                                   </Link>
                                   <div className="flex flex-wrap gap-1">
                                     {s.items.map((it) => (
                                       <Link
                                         key={it.slug}
                                         href={`/marketplace/category/${openDept}/${s.slug}#leaf-${it.slug}`}
                                         className="inline-block rounded border border-transparent px-2 py-1 text-[11px] text-[#111827] font-medium whitespace-nowrap hover:bg-[#FF3B30]/12 hover:text-[#FF3B30] hover:border-[#FF3B30]/40 transition-all duration-150"
                                       >
                                        {it.name}
                                      </Link>
                                     ))}
                                     {s.items.length === 0 && (
                                       <p className="text-[10px] text-slate-400 italic">No items yet</p>
                                     )}
                                   </div>
                                </div>
                              ))}
                              {subs.length === 0 && (
                                <div className="col-span-3 py-8 text-center">
                                  <p className="text-sm text-slate-400">No sub-categories yet.</p>
                                </div>
                              )}
                            </div>
                             <div className="mt-6 relative rounded-xl overflow-hidden h-44 flex items-center justify-center group border border-[#E2E8F0] bg-[#F8FAFC]">
                               {promoBanners?.flash_image && promoOn ? (
                                 <Link
                                   href={promoBanners?.specials_link || "/marketplace#flash-deals"}
                                   className="absolute inset-0 w-full h-full"
                                   onClick={() => { setDeptOpen(false); setOpenDept(null) }}
                                 >
                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                   <img src={promoBanners.flash_image} alt="Flash deals" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                   <div className="absolute inset-0 bg-gradient-to-t from-[#FF3B30]/85 via-[#E53935]/45 to-transparent flex items-center justify-center">
                                     <div className="flex items-center gap-2">
                                       <Flame className="h-5 w-5 text-white" />
                                       <span className="text-white font-bold text-lg">{promoBanners?.flash_title || "Flash Sale Specials"}</span>
                                     </div>
                                   </div>
                                 </Link>
                               ) : (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                   <span className="text-sm text-slate-400">Special offers coming soon</span>
                                 </div>
                               )}
                             </div>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center h-full">
                        <div className="h-36 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center mb-4">
                          <span className="text-sm text-slate-400">Browse departments</span>
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Select a department above</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
            </div>

            {/* Top-level navigation links — Home, Shop, Deals, etc. */}
            {NAV.filter((item) => item.label !== "Flash Sale Specials").map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener" : undefined}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-[#EFF6FF] hover:text-[#FF6B00] transition-colors whitespace-nowrap shrink-0"
              >
                {item.label}
              </Link>
            ))}
          </div>
          {promoBanners?.specials_enabled !== false && (
            <Link
              href={promoBanners?.specials_link || "/marketplace#flash-deals"}
              className="flex items-center gap-2 bg-[#FFF1F2] text-[#FF3B30] border border-[#FF3B30]/40 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-[#FF3B30]/20 shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Flame className="h-4 w-4 text-[#FF3B30]" />
              <span className="hidden xl:inline">{promoBanners?.specials_label || "Flash Sale Specials"}</span>
              <span className="xl:hidden truncate max-w-[110px]">{promoBanners?.specials_label || "Specials"}</span>
            </Link>
          )}
        </div>

        {/* mobile nav drawer — slides in from the left on mobile */}
        <div className="md:hidden">
          {open && (
            <div
              className="fixed inset-0 z-40 bg-[#0B3A9A]/45 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}
          <nav
            className={`fixed top-0 left-0 z-50 h-full w-[85%] max-w-[360px] overflow-y-auto bg-white shadow-2xl transform transition-transform duration-300 ${open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}`}
            aria-label="Marketplace mobile"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
              <span className={"text-sm font-bold " + (isPrimary ? "text-[#1453D6]" : "text-[" + menuBg + "]")}>
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={"p-2 rounded-lg border " + (isPrimary ? "border-[#1453D6]/20 text-[#1453D6] bg-[#EFF6FF]/40" : "border-[" + menuBg + "]/20 text-[" + menuBg + "] bg-[" + menuBg + "]/10")}
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
                    className={"px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 transition-colors " + (isPrimary ? "hover:bg-[#EFF6FF] hover:text-[#1453D6]" : "hover:bg-[" + menuBg + "]/10 hover:text-[" + menuBg + "]")}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={navLinkCls}
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
                const Icon = resolveDeptIcon(d);
                const isPrimary = menuBg === "#1453D6";
                const btnBase = "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors";
                const btnActive = isPrimary ? "text-[#1453D6] hover:bg-[#1453D6]/10 hover:text-[#0B3A9A]" : "text-[" + menuBg + "] hover:bg-[" + menuBg + "]/10 hover:text-[" + menuBgHover + "]";
                const btnCls = btnBase + " " + btnActive;
                const linkActive = isPrimary ? "text-[#1453D6] hover:bg-[#1453D6]/10 hover:text-[#0B3A9A]" : "text-[" + menuBg + "] hover:bg-[" + menuBg + "]/10 hover:text-[" + menuBgHover + "]";
                const linkCls = "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors " + linkActive;
                return (
                  <div key={d.slug}>
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(expanded ? "" : d.slug)}
                      aria-expanded={expanded}
                      className={btnCls}
                    >
                      {Icon && (
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#F8FAFC] text-slate-500 shrink-0">
                          <Icon size={14} />
                        </span>
                      )}
                      {d.name}
                      <ChevronDown
                        className={"h-4 w-4 text-slate-400 transition-transform " + (expanded ? "rotate-180" : "")}
                      />
                    </button>
                    {expanded && (
                      <div className="pl-4 space-y-0.5">
                        <Link
                          href={"/marketplace/category/" + d.slug}
                          onClick={() => setOpen(false)}
                          className={linkCls}
                        >
                          <span className="w-5 h-5 shrink-0 opacity-50">
                            <Package size={12} />
                          </span>
                          All {d.name}
                        </Link>
                        {d.subs.map((s) => (
                            <Link
                              key={s.slug}
                              href={"/marketplace/category/" + s.slug}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#111827] hover:bg-[#FFF1F2] hover:text-[#FF3B30] text-left transition-colors"
                            >
                            <span className="w-5 h-5 shrink-0 opacity-40">
                              <LayoutGrid size={12} />
                            </span>
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

      {/* sticky bottom mobile nav — shared across all marketplace pages */}
      <MarketBottomNav
        onSearchToggle={() => {
          setOpen(false)
          mobileSearchInputRef.current?.focus()
          setSuggestOpen(false)
        }}
      />

      {/* Back-to-top button — mobile/tablet only, sits above bottom nav */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="md:hidden fixed bottom-[24px] right-[4px] z-40 w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center shadow-lg transition-all hover:bg-[#FF6B00] active:scale-95"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
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
    <footer className="mt-12 w-full overflow-x-hidden">
      {/* perks strip — full width */}
      <div className="w-full border-y border-[#E2E8F0] bg-white">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-5 px-3 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
          {PERKS.map((p) => (
              <div key={p.title} className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#EF4444] bg-white text-[#EF4444]">
                  <p.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">{p.title}</h4>
                  <p className="text-[11px] text-[#0F172A]">{p.copy}</p>
                </div>
              </div>
          ))}
        </div>
      </div>
      {/* main footer — formal charcoal */}
      <div className="w-full text-white" style={{ background: "linear-gradient(180deg, " + MARKETPLACE_BRAND.navy + " 0%, " + MARKETPLACE_BRAND.navyDeep + " 100%)" }}>
        <div className="mx-auto w-full max-w-[1440px] grid grid-cols-1 gap-8 px-3 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {/* Column 1: Logo + description + contact */}
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
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1668DC]" /><span className="max-w-[calc(100vw-3rem)] truncate">{store.address}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-[#1668DC]" /><span>{store.phone}</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-[#1668DC]" /><span>{store.email}</span></div>
            </div>
            )}
          </div>
          {/* Column 2: Shop departments — always visible */}
          <div className="space-y-4 lg:col-span-1">
            <h5 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Shop</h5>
            <ul className="grid grid-cols-1 gap-2 text-sm text-slate-300">
              {departments.map((d) => (
                <li key={d.slug}><Link className="transition-colors hover:text-[#1668DC]" href={"/marketplace/category/" + d.slug}>{d.name}</Link></li>
              ))}
            </ul>
          </div>
          {/* Column 3: Customer service — always visible */}
          <div className="space-y-4 lg:col-span-1">
            <h5 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Customer Service</h5>
            <ul className="grid grid-cols-1 gap-2 text-sm text-slate-300">
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/help">Help Center</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/faq">FAQ</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/track">Order Tracking</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/cart">Your Cart</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/wishlist">Your Wishlist</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/compare">Compare Products</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/marketplace/faq">Returns & Warranty</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link className="transition-colors hover:text-[#1668DC]" href="/terms-of-use">Terms of Use</Link></li>
              <li><a className="transition-colors hover:text-[#1668DC]" href="https://techpivo.com/" target="_blank" rel="noopener">Blog</a></li>
            </ul>
          </div>
          {/* Column 4: Newsletter — premium */}
          <div className="space-y-4 lg:col-span-1">
            <h5 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Newsletter</h5>
            <p className="mb-3 text-sm text-white/90">Weekly tech drops and member coupons.</p>
            <form className="space-y-2" onSubmit={subscribe}>
              <div className="relative">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-[#1668DC] focus:outline-none focus:ring-1 focus:ring-[#1668DC]" placeholder="Your email" type="email" aria-label="Email" />
                <button className="absolute right-1 top-1 rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#DC2626] disabled:opacity-60" type="submit" disabled={subBusy}>
                  {subBusy ? "Subscribing..." : "Subscribe"}
                </button>
              </div>
              {subMsg && <p className="text-sm text-slate-300">{subMsg}</p>}
            </form>
          </div>
        </div>
      </div>
      {/* bottom bar — full width */}
      <div className="w-full text-white" style={{ background: MARKETPLACE_BRAND.navyDeep }}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-3 px-3 py-5 text-sm sm:flex-row sm:px-6 sm:text-base lg:px-10">
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} TechPivo Market. All rights reserved.</p>
          <p className="text-sm leading-relaxed text-slate-500 text-center sm:text-left">Quality-checked products · secure payment · tracked delivery on every order.</p>
        </div>
      </div>
    </footer>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Search, Heart, User, ShoppingBag, Menu, X, ChevronDown,
  Flame, MapPin, Phone, Mail, Truck, RefreshCcw, Headset, ShieldCheck,
} from "lucide-react"
import { MARKET_DEPARTMENTS as DEPARTMENTS } from "@/lib/marketplace-categories"
import { MARKETPLACE_BRAND } from "@/lib/marketplace"
import { cartCount as countLines, useMarketCart } from "@/lib/marketplace-cart"
import { SuggestDropdown, useRemoteSuggest } from "./search-suggest"

const NAV: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/marketplace" },
  { label: "Shop", href: "/marketplace/shop" },
  { label: "Deals of the Day", href: "/marketplace/deals" },
  { label: "Best Sellers", href: "/marketplace/best-sellers" },
  { label: "Top Stores", href: "/marketplace/top-stores" },
  { label: "New Arrivals", href: "/marketplace/new-arrivals" },
  { label: "Track Order", href: "/marketplace/track" },
]

const WISH_KEY = "tp_market_wish_v1"
const CURRENCY_KEY = "tp_market_currency_v1"

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
  if (typeof window === "undefined") return "USD"
  try {
    return window.localStorage.getItem(CURRENCY_KEY) || "USD"
  } catch {
    return "USD"
  }
}

export function MarketplaceHeader({
  cartCount,
  cartTotal,
  wishCount,
  onSearch,
  onShopDept,
}: {
  cartCount?: number
  cartTotal?: string
  wishCount?: number
  onSearch?: (q: string) => void
  onShopDept?: (slug: string | null) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [dept, setDept] = useState("")
  const [deptOpen, setDeptOpen] = useState(false)
  const [currency, setCurrency] = useState("USD")
  const [currencyOpen, setCurrencyOpen] = useState(false)
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
  // store page even when the page doesn't pass cartCount/cartTotal props.
  const liveLines = useMarketCart()
  const liveCount = countLines(liveLines)
  const shownCartCount = cartCount ?? liveCount
  const shownCartTotal =
    cartTotal ?? (liveCount === 0 ? "$0.00" : `${liveCount} item${liveCount === 1 ? "" : "s"}`)

  // Live wishlist count (same localStorage key the home grid writes).
  const [liveWish, setLiveWish] = useState(0)
  const [deptCovers, setDeptCovers] = useState<Record<string, string>>({})
  useEffect(() => {
    setLiveWish(readWishCount())
    setCurrency(readCurrency())
    const sync = () => {
      setLiveWish(readWishCount())
      setCurrency(readCurrency())
    }
    window.addEventListener("storage", sync)
    window.addEventListener("focus", sync)
    // Admin-custom department banners (public site_settings read) so the
    // mega-menu shows the same imagery as the homepage tiles.
    ;(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const { data } = await createClient()
          .from("site_settings")
          .select("value")
          .eq("key", "marketplace_banners")
          .maybeSingle()
        const v = (data as { value?: unknown } | null)?.value as { departments?: Record<string, string> } | null
        if (v?.departments) setDeptCovers(v.departments)
      } catch {
        // banners unavailable — built-in photos stay
      }
    })()
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])
  const shownWishCount = wishCount ?? liveWish

  // Close the departments mega-menu + currency menu on outside click / Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (deptWrapRef.current && !deptWrapRef.current.contains(e.target as Node)) setDeptOpen(false)
      if (currencyWrapRef.current && !currencyWrapRef.current.contains(e.target as Node)) setCurrencyOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeptOpen(false)
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
    try {
      window.localStorage.setItem(CURRENCY_KEY, code)
    } catch {
      // storage blocked — header still shows the picked currency
    }
    window.dispatchEvent(new Event("tp-market-currency"))
  }

  return (
    <>
      {/* utility bar — static, scrolls away with the page */}
      <div style={{ background: `linear-gradient(90deg, ${MARKETPLACE_BRAND.topbar} 0%, ${MARKETPLACE_BRAND.topbarSoft} 100%)` }} className="relative z-[60] w-full text-white">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 flex items-center justify-between h-10 text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-[#EF4444] text-white px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide shrink-0">
              Limited Deal
            </span>
            <p className="text-slate-300 hidden sm:block truncate">Black Friday Sale! Special offers up to 50% Off at TechPivo Market</p>
            <p className="text-slate-300 sm:hidden truncate">Up to 50% Off at TechPivo Market</p>
          </div>
          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <div ref={currencyWrapRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setCurrencyOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={currencyOpen}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
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
                      className={`block w-full px-3 py-2 text-left text-xs font-semibold ${currency === code ? "text-[#B45309] bg-amber-50" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="hidden sm:inline text-slate-600">|</span>
            <Link href="/marketplace/track" className="hover:text-white hidden md:inline">Track Order</Link>
            <span className="hidden md:inline text-slate-600">|</span>
            <Link href="/contact" className="hover:text-white hidden md:inline">Help Center</Link>
          </div>
        </div>
      </div>

      {/* sticky main header — logo/search/menu stay visible while scrolling */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {/* main bar — full width */}
      <div className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-4 h-16 md:h-20">
          <Link href="/marketplace" className="flex items-center shrink-0" aria-label="TechPivo Market home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market-logo.svg" alt="TechPivo Market" className="h-10 w-auto sm:h-11" />
          </Link>

          {/* search (desktop) with live AJAX suggestions */}
          <div ref={searchBoxRef} className="hidden md:flex flex-1 max-w-2xl relative">
          <form
            className="flex w-full h-12 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden focus-within:border-[#F59E0B] focus-within:ring-2 focus-within:ring-[#F59E0B]/20"
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
              {DEPARTMENTS.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (query.trim().length >= 2) setSuggestOpen(true) }}
              className="flex-1 bg-transparent px-4 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
              placeholder="Search TechPivo Market — gadgets, laptops, cameras..."
            />
            <button type="submit" aria-label="Search" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] px-5 flex items-center justify-center transition-colors">
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
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">{shownWishCount}</span>
              )}
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden sm:block" />
            <Link href="/account" className="hidden sm:flex items-center gap-2 hover:opacity-90 p-1">
              <span className="w-8 h-8 rounded-full bg-[#23272E] flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-white" />
              </span>
              <span className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] text-slate-400 uppercase leading-none">Sign In</span>
                <span className="text-sm font-semibold text-[#0F172A] leading-tight">My Account</span>
              </span>
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden sm:block" />
            <Link href="/marketplace/cart" className="flex items-center gap-2 bg-[#F8FAFC] hover:bg-slate-100 px-3 py-2 rounded-lg border border-[#E2E8F0]">
              <span className="relative flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-[#F59E0B]" />
                {shownCartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#F59E0B] text-[#0F172A] text-[10px] min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center font-bold">{shownCartCount}</span>
                )}
              </span>
              <span className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] text-slate-400 uppercase leading-none">Cart</span>
                <span className="text-sm font-bold text-[#0F172A]">{shownCartTotal}</span>
              </span>
            </Link>
            <button
              className="md:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#0F172A]"
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
            <button type="submit" aria-label="Search" className="bg-[#F59E0B] text-[#0F172A] px-4 flex items-center justify-center">
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
      <div
        className="relative w-full bg-white border-t border-[#E2E8F0]"
        onMouseLeave={() => setDeptOpen(false)}
      >
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 hidden md:flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <div
              ref={deptWrapRef}
              onMouseEnter={() => setDeptOpen(true)}
              className="shrink-0"
            >
              <button
                type="button"
                onClick={() => setDeptOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={deptOpen}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors cursor-pointer"
              >
                <Menu className="h-5 w-5" />
                <span>All Departments</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${deptOpen ? "rotate-180" : ""}`} />
              </button>
              {deptOpen && (
                <div className="absolute inset-x-0 top-full z-50 hidden md:block">
                  <div
                    className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10"
                    onMouseEnter={() => setDeptOpen(true)}
                  >
                    <div className="rounded-b-2xl border border-t-0 border-[#E2E8F0] bg-white p-6 shadow-2xl lg:p-8 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                        {DEPARTMENTS.map((d) => (
                          <div key={d.slug} className="min-w-0">
                            <Link
                              href={`/marketplace/category/${d.slug}`}
                              onClick={() => setDeptOpen(false)}
                              className="group block overflow-hidden rounded-xl border border-[#E2E8F0]"
                            >
                              {deptCovers[d.slug] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={deptCovers[d.slug]} alt={d.name} loading="lazy" className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              ) : (
                              <span className="flex h-24 w-full items-center justify-center" style={{ background: "linear-gradient(120deg, #23272E 0%, #14171C 100%)" }} aria-hidden>
                                <span className="text-2xl font-extrabold text-white/25">{d.name.charAt(0)}</span>
                              </span>
                              )}
                            </Link>
                            <Link
                              href={`/marketplace/category/${d.slug}`}
                              onClick={() => setDeptOpen(false)}
                              className="mt-2.5 block text-sm font-bold text-[#0F172A] hover:text-[#DC2626]"
                            >
                              {d.name}
                            </Link>
                            <ul className="mt-1.5 space-y-1.5">
                              {d.subs.slice(0, 6).map((s) => (
                                <li key={s.slug}>
                                  <Link
                                    href={`/marketplace/category/${s.slug}`}
                                    onClick={() => setDeptOpen(false)}
                                    className="text-[13px] text-slate-500 transition-colors hover:text-[#DC2626]"
                                  >
                                    {s.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            <Link
                              href={`/marketplace/category/${d.slug}`}
                              onClick={() => setDeptOpen(false)}
                              className="mt-2 inline-block text-xs font-bold text-[#DC2626] hover:underline"
                            >
                              View all →
                            </Link>
                          </div>
                        ))}
                        <div
                          className="flex min-h-[280px] flex-col justify-between overflow-hidden rounded-xl p-5 text-white"
                          style={{ background: `linear-gradient(160deg, #DC2626 0%, #7F1D1D 100%)` }}
                        >
                          <div>
                            <span className="inline-flex items-center gap-1 rounded bg-[#EF4444] px-2 py-0.5 text-[11px] font-bold uppercase">
                              <Flame className="h-3 w-3" /> Flash Sale
                            </span>
                            <p className="mt-3 text-2xl font-extrabold leading-tight">Up to<br />50% Off</p>
                            <p className="mt-1 text-xs text-blue-100">Verified supplier picks, tracked delivery.</p>
                          </div>
                          <Link
                            href="/marketplace#flash-deals"
                            onClick={() => setDeptOpen(false)}
                            className="mt-4 rounded-lg bg-[#F59E0B] py-2.5 text-center text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
                          >
                            Shop deals
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <nav className="hidden lg:flex items-center gap-1 min-w-0 flex-1 overflow-x-auto whitespace-nowrap" aria-label="Marketplace" style={{ scrollbarWidth: "none" }}>
              {NAV.map((item, i) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={i === 0 ? "page" : undefined}
                  className={
                    i === 0
                      ? "shrink-0 px-3 py-2 rounded-lg bg-slate-100 text-[#0F172A] font-semibold text-sm"
                      : "shrink-0 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#0F172A] text-sm"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/marketplace#flash-deals"
            className="flex items-center gap-2 bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/20 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-[#FEE2E2] shrink-0"
          >
            <Flame className="h-4 w-4" />
            <span className="hidden xl:inline">Black Friday Specials</span>
            <span className="xl:hidden">Specials</span>
          </Link>
        </div>

        {/* mobile nav drawer */}
        {open && (
          <nav className="md:hidden border-t border-[#E2E8F0] px-4 py-3 grid gap-1 bg-white max-h-[70vh] overflow-y-auto" aria-label="Marketplace mobile">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Departments</p>
            {DEPARTMENTS.map((d) => (
              <div key={d.slug}>
                <Link
                  href={`/marketplace/category/${d.slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-semibold text-[#0F172A] hover:bg-slate-100 text-left"
                >
                  {d.name}
                </Link>
                <div className="pl-5 grid">
                  {d.subs.slice(0, 4).map((s) => (
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
              </div>
            ))}
          </nav>
        )}
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
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-5 px-3 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#F59E0B]">
                <p.icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">{p.title}</h4>
                <p className="text-sm text-slate-500">{p.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* main footer — formal charcoal */}
      <div className="w-full text-white" style={{ background: `linear-gradient(180deg, ${MARKETPLACE_BRAND.navy} 0%, ${MARKETPLACE_BRAND.navyDeep} 100%)` }}>
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-10 px-3 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="TechPivo Market" className="h-9 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F59E0B]">Market</span>
          </div>
            <p className="text-sm leading-relaxed text-slate-300">Curated tech products, reviewed by the TechPivo editorial team. Every purchase supports independent tech journalism.</p>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" /><span>Lagos • Nairobi • Accra — ships worldwide</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-[#F59E0B]" /><span>+234 (0) 800 000 0000</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-[#F59E0B]" /><span>market@techpivo.com</span></div>
            </div>
          </div>
          <nav aria-label="Shop departments">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Shop</h5>
            <ul className="grid grid-cols-1 gap-2.5 text-sm text-slate-300">
              {DEPARTMENTS.map((d) => (
                <li key={d.slug}><Link className="transition-colors hover:text-[#F59E0B]" href={`/marketplace/category/${d.slug}`}>{d.name}</Link></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Customer service">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Customer Service</h5>
            <ul className="grid grid-cols-1 gap-2.5 text-sm text-slate-300">
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/contact">Help Center</Link></li>
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/marketplace/track">Order Tracking</Link></li>
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/marketplace/cart">Your Cart</Link></li>
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/marketplace/wishlist">Your Wishlist</Link></li>
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/contact">Returns & Warranty</Link></li>
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link className="transition-colors hover:text-[#F59E0B]" href="/terms-of-use">Terms of Use</Link></li>
            </ul>
          </nav>
          <div>
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Newsletter</h5>
            <p className="mb-3 text-sm text-slate-300">Weekly tech drops and member coupons.</p>
            <form className="space-y-2" onSubmit={subscribe}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#F59E0B] focus:outline-none" placeholder="Your email" type="email" aria-label="Email" />
              <button className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706] disabled:opacity-60" type="submit" disabled={subBusy}>
                {subBusy ? "Subscribing..." : "Subscribe"}
              </button>
              {subMsg && <p className="text-xs text-slate-300">{subMsg}</p>}
            </form>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold">
              {["VISA", "MASTERCARD", "PAYPAL", "PAYSTACK"].map((p) => (
                <span key={p} className="rounded bg-white/10 px-2.5 py-1 text-slate-200">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* bottom bar — full width */}
      <div className="w-full text-white" style={{ background: MARKETPLACE_BRAND.navyDeep }}>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-2 px-3 py-5 text-xs sm:flex-row sm:px-6 sm:text-sm lg:px-10">
          <p className="text-slate-400">© {new Date().getFullYear()} TechPivo Market. All rights reserved.</p>
          <p className="text-[11px] leading-relaxed text-slate-500">Quality-checked products · secure payment · tracked delivery on every order.</p>
        </div>
      </div>
    </footer>
  )
}

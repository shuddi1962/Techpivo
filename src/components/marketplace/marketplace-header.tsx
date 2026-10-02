"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Search, Heart, User, ShoppingBag, Menu, X, ChevronDown,
  Flame, MapPin, Phone, Mail, Truck, RefreshCcw, Headset, ShieldCheck,
} from "lucide-react"
import { MARKET_DEPARTMENTS as DEPARTMENTS } from "@/lib/marketplace-categories"
import { MARKETPLACE_BRAND } from "@/lib/marketplace"

const NAV = ["Home", "Shop", "Deals of the Day", "Best Sellers", "Top Vendors", "New Arrivals", "Blog"]

export function MarketplaceHeader({
  cartCount = 2,
  cartTotal = "$1,249.00",
  wishCount = 3,
}: {
  cartCount?: number
  cartTotal?: string
  wishCount?: number
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  return (
    <header className="w-full rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* utility bar */}
      <div style={{ background: MARKETPLACE_BRAND.navy }} className="text-white">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-10 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-[#EF4444] text-white px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide shrink-0">
              Limited Deal
            </span>
            <p className="text-slate-300 hidden sm:block truncate">Black Friday Sale! Special offers up to 50% Off at TechPivo Market</p>
          </div>
          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 cursor-pointer hover:text-white">USD <ChevronDown className="h-3.5 w-3.5" /></span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <Link href="/marketplace" className="hover:text-white hidden md:inline">Track Order</Link>
            <span className="hidden md:inline text-slate-600">|</span>
            <Link href="/contact" className="hover:text-white hidden md:inline">Help Center</Link>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between gap-4 h-16 md:h-20">
          <Link href="/marketplace" className="flex items-center gap-2 shrink-0" aria-label="TechPivo Market home">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-extrabold text-white"
              style={{ background: `linear-gradient(135deg, ${MARKETPLACE_BRAND.navy} 0%, #1E293B 100%)` }}
            >
              T
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-[#0F172A]">TechPivo</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">Market</span>
            </span>
          </Link>

          {/* search (desktop) */}
          <form
            className="hidden md:flex flex-1 max-w-2xl h-12 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden focus-within:border-[#F59E0B] focus-within:ring-2 focus-within:ring-[#F59E0B]/20"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <select aria-label="Category" className="bg-transparent px-3 text-sm text-slate-500 border-r border-[#E2E8F0] focus:outline-none cursor-pointer hidden lg:block">
              <option>All Categories</option>
              <option>Computing</option>
              <option>Gaming</option>
              <option>Mobile</option>
              <option>Audio</option>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent px-4 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
              placeholder="Search TechPivo Market — gadgets, laptops, cameras..."
            />
            <button type="submit" aria-label="Search" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] px-5 flex items-center justify-center transition-colors">
              <Search className="h-5 w-5" />
            </button>
          </form>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link href="/marketplace" aria-label="Wishlist" className="relative p-2 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <Heart className="h-6 w-6 text-slate-600" />
              <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{wishCount}</span>
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden sm:block" />
            <Link href="/account" className="hidden sm:flex items-center gap-2 hover:opacity-90 p-1">
              <span className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-white" />
              </span>
              <span className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] text-slate-400 uppercase leading-none">Sign In</span>
                <span className="text-sm font-semibold text-[#0F172A] leading-tight">My Account</span>
              </span>
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden sm:block" />
            <Link href="/marketplace" className="flex items-center gap-2 bg-[#F8FAFC] hover:bg-slate-100 px-3 py-2 rounded-lg border border-[#E2E8F0]">
              <span className="relative flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-[#F59E0B]" />
                <span className="absolute -top-2 -right-2 bg-[#F59E0B] text-[#0F172A] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
              </span>
              <span className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] text-slate-400 uppercase leading-none">Cart</span>
                <span className="text-sm font-bold text-[#0F172A]">{cartTotal}</span>
              </span>
            </Link>
            <button
              className="md:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#0F172A]"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile search */}
        <div className="md:hidden px-4 pb-3">
          <form className="flex h-11 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden" onSubmit={(e) => e.preventDefault()} role="search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent px-3 text-sm focus:outline-none"
              placeholder="Search TechPivo Market..."
            />
            <button type="submit" aria-label="Search" className="bg-[#F59E0B] text-[#0F172A] px-4 flex items-center justify-center">
              <Search className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* nav bar */}
      <div className="bg-white border-t border-[#E2E8F0] relative">
        <div className="mx-auto max-w-7xl px-4 hidden md:flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <details className="relative group">
              <summary className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors cursor-pointer list-none">
                <Menu className="h-5 w-5" />
                <span>All Departments</span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute top-full left-0 mt-2 w-[560px] max-w-[80vw] bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-4 grid grid-cols-2 lg:grid-cols-3 gap-3 z-50">
                {DEPARTMENTS.map((d) => (
                  <div key={d.slug}>
                    <Link href="/marketplace#trending" className="text-sm font-bold text-[#0F172A] hover:text-[#B45309]">{d.name}</Link>
                    <ul className="mt-1.5 space-y-1">
                      {d.subs.map((s) => (
                        <li key={s.slug}>
                          <Link href="/marketplace#trending" className="text-xs text-slate-500 hover:text-[#0F172A]">{s.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
            <nav className="hidden lg:flex items-center gap-1" aria-label="Marketplace">
              {NAV.map((item, i) => (
                <Link
                  key={item}
                  href="/marketplace"
                  aria-current={i === 0 ? "page" : undefined}
                  className={
                    i === 0
                      ? "px-3 py-2 rounded-lg bg-slate-100 text-[#0F172A] font-semibold text-sm"
                      : "px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#0F172A] text-sm"
                  }
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/20 px-3 py-1.5 rounded-full text-sm font-semibold">
            <Flame className="h-4 w-4" />
            <span className="hidden xl:inline">Black Friday Specials</span>
            <span className="xl:hidden">Specials</span>
          </div>
        </div>

        {/* mobile nav drawer */}
        {open && (
          <nav className="md:hidden border-t border-[#E2E8F0] px-4 py-3 grid gap-1 bg-white" aria-label="Marketplace mobile">
            {NAV.map((item) => (
              <Link
                key={item}
                href="/marketplace"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item}
              </Link>
            ))}
            <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Departments</p>
            {DEPARTMENTS.map((d) => (
              <Link
                key={d.slug}
                href="/marketplace#trending"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-[#0F172A] hover:bg-slate-100"
              >
                {d.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}

const PERKS = [
  { icon: Truck, title: "Free Shipping", copy: "On all orders over $49" },
  { icon: RefreshCcw, title: "Money Guarantee", copy: "30-day easy returns" },
  { icon: Headset, title: "Online Support 24/7", copy: "Dedicated care team" },
  { icon: ShieldCheck, title: "Secure Payments", copy: "Encrypted checkout" },
]

export function MarketplaceFooter() {
  return (
    <footer className="w-full bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden mt-8">
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#F59E0B] shrink-0">
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
      <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-extrabold text-white" style={{ background: MARKETPLACE_BRAND.navy }}>T</span>
            <span className="text-lg font-extrabold text-[#0F172A]">TechPivo <span className="text-[#F59E0B]">Market</span></span>
          </div>
          <p className="text-sm text-slate-500">Curated tech products, reviewed by the TechPivo editorial team. Every purchase supports independent tech journalism.</p>
          <div className="space-y-1.5 text-sm text-slate-500">
            <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-[#F59E0B] mt-0.5" /><span>Lagos • Nairobi • Accra — ships worldwide</span></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#F59E0B]" /><span>+234 (0) 800 000 0000</span></div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#F59E0B]" /><span>market@techpivo.com</span></div>
          </div>
        </div>
        <div>
          <h5 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] mb-3">Shop</h5>
          <ul className="space-y-2 text-sm text-slate-500">
            {["New Arrivals", "Best Sellers", "Deals of the Day", "Top Vendors", "Gift Cards"].map((x) => (
              <li key={x}><Link className="hover:text-[#F59E0B]" href="/marketplace">{x}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] mb-3">Support</h5>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link className="hover:text-[#F59E0B]" href="/contact">Help Center</Link></li>
            <li><Link className="hover:text-[#F59E0B]" href="/marketplace">Order Tracking</Link></li>
            <li><Link className="hover:text-[#F59E0B]" href="/marketplace">Returns & Exchanges</Link></li>
            <li><Link className="hover:text-[#F59E0B]" href="/marketplace">Warranty</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] mb-3">Newsletter</h5>
          <p className="text-sm text-slate-500 mb-3">Weekly tech drops and member coupons.</p>
          <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
            <input className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]" placeholder="Your email" type="email" aria-label="Email" />
            <button className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] text-sm font-bold py-2.5 rounded-lg transition-colors" type="submit">Subscribe</button>
          </form>
        </div>
      </div>
      <div style={{ background: MARKETPLACE_BRAND.navy }} className="text-white py-4">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-slate-300 text-xs sm:text-sm">© {new Date().getFullYear()} TechPivo Market. All rights reserved.</p>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            {["VISA", "MASTERCARD", "PAYPAL", "PAYSTACK"].map((p) => (
              <span key={p} className="bg-white/10 px-2.5 py-1 rounded">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

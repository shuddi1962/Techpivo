"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Package, ReceiptText, MessageSquare, BadgePercent, LayoutGrid,
  ImagePlus, Plug, TrendingUp, CreditCard, Globe, ArrowLeft,
  ExternalLink, LayoutDashboard, Store, Search, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Single source of truth for the Marketplace admin sections — shared by the
// global admin sidebar (which swaps to this nav on /admin/marketplace*) and
// the marketplace page itself (tabs are URL-driven via ?section=).
export interface MarketSection {
  id: string
  label: string
  desc: string
  icon: LucideIcon
  group: "Overview" | "Sell" | "Marketing" | "Setup"
}

export const MARKET_SECTIONS: MarketSection[] = [
  { id: "dashboard", label: "Dashboard", desc: "Sales, charts & analytics", icon: LayoutDashboard, group: "Overview" },
  { id: "products", label: "Products", desc: "Catalog, prices & sale timers", icon: Package, group: "Sell" },
  { id: "orders", label: "Orders", desc: "Payments & fulfillment", icon: ReceiptText, group: "Sell" },
  { id: "reviews", label: "Reviews", desc: "Ratings & moderation", icon: MessageSquare, group: "Sell" },
  { id: "cj", label: "CJ Import", desc: "Supplier catalog sync", icon: Plug, group: "Sell" },
  { id: "promotions", label: "Promotions", desc: "Coupons & discounts", icon: BadgePercent, group: "Marketing" },
  { id: "banners", label: "Banners & promos", desc: "Hero, promo bar, flash sale", icon: ImagePlus, group: "Marketing" },
  { id: "upsells", label: "Upsells", desc: "Complete-your-purchase", icon: TrendingUp, group: "Marketing" },
  { id: "categories", label: "Categories", desc: "Departments & mapping", icon: LayoutGrid, group: "Marketing" },
  { id: "payments", label: "Payments", desc: "Gateway keys & mode", icon: CreditCard, group: "Setup" },
  { id: "visibility", label: "Visibility", desc: "Storefront publish switch", icon: Globe, group: "Setup" },
]

const MARKET_GROUPS = ["Overview", "Sell", "Marketing", "Setup"] as const

export function isMarketSection(id: string | null | undefined): boolean {
  return !!id && MARKET_SECTIONS.some((s) => s.id === id)
}

export function sectionHref(id: string): string {
  return `/admin/marketplace?section=${id}`
}

function SectionLink({
  t,
  isActive,
  onNavClick,
  compact = false,
}: {
  t: MarketSection
  isActive: boolean
  onNavClick?: () => void
  compact?: boolean
}) {
  const Icon = t.icon
  return (
    <Link
      href={sectionHref(t.id)}
      onClick={onNavClick}
      aria-current={isActive ? "page" : undefined}
      title={compact ? `${t.label} — ${t.desc}` : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-2.5 transition-all duration-150",
        compact ? "justify-center py-2" : "py-2 text-left",
        isActive
          ? "bg-slate-900 text-white shadow-[0_10px_24px_-10px_rgba(15,23,42,0.55)]"
          : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 active:scale-[0.99]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
          isActive
            ? "bg-[#F59E0B] text-slate-900 shadow-sm"
            : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-amber-600 group-hover:shadow-sm"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {!compact && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-bold">{t.label}</span>
          <span className={cn("block truncate text-[11px]", isActive ? "text-slate-300" : "text-slate-400")}>
            {t.desc}
          </span>
        </span>
      )}
      {!compact && (
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full transition-opacity",
            isActive ? "bg-[#F59E0B] opacity-100" : "opacity-0"
          )}
        />
      )}
      {isActive && (
        <span aria-hidden className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#F59E0B]" />
      )}
    </Link>
  )
}

function MarketplaceLinks({ onNavClick, mini = false }: { onNavClick?: () => void; mini?: boolean }) {
  const searchParams = useSearchParams()
  const active = searchParams.get("section")
  const current = isMarketSection(active) ? active : "dashboard"
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return MARKET_SECTIONS
    return MARKET_SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(needle) ||
        s.desc.toLowerCase().includes(needle) ||
        s.group.toLowerCase().includes(needle)
    )
  }, [q])

  if (mini) {
    return (
      <div className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-4 [scrollbar-width:none]">
        {MARKET_SECTIONS.map((t) => (
          <SectionLink key={t.id} t={t} isActive={current === t.id} onNavClick={onNavClick} compact />
        ))}
      </div>
    )
  }

  const grouped = MARKET_GROUPS.map((g) => ({
    name: g,
    items: filtered.filter((s) => s.group === g),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full flex-col">
      <div className="relative px-1 pb-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sections…"
          aria-label="Search marketplace sections"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
        />
      </div>
      <nav className="grid gap-3 overflow-y-auto pb-1" aria-label="Marketplace sections">
        {grouped.map((g) => (
          <div key={g.name}>
            <p className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
              {g.name}
            </p>
            <div className="grid gap-1">
              {g.items.map((t) => (
                <SectionLink key={t.id} t={t} isActive={current === t.id} onNavClick={onNavClick} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
            No sections match “{q}”.
          </p>
        )}
      </nav>
    </div>
  )
}

export function MarketplaceRail() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <MarketplaceLinks mini />
    </Suspense>
  )
}

export function MarketplaceBackLink({ mini = false, onNavClick }: { mini?: boolean; onNavClick?: () => void }) {
  if (mini) {
    return (
      <Link
        href="/admin"
        onClick={onNavClick}
        title="Back to admin"
        aria-label="Back to admin"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </Link>
    )
  }
  return (
    <Link
      href="/admin"
      onClick={onNavClick}
      className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow"
    >
      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
      <span className="flex-1 truncate">Back to Admin</span>
    </Link>
  )
}

export function MarketplaceStoreLink({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <Link
      href="/marketplace"
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavClick}
      className="group flex items-center gap-2.5 rounded-xl bg-[#F59E0B] px-3 py-2.5 text-[13px] font-bold text-slate-900 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)] transition-all hover:bg-[#D97706] active:scale-[0.99]"
    >
      <Store className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">View store</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

// Full sidebar body for the marketplace area (desktop expanded + mobile
// drawer). The Suspense wrappers are required because the links read ?section=.
export function MarketplaceSidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-3 pt-4">
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white p-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Store className="h-[18px] w-[18px] text-[#F59E0B]" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-extrabold tracking-tight text-slate-900">TechPivo Market</p>
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                Live store
              </p>
            </div>
          </div>
          <div className="mt-2.5 grid gap-2">
            <Suspense fallback={null}>
              <MarketplaceBackLink onNavClick={onNavClick} />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3 py-3">
        <Suspense fallback={<div className="px-3 py-2 text-[13px] text-slate-400">Loading…</div>}>
          <MarketplaceLinks onNavClick={onNavClick} />
        </Suspense>
      </div>
      <div className="shrink-0 border-t border-slate-100 bg-white/80 p-3 backdrop-blur">
        <Suspense fallback={null}>
          <MarketplaceStoreLink onNavClick={onNavClick} />
        </Suspense>
        <p className="mt-2 px-1 text-center text-[10px] font-medium text-slate-400">
          Changes publish to the storefront instantly
        </p>
      </div>
    </div>
  )
}

// Collapsed icon rail for the marketplace area.
export function MarketplaceSidebarRail() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center py-3">
      <Suspense fallback={<div className="flex-1" />}>
        <MarketplaceBackLink mini />
        <MarketplaceRail />
      </Suspense>
    </div>
  )
}

// Horizontal pill switcher for small screens, where the desktop sidebar is
// hidden. Rendered at the top of the marketplace admin page.
export function MarketplaceSectionPills() {
  return (
    <Suspense fallback={null}>
      <MarketplaceSectionPillsInner />
    </Suspense>
  )
}

function MarketplaceSectionPillsInner() {
  const searchParams = useSearchParams()
  const active = searchParams.get("section")
  const current = isMarketSection(active) ? active : "dashboard"
  return (
    <nav
      aria-label="Marketplace sections"
      className="-mx-4 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max max-w-none gap-2">
        {MARKET_SECTIONS.map((t) => {
          const Icon = t.icon
          const isActive = current === t.id
          return (
            <Link
              key={t.id}
              href={sectionHref(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-[0.97]",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-[#F59E0B]" : "text-slate-400")} />
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

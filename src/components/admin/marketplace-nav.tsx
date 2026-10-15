"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Package, ReceiptText, MessageSquare, BadgePercent, LayoutGrid,
  ImagePlus, Plug, TrendingUp, CreditCard, Globe, ArrowLeft,
  ExternalLink, LayoutDashboard, Store, type LucideIcon,
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
}

export const MARKET_SECTIONS: MarketSection[] = [
  { id: "dashboard", label: "Dashboard", desc: "Sales, charts & analytics", icon: LayoutDashboard },
  { id: "products", label: "Products", desc: "Catalog, prices & sale timers", icon: Package },
  { id: "orders", label: "Orders", desc: "Payments & fulfillment", icon: ReceiptText },
  { id: "reviews", label: "Reviews", desc: "Ratings & moderation", icon: MessageSquare },
  { id: "promotions", label: "Promotions", desc: "Coupons & discounts", icon: BadgePercent },
  { id: "categories", label: "Categories", desc: "Departments & mapping", icon: LayoutGrid },
  { id: "banners", label: "Banners & promos", desc: "Hero, promo bar, flash sale, popups", icon: ImagePlus },
  { id: "cj", label: "CJ Import", desc: "Supplier catalog sync", icon: Plug },
  { id: "upsells", label: "Upsells", desc: "Complete-your-purchase", icon: TrendingUp },
  { id: "payments", label: "Payments", desc: "Gateway keys & mode", icon: CreditCard },
  { id: "visibility", label: "Visibility", desc: "Storefront publish switch", icon: Globe },
]

export function isMarketSection(id: string | null | undefined): boolean {
  return !!id && MARKET_SECTIONS.some((s) => s.id === id)
}

export function sectionHref(id: string): string {
  return `/admin/marketplace?section=${id}`
}

function MarketplaceLinks({ onNavClick }: { onNavClick?: () => void }) {
  const searchParams = useSearchParams()
  const active = searchParams.get("section")
  const current = isMarketSection(active) ? active : "dashboard"
  return (
    <nav className="grid gap-1" aria-label="Marketplace sections">
      {MARKET_SECTIONS.map((t) => {
        const Icon = t.icon
        const isActive = current === t.id
        return (
          <Link
            key={t.id}
            href={sectionHref(t.id)}
            onClick={onNavClick}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150",
              isActive
                ? "bg-slate-900 text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)]"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-[#F59E0B] text-slate-900"
                  : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600 group-hover:shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold leading-tight">{t.label}</span>
              <span className={cn("block truncate text-[11px] leading-tight mt-0.5", isActive ? "text-slate-300" : "text-slate-400")}>
                {t.desc}
              </span>
            </span>
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full transition-opacity",
                isActive ? "bg-[#F59E0B] opacity-100" : "opacity-0"
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}

function MarketplaceRail() {
  const searchParams = useSearchParams()
  const active = searchParams.get("section")
  const current = isMarketSection(active) ? active : "dashboard"
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-4 [scrollbar-width:none]">
      {MARKET_SECTIONS.map((t) => {
        const Icon = t.icon
        const isActive = current === t.id
        return (
          <Link
            key={t.id}
            href={sectionHref(t.id)}
            title={t.label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150",
              isActive
                ? "bg-slate-900 text-[#F59E0B] shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)]"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </Link>
        )
      })}
    </div>
  )
}

export function MarketplaceBackLink({ mini = false, onNavClick }: { mini?: boolean; onNavClick?: () => void }) {
  if (mini) {
    return (
      <Link
        href="/admin"
        onClick={onNavClick}
        title="Back to admin"
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
      onClick={onNavClick}
      className="group flex items-center gap-2.5 rounded-xl bg-[#F59E0B] px-3 py-2.5 text-[13px] font-bold text-slate-900 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)] transition-all hover:bg-[#D97706]"
    >
      <Store className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">View store</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

// Full sidebar body for the marketplace area (desktop expanded). The
// Suspense wrapper is required because the links read the ?section= param.
export function MarketplaceSidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-4">
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white p-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Store className="h-4 w-4 text-[#F59E0B]" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-extrabold tracking-tight text-slate-900">TechPivo Market</p>
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Live store
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <Suspense fallback={null}>
              <MarketplaceBackLink onNavClick={onNavClick} />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <Suspense fallback={<div className="px-3 py-2 text-[13px] text-slate-400">Loading…</div>}>
          <MarketplaceLinks onNavClick={onNavClick} />
        </Suspense>
      </div>
      <div className="shrink-0 border-t border-slate-100 p-3">
        <Suspense fallback={null}>
          <MarketplaceStoreLink onNavClick={onNavClick} />
        </Suspense>
      </div>
    </div>
  )
}

// Collapsed icon rail for the marketplace area.
export function MarketplaceSidebarRail() {
  return (
    <div className="flex flex-1 flex-col items-center py-3">
      <Suspense fallback={<div className="flex-1" />}>
        <MarketplaceBackLink mini />
        <MarketplaceRail />
      </Suspense>
    </div>
  )
}

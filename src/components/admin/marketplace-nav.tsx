"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Package, ReceiptText, MessageSquare, BadgePercent, LayoutGrid,
  ImagePlus, Plug, TrendingUp, CreditCard, Globe, ArrowLeft,
  ExternalLink, type LucideIcon,
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
  const current = isMarketSection(active) ? active : "products"
  return (
    <nav className="grid gap-0.5" aria-label="Marketplace sections">
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
              "flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", isActive ? "text-amber-400" : "text-slate-400")} />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{t.label}</span>
              <span className={cn("block truncate text-[11px] leading-tight mt-0.5", isActive ? "text-slate-300" : "text-slate-400")}>
                {t.desc}
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function MarketplaceRail() {
  const searchParams = useSearchParams()
  const active = searchParams.get("section")
  const current = isMarketSection(active) ? active : "products"
  return (
    <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4 [scrollbar-width:none]">
      {MARKET_SECTIONS.map((t) => {
        const Icon = t.icon
        const isActive = current === t.id
        return (
          <Link
            key={t.id}
            href={sectionHref(t.id)}
            title={t.label}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              isActive
                ? "bg-slate-900 text-amber-400"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </Link>
    )
  }
  return (
    <Link
      href="/admin"
      onClick={onNavClick}
      className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
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
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">View store</span>
    </Link>
  )
}

// Full sidebar body for the marketplace area (desktop expanded). The
// Suspense wrapper is required because the links read the ?section= param.
export function MarketplaceSidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex-1">
      <div className="space-y-6 px-3 py-4">
        <div>
          <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            TechPivo Market
          </p>
          <Suspense fallback={<div className="px-3 py-2 text-[13px] text-muted-foreground">Loading…</div>}>
            <MarketplaceBackLink onNavClick={onNavClick} />
            <MarketplaceLinks onNavClick={onNavClick} />
            <div className="mt-2 border-t pt-2">
              <MarketplaceStoreLink onNavClick={onNavClick} />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Collapsed icon rail for the marketplace area.
export function MarketplaceSidebarRail() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <MarketplaceBackLink mini />
      <MarketplaceRail />
    </Suspense>
  )
}

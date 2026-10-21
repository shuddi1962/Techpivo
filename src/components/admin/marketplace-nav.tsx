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
//
// The nav deliberately mirrors the main site-admin sidebar (light surface,
// muted rows, uppercase group labels, hairline separators) so the
// Marketplace area feels like part of the same admin product — only the
// content changes, not the language.
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
      title={`${t.label} — ${t.desc}`}
      aria-label={`${t.label} — ${t.desc}`}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md transition-colors",
        compact ? "h-9 w-9 justify-center" : "px-2.5 py-1.5",
        isActive
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-amber-600" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!compact && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-medium">{t.label}</span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/80">{t.desc}</span>
        </span>
      )}
      {isActive && !compact && (
        <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F59E0B]" />
      )}
    </Link>
  )
}

function MarketplaceLinks({ onNavClick, mini = false }: { onNavClick?: () => void; mini?: boolean }) {
  const searchParams = useSearchParams()
  const active = searchParams.get("section")
  const current = isMarketSection(active) ? active : "dashboard"
  if (mini) {
    return (
      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3 [scrollbar-width:none]">
        {MARKET_SECTIONS.map((t) => (
          <SectionLink key={t.id} t={t} isActive={current === t.id} onNavClick={onNavClick} compact />
        ))}
      </div>
    )
  }

  const grouped = MARKET_GROUPS.map((g) => ({
    name: g,
    items: MARKET_SECTIONS.filter((s) => s.group === g),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Overflow is a safety net for very short viewports only — at normal
          laptop heights every section is visible with no scrolling. */}
      <nav className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto pb-0.5 [scrollbar-width:thin]" aria-label="Marketplace sections">
        {grouped.map((g) => (
          <div key={g.name}>
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {g.name}
            </p>
            <div className="space-y-0.5">
              {g.items.map((t) => (
                <SectionLink key={t.id} t={t} isActive={current === t.id} onNavClick={onNavClick} />
              ))}
            </div>
          </div>
        ))}
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
        title="Back to Admin"
        aria-label="Back to Admin"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
    )
  }
  return (
    <Link
      href="/admin"
      onClick={onNavClick}
      title="Back to Admin"
      aria-label="Back to Admin"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
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
      rel="noopener noreferrer"
      onClick={onNavClick}
      title="Open the live storefront — changes publish instantly"
      className="group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Store className="h-4 w-4 shrink-0 text-amber-600" />
      <span className="flex-1 truncate">View store</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

// Full sidebar body for the marketplace area (desktop expanded + mobile
// drawer): slim identity card, grouped sections, slim footer. Matches the
// main admin sidebar language (light surface, muted rows, hairline borders).
export function MarketplaceSidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-3 pt-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-[13px] font-bold text-background">
            M
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold tracking-tight text-foreground">
              TechPivo Market
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live store
            </span>
          </span>
          <Suspense fallback={null}>
            <Link
              href="/admin"
              onClick={onNavClick}
              title="Back to Admin"
              aria-label="Back to Admin"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </Suspense>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3 py-3">
        <Suspense fallback={<div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>}>
          <MarketplaceLinks onNavClick={onNavClick} />
        </Suspense>
      </div>
      <div className="shrink-0 border-t border-border px-3 py-2">
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
    <div className="flex min-h-0 flex-1 flex-col items-center py-2.5">
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

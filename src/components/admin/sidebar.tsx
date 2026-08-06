"use client"

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard, FileText, FolderTree, Rss, Image,
  DollarSign, ShoppingBag, BarChart3, SearchCheck,
  Globe, Settings, Users, MessageSquare, Mail,
  Bell, Lightbulb, Share2, Shield, Search,
  Brain, FlaskConical, HeartPulse, Calendar, Swords,
  TrendingUp, FileBarChart, Cpu, Key, Wrench, Lock, Network, Rocket,
  Trophy, BookOpen, PanelLeftClose, PanelLeftOpen, Newspaper, PieChart,
  Plus, Sparkles, ExternalLink, ChevronRight, type LucideIcon,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./sidebar-context"

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

interface NavGroup {
  label: string
  icon: LucideIcon
  description?: string
  links: NavLink[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    description: "Mission control center",
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "AI & Intelligence",
    icon: Brain,
    description: "AI newsroom operating system",
    links: [
      { href: "/admin/editorial-intelligence", label: "AI Editorial", icon: Brain, badge: "NEW" },
      { href: "/admin/ai-command-center", label: "AI Command Center", icon: Lightbulb },
      { href: "/admin/research-center", label: "Research Center", icon: FlaskConical },
      { href: "/admin/ai-usage", label: "AI Usage", icon: Cpu },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    description: "Write, manage and publish",
    links: [
      { href: "/admin/posts", label: "Posts", icon: FileText },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/media", label: "Media Library", icon: Image },
      { href: "/admin/editorial-calendar", label: "Editorial Calendar", icon: Calendar },
      { href: "/admin/content-health", label: "Content Health", icon: HeartPulse },
    ],
  },
  {
    label: "Research & SEO",
    icon: SearchCheck,
    description: "Grow organic reach",
    links: [
      { href: "/admin/keywords", label: "Keywords", icon: Search },
      { href: "/admin/rss-feeds", label: "RSS Feeds", icon: Rss },
      { href: "/admin/seo", label: "SEO Center", icon: SearchCheck },
      { href: "/admin/indexing", label: "Indexing", icon: Globe },
      { href: "/admin/competitor-intelligence", label: "Competitors", icon: Swords },
    ],
  },
  {
    label: "Distribution",
    icon: Share2,
    description: "Broadcast your content",
    links: [
      { href: "/admin/social", label: "Social", icon: Share2 },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
      { href: "/admin/push", label: "Push Notifications", icon: Bell },
    ],
  },
  {
    label: "Monetization",
    icon: DollarSign,
    description: "Ads, affiliates & revenue",
    links: [
      { href: "/admin/ads", label: "Ads", icon: DollarSign },
      { href: "/admin/affiliate", label: "Affiliate", icon: ShoppingBag },
      { href: "/admin/revenue-intelligence", label: "Revenue", icon: TrendingUp },
    ],
  },
  {
    label: "Analytics & Reports",
    icon: PieChart,
    description: "Understand performance",
    links: [
      { href: "/admin/analytics", label: "Analytics", icon: PieChart },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    icon: Key,
    description: "Manage the platform",
    links: [
      { href: "/admin/comments", label: "Comments", icon: MessageSquare },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/roles", label: "Roles", icon: Shield },
      { href: "/admin/reporters", label: "Reporters", icon: Newspaper },
      { href: "/admin/security", label: "Security", icon: Lock },
      { href: "/admin/integrations", label: "Integrations", icon: Globe },
      { href: "/admin/settings", label: "Settings", icon: Key },
    ],
  },
  {
    label: "Tools & Utilities",
    icon: Wrench,
    description: "Power tools & platform",
    links: [
      { href: "/admin/tools", label: "Tools Center", icon: Wrench },
      { href: "/admin/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { href: "/admin/launch-center", label: "Launch Center", icon: Rocket },
      { href: "/admin/automation", label: "Automation", icon: Settings },
      { href: "/admin/plugins", label: "Plugins", icon: Plus },
      { href: "/admin/api-platform", label: "API Platform", icon: Key },
    ],
  },
  {
    label: "Community",
    icon: Users,
    description: "Engage your audience",
    links: [
      { href: "/community", label: "Community Hub", icon: Users },
      { href: "/community/forum", label: "Forum", icon: MessageSquare },
      { href: "/community/quiz", label: "Quizzes", icon: Brain },
      { href: "/admin/quiz-builder", label: "Quiz Builder", icon: Plus },
      { href: "/community/polls", label: "Polls", icon: BarChart3 },
      { href: "/admin/poll-builder", label: "Poll Builder", icon: Plus },
      { href: "/community/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/community/learning-paths", label: "Learning Paths", icon: BookOpen },
      { href: "/community/events", label: "Events", icon: Calendar },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

function findActiveGroup(pathname: string): string | null {
  for (const group of navGroups) {
    if (group.links.some((l) => isActive(pathname, l.href))) return group.label
  }
  return null
}

/* ---------------- Premium Hover Flyout Panel ---------------- */

function FlyoutPanel({
  group,
  pathname,
  onNavClick,
  onEnter,
  onLeave,
}: {
  group: NavGroup
  pathname: string
  onNavClick?: () => void
  onEnter: () => void
  onLeave: () => void
}) {
  const GroupIcon = group.icon
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="absolute left-full top-0 z-50 ml-3 w-72 origin-top-left animate-[flyoutIn_.18s_ease-out]"
    >
      <div className="overflow-hidden rounded-2xl border bg-popover/95 shadow-2xl shadow-black/15 backdrop-blur-xl">
        {/* Flyout header */}
        <div className="relative border-b bg-gradient-to-br from-primary/8 via-transparent to-transparent p-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-amber text-white shadow-lg shadow-primary/30">
              <GroupIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">{group.label}</p>
              {group.description && (
                <p className="truncate text-[10px] text-muted-foreground">{group.description}</p>
              )}
            </div>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
              {group.links.length}
            </span>
          </div>
        </div>
        {/* Flyout links */}
        <div className="space-y-0.5 p-2">
          {group.links.map((link) => {
            const Icon = link.icon
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavClick}
                className={cn(
                  "group/fly relative flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-150",
                  active
                    ? "bg-gradient-to-r from-primary/12 via-primary/6 to-transparent"
                    : "hover:bg-muted/60"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-brand-amber" />
                )}
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-gradient-to-br from-primary to-brand-amber text-white shadow-md shadow-primary/25"
                      : "bg-muted/70 text-muted-foreground group-hover/fly:bg-primary/10 group-hover/fly:text-primary"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className={cn("flex-1 truncate text-[13px]", active ? "font-semibold" : "font-medium")}>
                  {link.label}
                </span>
                {link.badge && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary">
                    {link.badge}
                  </span>
                )}
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover/fly:opacity-100" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Sidebar Content ---------------- */

function SidebarContent({
  collapsed,
  isMobile = false,
  onNavClick,
}: {
  collapsed: boolean
  isMobile?: boolean
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const [search, setSearch] = useState("")
  const [openGroup, setOpenGroup] = useState<string | null>(() => findActiveGroup(pathname) ?? null)
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const openFlyout = (label: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setFlyoutGroup(label)
  }
  const closeFlyout = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(() => setFlyoutGroup(null), 140)
  }

  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, [])

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "/" && !collapsed && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [collapsed])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return navGroups
    const q = search.toLowerCase()
    return navGroups
      .map((g) => ({
        ...g,
        links: g.links.filter((l) => l.label.toLowerCase().includes(q) || l.href.toLowerCase().includes(q)),
      }))
      .filter((g) => g.links.length > 0)
  }, [search])

  const activeGroup = findActiveGroup(pathname)

  /* -------- Collapsed mode: icon rail with hover flyout -------- */
  if (collapsed) {
    return (
      <div className="relative flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3 [scrollbar-width:none]">
        <div className="relative flex flex-col items-center gap-1">
          {filteredGroups.map((group) => {
            const Icon = group.icon
            const isActiveGroup = activeGroup === group.label
            const isOpen = flyoutGroup === group.label
            return (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => openFlyout(group.label)}
                onMouseLeave={closeFlyout}
              >
                <Link
                  href={group.links[0].href}
                  onClick={onNavClick}
                  title={group.label}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 relative",
                    isActiveGroup ? "bg-primary/10" : "hover:bg-muted/70"
                  )}
                >
                  {isActiveGroup && (
                    <span className="absolute -left-[5px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-brand-amber" />
                  )}
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                      isActiveGroup
                        ? "bg-gradient-to-br from-primary to-brand-amber text-white shadow-lg shadow-primary/30"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </Link>
                {isOpen && (
                  <FlyoutPanel
                    group={group}
                    pathname={pathname}
                    onNavClick={onNavClick}
                    onEnter={() => openFlyout(group.label)}
                    onLeave={closeFlyout}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* -------- Expanded mode: group items with hover flyout -------- */
  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-4 pb-3 pt-4">
        <div className="group relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search navigation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl border-muted bg-muted/40 pl-9 pr-9 text-[13px] shadow-none transition-all focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-muted bg-background px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground sm:block">
            /
          </kbd>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="relative px-3 pb-6 pt-1">
          {filteredGroups.map((group) => {
            const Icon = group.icon
            const isActiveGroup = activeGroup === group.label
            const isOpen = flyoutGroup === group.label
            const link = group.links[0]

            if (isMobile) {
              /* Mobile: accordion-style expand inline */
              return (
                <div key={group.label} className="mb-0.5">
                  <button
                    onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-all duration-200",
                      isActiveGroup
                        ? "bg-gradient-to-r from-primary/12 via-primary/6 to-transparent font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                        isActiveGroup
                          ? "bg-gradient-to-br from-primary to-brand-amber text-white shadow-lg shadow-primary/30"
                          : "bg-muted/60 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{group.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
                        openGroup === group.label && "rotate-90"
                      )}
                    />
                  </button>
                  {openGroup === group.label && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                      {group.links.map((l) => {
                        const LIcon = l.icon
                        const active = isActive(pathname, l.href)
                        return (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={onNavClick}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                              active
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <LIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate">{l.label}</span>
                            {l.badge && (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                {l.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            /* Desktop: hover flyout group item */
            return (
              <div
                key={group.label}
                className="relative mb-0.5"
                onMouseEnter={() => openFlyout(group.label)}
                onMouseLeave={closeFlyout}
              >
                <Link
                  href={link.href}
                  onClick={onNavClick}
                  className={cn(
                    "group/main flex items-center gap-3 rounded-xl px-2 py-2 transition-all duration-200",
                    isActiveGroup
                      ? "bg-gradient-to-r from-primary/12 via-primary/6 to-transparent font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {isActiveGroup && (
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-brand-amber shadow-sm shadow-primary/40" />
                  )}
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                      isActiveGroup
                        ? "bg-gradient-to-br from-primary to-brand-amber text-white shadow-lg shadow-primary/30"
                        : "bg-muted/60 text-muted-foreground group-hover/main:bg-primary/10 group-hover/main:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate text-[13px]">{group.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-200",
                      isOpen ? "rotate-90 text-primary" : "group-hover/main:translate-x-0.5"
                    )}
                  />
                </Link>
                {isOpen && (
                  <FlyoutPanel
                    group={group}
                    pathname={pathname}
                    onNavClick={onNavClick}
                    onEnter={() => openFlyout(group.label)}
                    onLeave={closeFlyout}
                  />
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

/* ---------------- Sidebar Shell ---------------- */

export function AdminSidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar()

  const Brand = ({ mini = false }: { mini?: boolean }) => (
    <Link href="/admin" className={cn("flex items-center gap-2.5", mini && "justify-center")}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-amber text-white shadow-lg shadow-primary/30">
        <span className="text-sm font-extrabold">T</span>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
      </div>
      {!mini && (
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">Techpivo</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Enterprise CMS
          </p>
        </div>
      )}
    </Link>
  )

  const Footer = () => (
    <div className="border-t bg-gradient-to-r from-transparent via-muted/5 to-transparent p-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 p-2.5">
        <div className="relative">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-brand-amber/20 text-[11px] font-bold text-primary">
              TP
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">Techpivo Admin</p>
          <p className="truncate text-[10px] text-muted-foreground">Administrator · Online</p>
        </div>
        <Link
          href="/"
          title="View site"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative hidden lg:flex flex-col border-r bg-background/80 backdrop-blur-xl h-screen sticky top-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex items-center border-b shrink-0",
            collapsed ? "justify-center h-16" : "justify-between px-4 h-16"
          )}
        >
          <Brand mini={collapsed} />
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
              collapsed && "hidden"
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Quick create */}
        {!collapsed && (
          <div className="px-4 pb-1 pt-3">
            <Button
              asChild
              size="sm"
              className="h-9 w-full rounded-xl bg-gradient-to-r from-primary to-brand-amber text-white shadow-lg shadow-primary/25 hover:opacity-90"
            >
              <Link href="/admin/posts/new">
                <Plus className="h-4 w-4" />
                Create New Post
              </Link>
            </Button>
          </div>
        )}

        <SidebarContent collapsed={collapsed} />

        {collapsed && (
          <div className="border-t p-3">
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {!collapsed && <Footer />}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Brand />
            <Button
              asChild
              size="sm"
              className="h-8 rounded-lg bg-gradient-to-r from-primary to-brand-amber text-white shadow-md shadow-primary/25 hover:opacity-90"
            >
              <Link href="/admin/posts/new">
                <Plus className="h-3.5 w-3.5" />
                New
              </Link>
            </Button>
          </div>
          <SidebarContent collapsed={false} isMobile onNavClick={() => setMobileOpen(false)} />
          <Footer />
        </SheetContent>
      </Sheet>
    </>
  )
}

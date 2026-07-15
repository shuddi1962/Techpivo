"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard, FileText, FolderTree, Rss, Image,
  DollarSign, ShoppingBag, BarChart3, SearchCheck,
  Globe, Settings, Users, MessageSquare, Mail,
  Bell, Lightbulb, Share2, Shield, Search,
  Brain, FlaskConical, HeartPulse, Calendar, Swords,
  TrendingUp, FileBarChart, Cpu, Key, Wrench, Lock, Network, Rocket,
  Trophy, BookOpen, ChevronDown, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Newspaper, PieChart, Plus,
  type LucideIcon,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./sidebar-context"

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  links: NavLink[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "AI & Intelligence",
    links: [
      { href: "/admin/editorial-intelligence", label: "AI Editorial Intelligence", icon: Brain },
      { href: "/admin/ai-command-center", label: "AI Command Center", icon: Lightbulb },
      { href: "/admin/research-center", label: "Research Center", icon: FlaskConical },
      { href: "/admin/ai-usage", label: "AI Usage", icon: Cpu },
    ],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/posts", label: "Posts", icon: FileText },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/media", label: "Media", icon: Image },
      { href: "/admin/editorial-calendar", label: "Editorial Calendar", icon: Calendar },
      { href: "/admin/content-health", label: "Content Health", icon: HeartPulse },
    ],
  },
  {
    label: "Research & SEO",
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
    links: [
      { href: "/admin/social", label: "Social", icon: Share2 },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
      { href: "/admin/push", label: "Push Notifications", icon: Bell },
    ],
  },
  {
    label: "Monetization",
    links: [
      { href: "/admin/ads", label: "Ads", icon: DollarSign },
      { href: "/admin/affiliate", label: "Affiliate", icon: ShoppingBag },
      { href: "/admin/revenue-intelligence", label: "Revenue Intelligence", icon: TrendingUp },
    ],
  },
  {
    label: "Analytics & Reports",
    links: [
      { href: "/admin/analytics", label: "Analytics", icon: PieChart },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
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
    links: [
      { href: "/admin/tools", label: "Tools Center", icon: Wrench },
      { href: "/admin/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { href: "/admin/launch-center", label: "Launch Center", icon: Rocket },
      { href: "/admin/automation", label: "Workflow Automation", icon: Settings },
      { href: "/admin/plugins", label: "Plugin Marketplace", icon: Plus },
      { href: "/admin/api-platform", label: "API Platform", icon: Key },
    ],
  },
  {
    label: "Community",
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

function SidebarContent({ collapsed, onNavClick }: { collapsed: boolean; onNavClick?: () => void }) {
  const pathname = usePathname()
  const [search, setSearch] = useState("")
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const groups: Record<string, boolean> = {}
    navGroups.forEach((g) => {
      groups[g.label] = g.links.some((l) => isActive(pathname, l.href))
    })
    if (!Object.values(groups).some(Boolean)) groups["Overview"] = true
    return groups
  })

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

  const toggleGroup = (label: string) => {
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }))
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        {navGroups.flatMap((g) => g.links).map((link) => {
          const Icon = link.icon
          const active = isActive(pathname, link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg transition-colors relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={link.label}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
              )}
              <Icon className="h-5 w-5" />
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search navigation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/50 border-muted focus-visible:ring-1"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {filteredGroups.map((group) => {
            const isOpen = openGroups[group.label]
            const hasActive = group.links.some((l) => isActive(pathname, l.href))
            return (
              <Collapsible
                key={group.label}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.label)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
                    hasActive
                      ? "text-primary"
                      : "text-muted-foreground/60 hover:text-foreground"
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5">
                  {group.links.map((link) => {
                    const Icon = link.icon
                    const active = isActive(pathname, link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={onNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors relative",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                        )}
                        <Icon className="h-4 w-4 shrink-0" />
                        {link.label}
                      </Link>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">TP</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Techpivo Admin</p>
            <p className="text-xs text-muted-foreground truncate">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, toggleMobile, setMobileOpen } = useSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-background h-screen sticky top-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex items-center border-b shrink-0", collapsed ? "justify-center h-14" : "justify-between px-4 h-14")}>
          {collapsed ? (
            <Link href="/admin">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">T</span>
              </div>
            </Link>
          ) : (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">T</span>
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Techpivo</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Enterprise CMS</p>
              </div>
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "rounded-md hover:bg-muted transition-colors text-muted-foreground",
              collapsed ? "hidden" : "p-1"
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">T</span>
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Techpivo</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Enterprise CMS</p>
              </div>
            </Link>
          </div>
          <SidebarContent collapsed={false} onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

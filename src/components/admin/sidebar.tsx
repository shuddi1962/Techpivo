"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard, FileText, FolderTree, Rss, Image,
  DollarSign, ShoppingBag, BarChart3, SearchCheck,
  Globe, Settings, Users, MessageSquare, Mail,
  Bell, Lightbulb, Share2, Shield, Search,
  Brain, FlaskConical, HeartPulse, Calendar, Swords,
  TrendingUp, FileBarChart, Cpu, Key, Wrench, Lock, Network, Rocket,
  Trophy, BookOpen, PanelLeftClose, PanelLeftOpen, Newspaper, PieChart,
  Plus, ExternalLink, type LucideIcon,
} from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useSidebar } from "./sidebar-context"

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

interface NavGroup {
  label: string
  links: NavLink[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "AI & Intelligence",
    links: [
      { href: "/admin/editorial-intelligence", label: "AI Editorial", icon: Brain, badge: "NEW" },
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
      { href: "/admin/media", label: "Media Library", icon: Image },
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
      { href: "/admin/revenue-intelligence", label: "Revenue", icon: TrendingUp },
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
      { href: "/admin/automation", label: "Automation", icon: Settings },
      { href: "/admin/plugins", label: "Plugins", icon: Plus },
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

function SidebarLink({
  link,
  pathname,
  onNavClick,
}: {
  link: NavLink
  pathname: string
  onNavClick?: () => void
}) {
  const Icon = link.icon
  const active = isActive(pathname, link.href)
  return (
    <Link
      href={link.href}
      onClick={onNavClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="flex-1 truncate">{link.label}</span>
      {link.badge && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {link.badge}
        </span>
      )}
    </Link>
  )
}

function NavList({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <ScrollArea className="flex-1">
      <nav className="space-y-6 px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <SidebarLink key={link.href} link={link} pathname={pathname} onNavClick={onNavClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  )
}

function IconRail({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4 [scrollbar-width:none]">
      {navGroups.flatMap((group) =>
        group.links.map((link) => {
          const Icon = link.icon
          const active = isActive(pathname, link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavClick}
              title={link.label}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </Link>
          )
        })
      )}
    </div>
  )
}

function Brand({ mini = false }: { mini?: boolean }) {
  return (
    <Link href="/admin" className={cn("flex items-center gap-2.5", mini && "justify-center")}>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-[13px] font-bold text-background">
        T
      </div>
      {!mini && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Techpivo</p>
          <p className="text-[10px] text-muted-foreground">Admin</p>
        </div>
      )}
    </Link>
  )
}

function Footer() {
  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
        <Avatar className="h-7 w-7 border border-border">
          <AvatarFallback className="text-[10px] font-medium">TP</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">Techpivo Admin</p>
          <p className="truncate text-[11px] text-muted-foreground">Administrator</p>
        </div>
        <Link
          href="/"
          title="View site"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out lg:flex",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b",
            collapsed ? "h-14 justify-center" : "h-14 justify-between px-4"
          )}
        >
          <Brand mini={collapsed} />
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed ? (
          <IconRail pathname={pathname} />
        ) : (
          <NavList pathname={pathname} />
        )}

        {collapsed ? (
          <div className="border-t p-3">
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Footer />
        )}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <Brand />
          </div>
          <NavList pathname={pathname} onNavClick={() => setMobileOpen(false)} />
          <Footer />
        </SheetContent>
      </Sheet>
    </>
  )
}

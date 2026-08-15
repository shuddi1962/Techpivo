"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Bell, ExternalLink, LogOut, Settings, User, Plus, Search,
  Moon, Sun, Menu, FileText, Image, Users, Hash, X,
  ChevronRight, Home, Globe, Zap, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useSidebar } from "./sidebar-context"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAdminNotifications } from "@/lib/use-admin-notifications"
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react"

const breadcrumbMap: Record<string, string> = {
  "admin": "Dashboard",
  "editorial-intelligence": "AI Editorial Intelligence",
  "agent-reach": "Agent Reach Research Center",
  "ai-usage": "AI Usage",
  "posts": "Posts",
  "categories": "Categories",
  "media": "Media",
  "content-health": "Content Health",
  "keywords": "Keywords",
  "rss-feeds": "RSS Feeds",
  "seo": "SEO Center",
  "indexing": "Indexing",
  "competitor-intelligence": "Competitors",
  "social": "Social",
  "newsletter": "Newsletter",
  "push": "Push Notifications",
  "ads": "Ads",
  "affiliate": "Affiliate",
  "revenue-intelligence": "Revenue Intelligence",
  "analytics": "Analytics",
  "reports": "Reports",
  "comments": "Comments",
  "users": "Users",
  "roles": "Roles",
  "reporters": "Reporters",
  "security": "Security",
  "integrations": "Integrations",
  "settings": "Settings",
  "tools": "Tools Center",
  "knowledge-graph": "Knowledge Graph",
  "launch-center": "Launch Center",
  "automation": "Workflow Automation",
  "plugins": "Plugin Marketplace",
  "api-platform": "API Platform",
  "quiz-builder": "Quiz Builder",
  "poll-builder": "Poll Builder",
  "community-events": "Event Manager",
}

const searchItems = [
  { href: "/admin", label: "Dashboard", icon: Home, category: "Overview" },
  { href: "/admin/editorial-intelligence/breaking-news", label: "Breaking News", icon: Zap, category: "AI & Intelligence" },
  { href: "/admin/agent-reach", label: "Agent Reach Research", icon: Globe, category: "AI & Intelligence" },
  { href: "/admin/posts", label: "Posts", icon: FileText, category: "Content" },
  { href: "/admin/categories", label: "Categories", icon: Hash, category: "Content" },
  { href: "/admin/media", label: "Media", icon: Image, category: "Content" },
  { href: "/admin/seo", label: "SEO Center", icon: Search, category: "SEO" },
  { href: "/admin/keywords", label: "Keywords", icon: Hash, category: "SEO" },
  { href: "/admin/analytics", label: "Analytics", icon: Search, category: "Analytics" },
  { href: "/admin/users", label: "Users", icon: Users, category: "Administration" },
  { href: "/admin/settings", label: "Settings", icon: Settings, category: "Administration" },
  { href: "/admin/security", label: "Security", icon: Settings, category: "Administration" },
  { href: "/admin/tools", label: "Tools Center", icon: Search, category: "Tools" },
  { href: "/admin/ads", label: "Ads", icon: FileText, category: "Monetization" },
  { href: "/admin/newsletter", label: "Newsletter", icon: FileText, category: "Distribution" },
  { href: "/admin/reports", label: "Reports", icon: FileText, category: "Analytics" },
  { href: "/admin/comments", label: "Comments", icon: Users, category: "Administration" },
]

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { toggleMobile } = useSidebar()
  const { notifications, unreadCount, loading, markRead } = useAdminNotifications()
  const [searchOpen, setSearchOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setDarkMode(isDark)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((p) => !p)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const toggleTheme = useCallback(() => {
    const newDark = !darkMode
    setDarkMode(newDark)
    document.documentElement.classList.toggle("dark", newDark)
    try {
      localStorage.setItem("theme", newDark ? "dark" : "light")
    } catch {}
  }, [darkMode])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => ({
    label: breadcrumbMap[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6 gap-2">
          {/* Left: Mobile hamburger + breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={toggleMobile}>
              <Menu className="h-5 w-5" />
            </Button>

            <nav className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                  {i === 0 && <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  {crumb.isLast ? (
                    <span className="font-medium text-foreground truncate">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            <span className="sm:hidden text-sm font-medium truncate">
              {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Global Search */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center gap-2 text-muted-foreground border border-border/50 rounded-lg h-8 w-48 lg:w-56 justify-start text-xs"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Search pages...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Quick Create */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/posts/new")}>
                  <FileText className="mr-2 h-4 w-4" /> New Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/media")}>
                  <Image className="mr-2 h-4 w-4" /> Upload Media
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/keywords")}>
                  <Hash className="mr-2 h-4 w-4" /> New Keyword
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/users")}>
                  <Users className="mr-2 h-4 w-4" /> New User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Visit Site */}
            <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex text-muted-foreground">
              <Link href="/" target="_blank">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                <span className="text-xs">Visit Site</span>
              </Link>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background tabular-nums">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-72 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet</p>
                  ) : (
                    notifications.map((notif) => {
                      const Icon =
                        notif.type === "critical" ? XCircle :
                        notif.type === "warning" ? AlertTriangle :
                        notif.type === "success" ? CheckCircle2 : Info
                      return (
                        <DropdownMenuItem
                          key={notif.id}
                          className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                          onClick={() => {
                            markRead(notif.id)
                            if (notif.href) router.push(notif.href)
                          }}
                        >
                          <Icon className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            notif.type === "critical" && "text-red-500",
                            notif.type === "warning" && "text-yellow-500",
                            notif.type === "success" && "text-emerald-500",
                            notif.type === "info" && "text-blue-500",
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm truncate", notif.read ? "text-muted-foreground" : "text-foreground font-medium")}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                          </div>
                        </DropdownMenuItem>
                      )
                    })
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-xs text-muted-foreground" onClick={() => router.push("/admin")}>
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">TP</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="font-medium">Techpivo Admin</span>
                    <span className="text-xs text-muted-foreground">Administrator</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/users")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Global Search Command Palette */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search pages, posts, settings..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {["Overview", "Content", "SEO", "Distribution", "Monetization", "Analytics", "Administration", "Tools"].map((category) => {
            const items = searchItems.filter((i) => i.category === category)
            if (items.length === 0) return null
            return (
              <CommandGroup key={category} heading={category}>
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.href}
                      onSelect={() => {
                        setSearchOpen(false)
                        router.push(item.href)
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )
          })}
        </CommandList>
      </CommandDialog>
    </>
  )
}

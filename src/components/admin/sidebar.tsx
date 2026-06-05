"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FileText, FolderTree, Rss, Image,
  DollarSign, ShoppingBag, BarChart3, SearchCheck,
  Globe, Settings, Users, MessageSquare, Mail,
  Bell, Lightbulb, Share2, Shield, Mic, Search
} from "lucide-react"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/rss-feeds", label: "RSS Feeds", icon: Rss },
  { href: "/admin/keywords", label: "Keywords", icon: Search },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/ads", label: "Ads", icon: DollarSign },
  { href: "/admin/affiliate", label: "Affiliate", icon: ShoppingBag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/seo", label: "SEO", icon: SearchCheck },
  { href: "/admin/indexing", label: "Indexing", icon: Globe },
  { href: "/admin/social", label: "Social", icon: Share2 },
  { href: "/admin/integrations", label: "Integrations", icon: Settings },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/push", label: "Push Notifications", icon: Bell },
  { href: "/admin/suggest", label: "Content Suggestions", icon: Lightbulb },
  { href: "/admin/settings", label: "Settings", icon: Globe },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/reporters", label: "Reporters", icon: Mic },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-background h-screen sticky top-0 overflow-y-auto hidden lg:block">
      <div className="p-4 border-b">
        <Link href="/admin" className="text-xl font-black">
          Blizine
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
      </div>
      <nav className="p-2 space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon
          const active = pathname === link.href || pathname.startsWith(link.href + "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

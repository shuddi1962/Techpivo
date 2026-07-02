"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FileText, FolderTree, Rss, Image,
  DollarSign, ShoppingBag, BarChart3, SearchCheck,
  Globe, Settings, Users, MessageSquare, Mail,
  Bell, Lightbulb, Share2, Shield, Mic, Search,
  Brain, FlaskConical, HeartPulse, Calendar, Swords,
  TrendingUp, FileBarChart, Cpu, Key, Wrench, Lock, Network, Rocket, Trophy, BookOpen
} from "lucide-react"

interface NavGroup {
  label: string
  links: { href: string; label: string; icon: any }[]
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
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    links: [
      { href: "/admin/comments", label: "Comments", icon: MessageSquare },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/roles", label: "Roles", icon: Shield },
      { href: "/admin/reporters", label: "Reporters", icon: Mic },
      { href: "/admin/security", label: "Security", icon: Lock },
      { href: "/admin/integrations", label: "Integrations", icon: Settings },
      { href: "/admin/settings", label: "Settings", icon: Key },
    ],
  },
  {
    label: "Tools & Utilities",
    links: [
      { href: "/admin/tools", label: "Tools Center", icon: Wrench },
      { href: "/admin/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { href: "/admin/launch-center", label: "Launch Center", icon: Rocket },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/community", label: "Community Hub", icon: Users },
      { href: "/community/forum", label: "Forum", icon: MessageSquare },
      { href: "/community/quiz", label: "Quizzes", icon: Brain },
      { href: "/admin/quiz-builder", label: "Quiz Builder", icon: Brain },
      { href: "/community/polls", label: "Polls", icon: BarChart3 },
      { href: "/admin/poll-builder", label: "Poll Builder", icon: BarChart3 },
      { href: "/community/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/community/learning-paths", label: "Learning Paths", icon: BookOpen },
      { href: "/community/events", label: "Events", icon: Calendar },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-background h-screen sticky top-0 overflow-y-auto hidden lg:block">
      <div className="p-4 border-b">
        <Link href="/admin">
           <img src="/logo.svg?v=6" alt="Techpivo" style={{ height: 32, width: 'auto' }} />
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Enterprise CMS</p>
      </div>
      <nav className="p-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon
                const active = pathname === link.href || pathname.startsWith(link.href + "/")
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
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
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

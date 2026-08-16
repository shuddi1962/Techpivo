import { TrendingWidget } from "@/components/sidebar/TrendingWidget"
import { SocialWidget } from "@/components/sidebar/SocialWidget"
import { NewsletterWidget } from "@/components/sidebar/NewsletterWidget"
import { PopularWidget } from "@/components/sidebar/PopularWidget"
import { TagsWidget } from "@/components/sidebar/TagsWidget"
import { SponsoredWidget } from "@/components/ads/sponsored-widget"
import { AdSlot } from "@/components/ads/AdSlot"

interface SidebarProps {
  trending: any[]
  popular: any[]
  categories: any[]
  tags: string[]
  variant?: "home" | "post" | "category"
}

export function Sidebar({ trending, popular, categories, tags, variant = "home" }: SidebarProps) {
  const top = variant === "post" ? "post_sidebar_top" : variant === "category" ? "category_sidebar" : "home_sidebar_top"
  const mid = variant === "post" ? "post_sidebar_mid" : variant === "category" ? "home_sidebar_mid" : "home_sidebar_mid"

  return (
    <aside className="sidebar">
      <SponsoredWidget />
      <AdSlot positionKey={top} className="mb-4" />
      <TrendingWidget posts={trending} />
      <AdSlot positionKey={mid} className="mb-4" />
      <SocialWidget />
      <NewsletterWidget />
      <PopularWidget posts={popular} />
      <TagsWidget tags={tags} />
    </aside>
  )
}
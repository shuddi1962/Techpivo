import { AdSlot } from "@/components/ads/AdSlot"
import { AdsterraBanner } from "@/components/ads/adsterra-banner"
import { TrendingWidget } from "@/components/sidebar/TrendingWidget"
import { SocialWidget } from "@/components/sidebar/SocialWidget"
import { NewsletterWidget } from "@/components/sidebar/NewsletterWidget"
import { PopularWidget } from "@/components/sidebar/PopularWidget"
import { TagsWidget } from "@/components/sidebar/TagsWidget"

interface SidebarProps {
  trending: any[]
  popular: any[]
  categories: any[]
  tags: string[]
}

export function Sidebar({ trending, popular, categories, tags }: SidebarProps) {
  return (
    <aside className="sidebar">
      <TrendingWidget posts={trending} />
      <AdsterraBanner size="300x250" className="mb-6" />
      <SocialWidget />
      <NewsletterWidget />
      <PopularWidget posts={popular} />
      <AdsterraBanner size="160x600" className="my-6" />
      <TagsWidget tags={tags} />
    </aside>
  )
}

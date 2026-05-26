import { TrendingWidget } from "@/components/sidebar/TrendingWidget"
import { SocialWidget } from "@/components/sidebar/SocialWidget"
import { NewsletterWidget } from "@/components/sidebar/NewsletterWidget"
import { PopularWidget } from "@/components/sidebar/PopularWidget"
import { CategoriesWidget } from "@/components/sidebar/CategoriesWidget"
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

      <SocialWidget />

      <NewsletterWidget />

      <PopularWidget posts={popular} />

      <CategoriesWidget categories={categories} />

      <TagsWidget tags={tags} />
    </aside>
  )
}

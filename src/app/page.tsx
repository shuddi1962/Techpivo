import { HeroSection } from "@/components/home/hero-section"
import { CategoryTabs } from "@/components/home/category-tabs"
import { SecondaryRow } from "@/components/home/secondary-row"
import { TrendingGrid } from "@/components/home/trending-grid"
import { Sidebar } from "@/components/layout/sidebar"

export default function HomePage() {
  return (
    <div className="container py-6">
      <HeroSection />
      
      {/* Ad Banner */}
      <div className="ad-container min-h-[90px] mb-10 rounded-lg">
        <span className="ad-label">Advertisement</span>
        <p className="text-xs text-muted-foreground">728 × 90 Leaderboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <CategoryTabs />
          <SecondaryRow />
          <TrendingGrid />
        </div>
        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </div>
  )
}

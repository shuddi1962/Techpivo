import { createClient } from "@/lib/supabase/server"
import { HomeHero } from "@/components/home/home-hero"
import { TrendingTicker } from "@/components/home/trending-ticker"
import { DontMiss } from "@/components/home/dont-miss"
import { LatestArticles } from "@/components/home/latest-articles"
import { NewsletterSection } from "@/components/home/newsletter-section"
import { AdSlot } from "@/components/ads/AdSlot"
import { AffiliateStrip } from "@/components/affiliate/affiliate-strip"

export default async function HomePage() {
  const supabase = createClient()

  const [featuredRes, trendingRes, categoriesRes, latestRes] = await Promise.all([
    supabase
      .from("posts")
      .select("*, category:categories(*), author:profiles(*)")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(10),
    supabase
      .from("categories")
      .select("*")
      .order("name"),
    supabase
      .from("posts")
      .select("*, category:categories(*), author:profiles(*)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(9),
  ])

  let heroPosts = featuredRes.data as any[]
  if (!heroPosts || heroPosts.length === 0) {
    const { data: latest } = await supabase
      .from("posts")
      .select("*, category:categories(*), author:profiles(*)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3)
    heroPosts = (latest || []) as any
  }

  const trendingPosts = trendingRes.data || []
  const categories = categoriesRes.data || []
  const latestPosts = latestRes.data || []

  return (
    <div>
      <HomeHero posts={heroPosts || []} />

      <TrendingTicker posts={trendingPosts} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DontMiss categories={categories} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <AdSlot slot="home_970" width={970} height={90} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LatestArticles initialPosts={latestPosts} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AffiliateStrip />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <NewsletterSection />
      </div>
    </div>
  )
}

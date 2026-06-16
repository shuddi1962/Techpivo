import { createClient } from "@/lib/supabase/server"
import { TopBar } from "@/components/layout/TopBar"
import { Header } from "@/components/layout/Header"
import { MainNav } from "@/components/layout/MainNav"
import { BreakingTicker } from "@/components/home/BreakingTicker"
import { AdSlot } from "@/components/ads/AdSlot"
import { HeroSection } from "@/components/home/HeroSection"
import { CategoryTabSection } from "@/components/home/CategoryTabSection"
import { LatestGrid } from "@/components/home/LatestGrid"
import { CategoryStrip } from "@/components/home/CategoryStrip"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { Sidebar } from "@/components/layout/Sidebar"
import { Footer } from "@/components/layout/Footer"

export const revalidate = 60

export default async function HomePage() {
  let supabase: ReturnType<typeof createClient> | null = null
  try {
    supabase = createClient()
  } catch (e) {
    console.error("Failed to create Supabase client", e)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  let heroPosts: any[] | null = null
  let latestPosts: any[] | null = null
  let tickerPosts: any[] | null = null
  let trendingPosts: any[] | null = null
  let popularPosts: any[] | null = null
  let categories: any[] | null = null
  let aiPosts: any[] | null = null
  let cyberPosts: any[] | null = null
  let gadgetPosts: any[] | null = null
  let techNewsPosts: any[] | null = null
  let desktopPosts: any[] | null = null
  let subcategories: any[] | null = null
  let allTags: any[] | null = null

  if (supabase) {
    try {
      const shuffle = <T,>(arr: T[]): T[] => {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]]
        }
        return a
      }

      const results = await Promise.allSettled([
        supabase.from("posts").select("*, categories(name,slug,color)")
          .eq("status", "published")
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false }).limit(30),

        supabase.from("posts").select("*, categories(name,slug,color)")
          .eq("status", "published")
          .order("published_at", { ascending: false }).limit(30),

        supabase.from("posts").select("title,slug")
          .eq("status", "published")
          .order("published_at", { ascending: false }).limit(10),

        supabase.from("posts").select("id,title,slug,views,categories(name,slug,color)")
          .eq("status", "published")
          .gte("published_at", sevenDaysAgo)
          .order("views", { ascending: false }).limit(5),

        supabase.from("posts").select("id,title,slug,featured_image,views,categories(name,slug,color)")
          .eq("status", "published")
          .not("featured_image", "is", null)
          .order("views", { ascending: false }).limit(5),

        supabase.from("categories").select("id,name,slug,color,icon").order("name"),

        supabase.from("posts").select("*, categories!inner(name,slug,color)")
          .eq("status", "published").eq("categories.slug", "ai-automation")
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false }).limit(10),

        supabase.from("posts").select("*, categories!inner(name,slug,color)")
          .eq("status", "published").eq("categories.slug", "cybersecurity")
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false }).limit(10),

        supabase.from("posts").select("*, categories!inner(name,slug,color)")
          .eq("status", "published").eq("categories.slug", "gadgets")
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false }).limit(10),

        supabase.from("posts").select("*, categories!inner(name,slug,color)")
          .eq("status", "published").eq("categories.slug", "tech-news")
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false }).limit(10),

        supabase.from("posts").select("*, categories!inner(name,slug,color)")
          .eq("status", "published").eq("categories.slug", "desktops")
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false }).limit(10),

        supabase.from("subcategories").select("*, categories(name,slug,color)")
          .order("name"),

        supabase.from("posts").select("seo_keywords")
          .eq("status", "published").limit(100),
      ])

      const extract = (r: any, i: number) =>
        results[i]?.status === "fulfilled" ? results[i].value.data : null

      const allRecent = extract(results[0], 0) || []
      const shuffled = shuffle(allRecent)
      heroPosts = shuffled.slice(0, 6)

      const allLatest = extract(results[1], 1) || []
      const shuffledLatest = shuffle(allLatest)
      latestPosts = shuffledLatest.slice(0, 10)
      tickerPosts = extract(results[2], 2)
      trendingPosts = extract(results[3], 3)
      popularPosts = extract(results[4], 4)
      categories = extract(results[5], 5)

      const shuffleCat = (data: any[] | null) => shuffle(data || []).slice(0, 4)
      aiPosts = shuffleCat(extract(results[6], 6))
      cyberPosts = shuffleCat(extract(results[7], 7))
      gadgetPosts = shuffleCat(extract(results[8], 8))
      techNewsPosts = shuffleCat(extract(results[9], 9))
      desktopPosts = shuffleCat(extract(results[10], 10))

      subcategories = extract(results[11], 11)
      allTags = extract(results[12], 12)
    } catch (e) {
      console.error("Homepage data fetch failed", e)
    }
  }

  if (!heroPosts || heroPosts.length === 0) {
    return (
      <div>
        <TopBar />
        <Header />
        <MainNav categories={[]} />
        <main className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-lg">
            <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Welcome to Techpivo</h1>
            <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
              Tech, decoded. Fast. We&apos;re preparing the latest tech news and articles for you. Check back soon.
            </p>
          </div>
        </main>
        <NewsletterStrip />
        <Footer categories={[]} recentPosts={[]} />
      </div>
    )
  }

  const tags = Array.from(new Set(
    (allTags || []).flatMap((p: any) => p.seo_keywords || [])
  )).slice(0, 20) as string[]

  const cats = (categories || []).map((cat: any) => ({ ...cat }))

  const featuredPost = (heroPosts || [])[0] || null
  const heroSecondary = (heroPosts || []).slice(1, 5)

  const subcatsByCat: Record<string, any[]> = {}
  for (const sub of (subcategories || [])) {
    const catSlug = sub.categories?.slug
    if (!subcatsByCat[catSlug]) subcatsByCat[catSlug] = []
    subcatsByCat[catSlug].push(sub)
  }

  return (
    <div>
      <TopBar />
      <Header />
      <MainNav categories={cats} />
      <BreakingTicker posts={tickerPosts || []} />

      <div className="site-main">
        <div className="main-layout">
          <div className="content-col">
            <HeroSection
              featured={featuredPost}
              secondary={heroSecondary}
            />

            <CategoryTabSection categories={cats} posts={latestPosts || []} />

            <AdSlot positionKey="home_infeed_1" className="ad-mid" />

            <LatestGrid posts={latestPosts || []} />

            <AdSlot positionKey="home_infeed_2" className="ad-mid" />

            <CategoryStrip
              categoryName="AI & Automation"
              categorySlug="ai-automation"
              categoryColor="#F59E0B"
              posts={aiPosts || []}
              subcategories={subcatsByCat["ai-automation"] || []}
            />

            <AdSlot positionKey="home_infeed_3" className="ad-mid" />

            <CategoryStrip
              categoryName="Cybersecurity"
              categorySlug="cybersecurity"
              categoryColor="#EF4444"
              posts={cyberPosts || []}
              subcategories={subcatsByCat["cybersecurity"] || []}
            />

            <AdSlot positionKey="home_infeed_4" className="ad-mid" />

            <CategoryStrip
              categoryName="Gadgets"
              categorySlug="gadgets"
              categoryColor="#EC4899"
              posts={gadgetPosts || []}
              subcategories={subcatsByCat["gadgets"] || []}
            />

            <AdSlot positionKey="home_infeed_5" className="ad-mid" />

            <CategoryStrip
              categoryName="Tech News"
              categorySlug="tech-news"
              categoryColor="#3B82F6"
              posts={techNewsPosts || []}
              subcategories={subcatsByCat["tech-news"] || []}
            />

            <AdSlot positionKey="home_infeed_6" className="ad-mid" />

            <CategoryStrip
              categoryName="Desktops"
              categorySlug="desktops"
              categoryColor="#A855F7"
              posts={desktopPosts || []}
              subcategories={subcatsByCat["desktops"] || []}
            />
          </div>

          <Sidebar
            trending={trendingPosts || []}
            popular={popularPosts || []}
            categories={cats}
            tags={tags}
          />
        </div>
      </div>

      <NewsletterStrip />

      <Footer categories={cats} recentPosts={latestPosts || []} />
    </div>
  )
}

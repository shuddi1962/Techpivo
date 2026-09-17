import type { Metadata } from "next"
import { createPublicClient } from "@/lib/supabase/server"
import { TopBar } from "@/components/layout/TopBar"
import { Header } from "@/components/layout/Header"
import { MainNav } from "@/components/layout/MainNav"
import { BreakingTicker } from "@/components/home/BreakingTicker"
import { HeroSection } from "@/components/home/HeroSection"
import { CategoryTabSection } from "@/components/home/CategoryTabSection"
import { LatestGrid } from "@/components/home/LatestGrid"
import { CategoryStrip } from "@/components/home/CategoryStrip"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { Sidebar } from "@/components/layout/Sidebar"
import { Footer } from "@/components/layout/Footer"
import SiteBlock from "@/components/layout/site-block"
import { AdSlot } from "@/components/ads/AdSlot"
import { SITE_NAME, SITE_URL, SITE_TAGLINE } from "@/lib/constants"

export const revalidate = 60

export const metadata: Metadata = {
  title: `${SITE_NAME} — Tech News, Tutorials & AI-Powered Insights`,
  description: "Techpivo delivers expert tech news, programming tutorials, cybersecurity guides, AI insights, gadget reviews, and developer tools. Stay ahead with in-depth coverage of the technologies shaping our world.",
  openGraph: {
    title: `${SITE_NAME} — Tech News, Tutorials & AI-Powered Insights`,
    description: "Techpivo delivers expert tech news, programming tutorials, cybersecurity guides, AI insights, gadget reviews, and developer tools. Stay ahead with in-depth coverage of the technologies shaping our world.",
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
  },
  twitter: {
    title: `${SITE_NAME} — Tech News, Tutorials & AI-Powered Insights`,
    description: "Techpivo delivers expert tech news, programming tutorials, cybersecurity guides, AI insights, gadget reviews, and developer tools.",
    images: [`${SITE_URL}/og-home.png`],
  },
}

export default async function HomePage() {
  let supabase: ReturnType<typeof createPublicClient> | null = null
  try {
    supabase = createPublicClient()
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
  let programmingPosts: any[] | null = null
  let reviewsPosts: any[] | null = null
  let tutorialsPosts: any[] | null = null
  let networkingPosts: any[] | null = null
  let digitalBusinessPosts: any[] | null = null
  let gamingPosts: any[] | null = null
  let subcategories: any[] | null = null
  let allTags: any[] | null = null
  let socialUrls: Record<string, string> = {}

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

        supabase.from("categories").select("id,name,slug,color,icon").eq("is_active", true).order("name"),

        supabase.from("posts").select("*, categories!inner(name,slug,color)")
          .eq("status", "published")
          .in("categories.slug", [
            "ai-automation","cybersecurity","gadgets","tech-news",
            "desktops","programming","reviews","tutorials",
            "networking-it","digital-business","gaming",
          ])
          .not("featured_image", "is", null)
          .order("published_at", { ascending: false })
          .limit(200),

        supabase.from("subcategories").select("*, categories(name,slug,color)")
          .eq("is_active", true)
          .order("name"),

        supabase.from("posts").select("seo_keywords")
          .eq("status", "published").limit(100),

        supabase.from("social_accounts").select("platform, credentials"),
      ])

      const extract = (r: any, i: number) =>
        results[i]?.status === "fulfilled" ? results[i].value.data : null

      const allRecent = extract(results[0], 0) || []
      const sticky = allRecent.filter((p: any) => p.is_sticky === true)
      const shuffled = shuffle(allRecent.filter((p: any) => p.is_sticky !== true))
      heroPosts = [...sticky, ...shuffled].slice(0, 6)

      const allLatest = extract(results[1], 1) || []
      const shuffledLatest = shuffle(allLatest)
      latestPosts = shuffledLatest.slice(0, 10)
      tickerPosts = extract(results[2], 2)
      trendingPosts = extract(results[3], 3)
      popularPosts = extract(results[4], 4)
      categories = extract(results[5], 5)

      const catPostsAll = extract(results[6], 6) || []
      const bucketByCategory = (slug: string) => {
        const filtered = catPostsAll.filter((p: any) => p.categories?.slug === slug)
        return shuffle(filtered).slice(0, 4)
      }
      aiPosts = bucketByCategory("ai-automation")
      cyberPosts = bucketByCategory("cybersecurity")
      gadgetPosts = bucketByCategory("gadgets")
      techNewsPosts = bucketByCategory("tech-news")
      desktopPosts = bucketByCategory("desktops")
      programmingPosts = bucketByCategory("programming")
      reviewsPosts = bucketByCategory("reviews")
      tutorialsPosts = bucketByCategory("tutorials")
      networkingPosts = bucketByCategory("networking-it")
      digitalBusinessPosts = bucketByCategory("digital-business")
      gamingPosts = bucketByCategory("gaming")

      subcategories = extract(results[7], 7)
      allTags = extract(results[8], 8)
      const socialData = extract(results[9], 9)
      if (socialData) {
        const map: Record<string, string> = {}
        socialData.forEach((a: any) => {
          const creds = a.credentials
          if (creds?.follow_url) map[a.platform] = creds.follow_url
        })
        socialUrls = map
      }
    } catch (e) {
      console.error("Homepage data fetch failed", e)
    }
  }

  if (!heroPosts || heroPosts.length === 0) {
    return (
      <div>
        <TopBar socialUrls={socialUrls} />
        <Header />
        <MainNav categories={[]} />
        <main>
          <div className="site-main">
            <div className="main-layout">
              <div className="content-col">

                {/* Hero Section */}
                <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 md:p-12 mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Explore Technology With Techpivo
                  </h1>
                  <p className="text-base md:text-lg leading-relaxed max-w-3xl mb-6" style={{ color: "var(--text-secondary, var(--muted))" }}>
                    Techpivo is a technology publishing platform covering artificial intelligence, cybersecurity, programming, web development, gadgets, and digital business. We combine in-depth editorial coverage with 55+ free browser-based developer and productivity tools — all running locally in your browser with zero uploads.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="/tools" className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
                      Browse All Tools
                    </a>
                    <a href="/community" className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--surface)] transition">
                      Join the Community
                    </a>
                  </div>
                </section>

                {/* What Techpivo Covers */}
                <section className="mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                    What We Cover
                  </h2>
                  <p className="text-sm mb-6" style={{ color: "var(--text-secondary, var(--muted))" }}>
                    In-depth articles, tutorials, and hands-on guides across the technology landscape.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { title: "AI & Automation", desc: "Latest developments in artificial intelligence, machine learning, large language models, and AI-powered tools reshaping industries.", color: "#F59E0B" },
                      { title: "Cybersecurity", desc: "Security advisories, vulnerability analyses, privacy guides, and hardening tutorials for individuals and organizations.", color: "#EF4444" },
                      { title: "Programming", desc: "Tutorials, best practices, and deep dives across Python, JavaScript, Rust, Go, and other languages developers use daily.", color: "#06B6D4" },
                      { title: "Web Development", desc: "Frontend frameworks, backend architectures, deployment strategies, and performance optimization for modern web apps.", color: "#3B82F6" },
                      { title: "Gadgets & Reviews", desc: "Hands-on product reviews, buying guides, and comparisons for smartphones, laptops, peripherals, and consumer tech.", color: "#EC4899" },
                      { title: "Digital Business", desc: "SaaS tools, startup strategies, cloud infrastructure, and digital transformation insights for tech-driven businesses.", color: "#A855F7" },
                    ].map((topic) => (
                      <div key={topic.title} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 hover:shadow-md transition">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: topic.color }} />
                          <h3 className="font-semibold text-sm">{topic.title}</h3>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary, var(--muted))" }}>{topic.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Free Developer Tools */}
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Free Developer & Productivity Tools
                    </h2>
                    <a href="/tools" className="text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>View all</a>
                  </div>
                  <p className="text-sm mb-6" style={{ color: "var(--text-secondary, var(--muted))" }}>
                    55+ browser-based tools for developers, SEO professionals, and everyday tasks. Every tool runs entirely in your browser — nothing is uploaded.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: "JSON Formatter & Validator", desc: "Format, validate, and minify JSON data instantly. Debug API responses and config files with syntax highlighting and error detection.", slug: "json-formatter", category: "Developer Tools" },
                      { name: "Password Generator", desc: "Generate cryptographically strong passwords with customizable length, character sets, and real-time strength scoring using crypto.getRandomValues().", slug: "password-generator", category: "Security Tools" },
                      { name: "Meta Tag Generator", desc: "Create optimized title tags, meta descriptions, Open Graph tags, and Twitter Cards for any webpage. Preview how your page appears in search results.", slug: "meta-tag-generator", category: "SEO Tools" },
                      { name: "Regex Tester", desc: "Test regular expressions against sample text with real-time matching, capture groups, and PCRE-compatible syntax highlighting.", slug: "regex-tester", category: "Developer Tools" },
                      { name: "Image Compressor", desc: "Reduce image file sizes by 40-70% using client-side Canvas API compression. Supports JPEG, PNG, and WebP output with quality control.", slug: "image-compressor", category: "Image Tools" },
                      { name: "Currency Converter", desc: "Convert between 170+ currencies with live exchange rates updated daily. Works offline with cached rates and supports custom amounts.", slug: "currency-converter", category: "Calculators" },
                    ].map((tool) => (
                      <a key={tool.slug} href={`/tools/${tool.slug}`} className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 hover:shadow-md transition group">
                        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--accent)" }}>{tool.category}</span>
                        <h3 className="font-semibold text-sm mt-1 group-hover:underline">{tool.name}</h3>
                        <p className="text-xs leading-relaxed mt-1" style={{ color: "var(--text-secondary, var(--muted))" }}>{tool.desc}</p>
                      </a>
                    ))}
                  </div>
                </section>

                {/* Why Techpivo */}
                <section className="mb-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Why Techpivo
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-semibold text-sm mb-1">Privacy-First Tools</h3>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary, var(--muted))" }}>
                        Every tool runs entirely in your browser using the Canvas API, Web Crypto, and client-side JavaScript. No data is ever uploaded to a server.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">Research-Backed Content</h3>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary, var(--muted))" }}>
                        Our articles are grounded in official documentation, primary sources, and expert analysis — not rehashed press releases or AI-generated summaries.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">Built for Developers</h3>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary, var(--muted))" }}>
                        From JSON formatting to regex testing, DNS lookups to schema generators — tools built by developers for the workflows they actually use.
                      </p>
                    </div>
                  </div>
                </section>

                {/* About Techpivo */}
                <section className="mb-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                    About Techpivo
                  </h2>
                  <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary, var(--muted))" }}>
                    <p>
                      Techpivo is an independent technology publication and tool platform. We cover artificial intelligence, cybersecurity, programming, web development, gadgets, and digital business — combining editorial journalism with practical, browser-based developer utilities.
                    </p>
                    <p>
                      Our editorial process follows strict sourcing standards. Every article is grounded in official documentation, primary sources, and verified data before publication. We maintain full editorial independence — all opinions and recommendations are our own, and sponsored content is clearly labeled.
                    </p>
                    <p>
                      The Techpivo tools center provides 55+ free utilities — JSON formatters, password generators, SEO analyzers, image compressors, PDF processors, calculators, and more. Every tool runs locally in your browser using client-side JavaScript, Web Crypto, and the Canvas API. No files are uploaded. No accounts are required.
                    </p>
                    <p>
                      We are committed to accuracy, transparency, and user privacy. If you find an error in our content, our <a href="/corrections-policy" className="underline hover:opacity-80" style={{ color: "var(--accent)" }}>corrections policy</a> explains how we handle corrections promptly and transparently.
                    </p>
                  </div>
                </section>

                {/* Editorial Standards */}
                <section className="mb-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Our Editorial Standards
                  </h2>
                  <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary, var(--muted))" }}>
                    <p>
                      TechPivo maintains high editorial standards for all published content. Articles undergo research, fact verification, and SEO validation before publication. We prioritize accuracy over speed, and every factual claim is attributed to a named source or official documentation.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-center text-xs leading-5 text-green-700">✓</span>
                        <div>
                          <h4 className="font-semibold text-xs">Original Research</h4>
                          <p className="text-xs">Every article starts with primary sources — official docs, press releases, and verified data.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-center text-xs leading-5 text-green-700">✓</span>
                        <div>
                          <h4 className="font-semibold text-xs">Expert Analysis</h4>
                          <p className="text-xs">Content provides actionable insight and context — not just rehashed press releases.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-center text-xs leading-5 text-green-700">✓</span>
                        <div>
                          <h4 className="font-semibold text-xs">Transparent Corrections</h4>
                          <p className="text-xs">Errors are corrected promptly with a public changelog and dateModified metadata.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-center text-xs leading-5 text-green-700">✓</span>
                        <div>
                          <h4 className="font-semibold text-xs">Privacy Respect</h4>
                          <p className="text-xs">Analytics respect visitor privacy. No invasive tracking, no third-party data sales.</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4">
                      Read our full <a href="/editorial-policy" className="underline hover:opacity-80" style={{ color: "var(--accent)" }}>editorial policy</a> and <a href="/corrections-policy" className="underline hover:opacity-80" style={{ color: "var(--accent)" }}>corrections policy</a> for complete details.
                    </p>
                  </div>
                </section>

                <AdSlot positionKey="home_bottom_banner" />
              </div>

              <Sidebar
                trending={[]}
                popular={[]}
                categories={[]}
                tags={[]}
              />
            </div>
          </div>
        </main>
        <NewsletterStrip />
        <Footer categories={[]} recentPosts={[]} socialUrls={socialUrls} />
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
      <TopBar socialUrls={socialUrls} />
        <Header />
      <MainNav categories={cats} />
      <BreakingTicker posts={tickerPosts || []} />

      <div className="site-main">
        <div className="main-layout">
          <div className="content-col">
            <AdSlot positionKey="home_top_banner" />

            <HeroSection
              featured={featuredPost}
              secondary={heroSecondary}
            />

            <SiteBlock blockKey="home-intro" />

            <CategoryTabSection categories={cats} posts={latestPosts || []} />

            <LatestGrid posts={latestPosts || []} />

            <AdSlot positionKey="home_infeed_1" />

            <CategoryStrip
              categoryName="AI & Automation"
              categorySlug="ai-automation"
              categoryColor="#F59E0B"
              posts={aiPosts || []}
              subcategories={subcatsByCat["ai-automation"] || []}
            />

            <CategoryStrip
              categoryName="Cybersecurity"
              categorySlug="cybersecurity"
              categoryColor="#EF4444"
              posts={cyberPosts || []}
              subcategories={subcatsByCat["cybersecurity"] || []}
            />

            <CategoryStrip
              categoryName="Gadgets"
              categorySlug="gadgets"
              categoryColor="#EC4899"
              posts={gadgetPosts || []}
              subcategories={subcatsByCat["gadgets"] || []}
            />

            <CategoryStrip
              categoryName="Tech News"
              categorySlug="tech-news"
              categoryColor="#3B82F6"
              posts={techNewsPosts || []}
              subcategories={subcatsByCat["tech-news"] || []}
            />

            <CategoryStrip
              categoryName="Desktops"
              categorySlug="desktops"
              categoryColor="#A855F7"
              posts={desktopPosts || []}
              subcategories={subcatsByCat["desktops"] || []}
            />

            <CategoryStrip
              categoryName="Programming"
              categorySlug="programming"
              categoryColor="#06B6D4"
              posts={programmingPosts || []}
              subcategories={subcatsByCat["programming"] || []}
            />

            <CategoryStrip
              categoryName="Reviews"
              categorySlug="reviews"
              categoryColor="#F97316"
              posts={reviewsPosts || []}
              subcategories={subcatsByCat["reviews"] || []}
            />

            <CategoryStrip
              categoryName="Tutorials"
              categorySlug="tutorials"
              categoryColor="#10B981"
              posts={tutorialsPosts || []}
              subcategories={subcatsByCat["tutorials"] || []}
            />

            <CategoryStrip
              categoryName="Networking & IT"
              categorySlug="networking-it"
              categoryColor="#8B5CF6"
              posts={networkingPosts || []}
              subcategories={subcatsByCat["networking-it"] || []}
            />

            <CategoryStrip
              categoryName="Digital Business"
              categorySlug="digital-business"
              categoryColor="#EC4899"
              posts={digitalBusinessPosts || []}
              subcategories={subcatsByCat["digital-business"] || []}
            />

            <CategoryStrip
              categoryName="Gaming"
              categorySlug="gaming"
              categoryColor="#EF4444"
              posts={gamingPosts || []}
              subcategories={subcatsByCat["gaming"] || []}
            />

            <div className="tools-cta-banner">
              <h2 className="tools-cta-title">Free Tech Tools</h2>
              <p className="tools-cta-desc">
                Developer utilities, SEO tools, security checkers, and more. Fast, free, and private.
              </p>
              <a href="/tools" className="btn btn-white">
                Explore All Tools
              </a>
            </div>

            <AdSlot positionKey="home_bottom_banner" />
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

      <Footer categories={cats} recentPosts={latestPosts || []} socialUrls={socialUrls} />
    </div>
  )
}

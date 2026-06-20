import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { SITE_NAME, SITE_URL } from "@/lib/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: `Sitemap – ${SITE_NAME}`,
  description: `Browse the complete sitemap of ${SITE_NAME}. Find articles by category, author, series, or browse all published content.`,
  alternates: { canonical: `${SITE_URL}/sitemap` },
  openGraph: { title: `Sitemap – ${SITE_NAME}`, description: `Browse all content on ${SITE_NAME}.`, url: `${SITE_URL}/sitemap` },
  twitter: { card: "summary_large_image", title: `Sitemap – ${SITE_NAME}` },
}

const staticPages = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Advertise With Us", href: "/advertise" },
  { label: "Write For Us", href: "/write-for-us" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cookies Policy", href: "/cookies-policy" },
  { label: "Terms of Use", href: "/terms-of-use" },
  { label: "RSS Feed", href: "/rss.xml" },
]

export default async function SitemapPage() {
  const supabase = createClient()

  const [catsRes, postsRes, seriesRes, profilesRes] = await Promise.all([
    supabase.from("categories").select("*, subcategories(*)").order("name"),
    supabase.from("posts").select("slug, title, published_at, categories(name, slug)").eq("status", "published").order("published_at", { ascending: false }).limit(50),
    supabase.from("series").select("slug, name").order("name"),
    supabase.from("profiles").select("username, full_name, avatar_url").order("full_name"),
  ])

  const categories = catsRes.data || []
  const posts = postsRes.data || []
  const series = seriesRes.data || []
  const profiles = profilesRes.data || []

  return (
    <div className="w-full">
      <div className="relative overflow-hidden mb-12 min-h-[240px] flex items-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=60 height=60 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M30 0v60M0 30h60%22 stroke=%22%23fff%22 stroke-width=%22.5%22 fill=%22none%22/%3E%3C/svg%3E")' }} />
        </div>
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-12 text-white max-w-4xl">
          <h1 className="text-4xl font-bold mb-3">Sitemap</h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Browse all content on {SITE_NAME} — organized by category, author, series, and more.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-16 max-w-6xl mx-auto space-y-12">

        {/* Static Pages */}
        <section>
          <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent text-xs font-bold">P</span>
            Pages
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {staticPages.map(p => (
              <Link key={p.href} href={p.href} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm hover:border-accent/50 hover:bg-accent/5 transition-colors">
                <span className="text-accent">{p.label === "Home" ? "⌂" : "›"}</span>
                <span>{p.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">C</span>
              Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="rounded-xl border bg-card p-5">
                  <Link href={`/category/${cat.slug}`} className="text-lg font-bold hover:text-accent transition-colors">
                    {cat.name}
                  </Link>
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cat.subcategories.map((sub: any) => (
                        <Link key={sub.id} href={`/category/${cat.slug}/${sub.slug}`} className="inline-block rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors">
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Latest Posts */}
        {posts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold">R</span>
              Recent Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {posts.map(post => (
                <Link key={post.slug} href={`/${post.slug}`} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-accent/50 hover:bg-accent/5 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium group-hover:text-accent transition-colors line-clamp-1">{post.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {post.categories?.name && (
                        <>{post.categories.name} · </>
                      )}
                      {post.published_at && new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Series */}
          {series.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold">S</span>
                Series
              </h2>
              <div className="space-y-2">
                {series.map(s => (
                  <Link key={s.slug} href={`/series/${s.slug}`} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm hover:border-accent/50 hover:bg-accent/5 transition-colors">
                    <span className="text-accent">›</span>
                    <span>{s.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Authors */}
          {profiles.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold">A</span>
                Authors
              </h2>
              <div className="space-y-2">
                {profiles.map(profile => (
                  <Link key={profile.username} href={`/author/${profile.username}`} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 hover:border-accent/50 hover:bg-accent/5 transition-colors group">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                        {(profile.full_name || profile.username)[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium group-hover:text-accent transition-colors">{profile.full_name || profile.username}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

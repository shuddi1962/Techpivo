import { createClient } from "@/lib/supabase/server"
import { SITE_URL } from "@/lib/constants"
import type { MetadataRoute } from "next"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()
  const now = new Date().toISOString()

  let posts: any[] = [], categories: any[] = [], subcategories: any[] = []
  let profiles: any[] = [], series: any[] = [], kwArticles: any[] = []
  try {
    const [postsRes, catsRes, subsRes, profilesRes, seriesRes, kwArticlesRes] = await Promise.all([
      supabase.from("posts").select("slug, updated_at, published_at, robots_noindex, author_id, category_id").eq("status", "published").order("published_at", { ascending: false }).limit(500),
      supabase.from("categories").select("id, slug"),
      supabase.from("subcategories").select("slug, category_id"),
      supabase.from("profiles").select("username, id"),
      supabase.from("series").select("slug"),
      supabase.from("keyword_articles").select("slug, updated_at").eq("status", "published").order("published_at", { ascending: false }).limit(500),
    ])
    posts = postsRes.data || []
    categories = catsRes.data || []
    subcategories = subsRes.data || []
    profiles = profilesRes.data || []
    series = seriesRes.data || []
    kwArticles = kwArticlesRes.data || []
  } catch (e) {
    console.error("Sitemap data fetch failed, serving static pages only", e)
  }

  const staticPages: { path: string; priority: number; freq: "hourly" | "daily" | "weekly" | "monthly" }[] = [
    { path: "", priority: 1, freq: "hourly" },
    { path: "/sitemap", priority: 0.6, freq: "weekly" },
    { path: "/about", priority: 0.5, freq: "monthly" },
    { path: "/contact", priority: 0.3, freq: "monthly" },
    { path: "/privacy-policy", priority: 0.3, freq: "monthly" },
    { path: "/terms-of-use", priority: 0.3, freq: "monthly" },
    { path: "/cookies-policy", priority: 0.3, freq: "monthly" },
    { path: "/disclaimer", priority: 0.3, freq: "monthly" },
    { path: "/advertise", priority: 0.4, freq: "monthly" },
    { path: "/write-for-us", priority: 0.5, freq: "monthly" },
    { path: "/newsletter", priority: 0.4, freq: "weekly" },
    { path: "/tools", priority: 0.7, freq: "monthly" },
    { path: "/tools/json-formatter", priority: 0.6, freq: "monthly" },
    { path: "/tools/password-generator", priority: 0.6, freq: "monthly" },
    { path: "/tools/slug-generator", priority: 0.6, freq: "monthly" },
    { path: "/tools/word-counter", priority: 0.6, freq: "monthly" },
    { path: "/community", priority: 0.8, freq: "daily" },
    { path: "/community/forum", priority: 0.7, freq: "daily" },
    { path: "/community/quiz", priority: 0.7, freq: "weekly" },
    { path: "/community/polls", priority: 0.6, freq: "weekly" },
    { path: "/community/leaderboard", priority: 0.6, freq: "daily" },
    { path: "/community/learning-paths", priority: 0.6, freq: "monthly" },
  ]

  const entries: MetadataRoute.Sitemap = staticPages.map(p => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }))

  const noindexSlugs = new Set(posts.filter(p => (p as any).robots_noindex).map(p => p.slug))
  for (const post of posts) {
    if ((post as any).robots_noindex) continue
    entries.push({
      url: `${SITE_URL}/${post.slug}`,
      lastModified: post.updated_at || post.published_at || now,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  for (const cat of categories) {
    const catCount = posts.filter((p: any) => p.category_id === cat.id).length
    if (catCount < 2) continue
    entries.push({
      url: `${SITE_URL}/category/${cat.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    })
  }

  for (const sub of subcategories) {
    const cat = categories.find(c => c.id === sub.category_id)
    if (!cat) continue
    entries.push({
      url: `${SITE_URL}/category/${cat.slug}/${sub.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  const postSlugs = new Set(posts.map(p => p.slug))
  for (const kw of kwArticles) {
    if (postSlugs.has(kw.slug)) continue
    entries.push({
      url: `${SITE_URL}/${kw.slug}`,
      lastModified: kw.updated_at || now,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  const authorPostCounts = new Map<string, number>()
  for (const post of posts) {
    const authorId = (post as any).author_id
    if (authorId) authorPostCounts.set(authorId, (authorPostCounts.get(authorId) || 0) + 1)
  }
  for (const profile of profiles) {
    const articleCount = authorPostCounts.get(profile.id) || 0
    if (articleCount < 2) continue
    entries.push({
      url: `${SITE_URL}/author/${profile.username}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    })
  }

  for (const s of series) {
    entries.push({
      url: `${SITE_URL}/series/${s.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    })
  }

  return entries
}

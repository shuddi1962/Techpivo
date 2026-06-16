import { createClient } from "@/lib/supabase/server"
import { SITE_URL } from "@/lib/constants"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  const [postsRes, catsRes, profilesRes, seriesRes, kwArticlesRes] = await Promise.all([
    supabase.from("posts").select("slug, updated_at, robots_noindex").eq("status", "published").order("published_at", { ascending: false }),
    supabase.from("categories").select("slug"),
    supabase.from("profiles").select("username"),
    supabase.from("series").select("slug"),
    supabase.from("keyword_articles").select("slug, updated_at").eq("status", "published").order("published_at", { ascending: false }),
  ])

  const posts = postsRes.data || []
  const categories = catsRes.data || []
  const profiles = profilesRes.data || []
  const series = seriesRes.data || []
  const kwArticles = kwArticlesRes.data || []

  const staticPages: { path: string; priority: number; freq: "hourly" | "daily" | "weekly" | "monthly" }[] = [
    { path: "", priority: 1, freq: "hourly" },
    { path: "/about", priority: 0.5, freq: "monthly" },
    { path: "/contact", priority: 0.3, freq: "monthly" },
    { path: "/privacy-policy", priority: 0.3, freq: "monthly" },
    { path: "/terms-of-use", priority: 0.3, freq: "monthly" },
    { path: "/cookies-policy", priority: 0.3, freq: "monthly" },
    { path: "/disclaimer", priority: 0.3, freq: "monthly" },
    { path: "/advertise", priority: 0.4, freq: "monthly" },
    { path: "/write-for-us", priority: 0.5, freq: "monthly" },
    { path: "/newsletter", priority: 0.4, freq: "weekly" },
    { path: "/subscribe", priority: 0.4, freq: "weekly" },
  ]

  const entries: MetadataRoute.Sitemap = staticPages.map(p => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.freq,
    priority: p.priority,
  }))

  const noindexSlugs = new Set(posts.filter(p => (p as any).robots_noindex).map(p => p.slug))
  for (const post of posts) {
    if (noindexSlugs.has(post.slug)) continue
    entries.push({
      url: `${SITE_URL}/${post.slug}`,
      lastModified: post.updated_at || undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/category/${cat.slug}`,
      changeFrequency: "daily",
      priority: 0.9,
    })
  }

  const postSlugs = new Set(posts.map(p => p.slug))
  for (const kw of kwArticles) {
    if (postSlugs.has(kw.slug) || noindexSlugs.has(kw.slug)) continue // already in posts or noindex
    entries.push({
      url: `${SITE_URL}/${kw.slug}`,
      lastModified: kw.updated_at || undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  for (const profile of profiles) {
    entries.push({
      url: `${SITE_URL}/author/${profile.username}`,
      changeFrequency: "weekly",
      priority: 0.4,
    })
  }

  for (const s of series) {
    entries.push({
      url: `${SITE_URL}/series/${s.slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    })
  }

  return entries
}

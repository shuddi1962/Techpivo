import { createClient } from "@/lib/supabase/server"
import { SITE_URL } from "@/lib/constants"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  const [postsRes, catsRes, profilesRes, seriesRes, kwArticlesRes] = await Promise.all([
    supabase.from("posts").select("slug, updated_at").eq("status", "published").order("published_at", { ascending: false }),
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

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/write-for-us`, changeFrequency: "monthly", priority: 0.5 },
  ]

  for (const post of posts) {
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

  for (const kw of kwArticles) {
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

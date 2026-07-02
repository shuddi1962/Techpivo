import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()

  const [{ data: posts }, { data: categories }] = await Promise.all([
    supabase
      .from("posts")
      .select("slug, updated_at, created_at, views")
      .eq("status", "published")
      .order("updated_at", { ascending: false }),
    supabase
      .from("categories")
      .select("slug, updated_at")
      .order("name"),
  ])

  const urls: Array<{ loc: string; lastmod: string; priority: string; changefreq: string }> = []

  urls.push({
    loc: "https://techpivo.com",
    lastmod: new Date().toISOString(),
    priority: "1.0",
    changefreq: "daily",
  })

  categories?.forEach(cat => {
    urls.push({
      loc: `https://techpivo.com/category/${cat.slug}`,
      lastmod: (cat.updated_at || new Date()).toString(),
      priority: "0.8",
      changefreq: "weekly",
    })
  })

  posts?.forEach(post => {
    const views = post.views || 0
    let priority = "0.6"
    let changefreq = "monthly"
    if (views > 1000) { priority = "0.9"; changefreq = "weekly" }
    else if (views > 100) { priority = "0.7"; changefreq = "weekly" }

    urls.push({
      loc: `https://techpivo.com/${post.slug}`,
      lastmod: (post.updated_at || post.created_at || new Date()).toString(),
      priority,
      changefreq,
    })
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  })
}

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()

  const [postsRes, catsRes] = await Promise.all([
    supabase.from("posts").select("slug, updated_at").eq("status", "published").order("updated_at", { ascending: false }),
    supabase.from("categories").select("slug"),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blizine.com"

  const posts = postsRes.data || []
  const categories = catsRes.data || []

  const urls = [
    `<url><loc>${siteUrl}</loc><priority>1.0</priority></url>`,
    ...categories.map(
      (cat: any) => `<url><loc>${siteUrl}/category/${cat.slug}</loc><priority>0.8</priority></url>`
    ),
    ...posts.map(
      (post: any) =>
        `<url><loc>${siteUrl}/${post.slug}</loc><lastmod>${post.updated_at}</lastmod><priority>0.9</priority></url>`
    ),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"

  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, content, published_at, author:profiles(full_name), category:categories(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50)

  const items =
    posts
      ?.map(
        (post: any) => `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>${siteUrl}/${post.slug}</link>
    <guid>${siteUrl}/${post.slug}</guid>
    <description><![CDATA[${post.excerpt || ""}]]></description>
    <author>${post.author?.full_name || "Techpivo"}</author>
    <category>${post.category?.name || "Tech"}</category>
    <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
  </item>`
      )
      .join("") || ""

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Techpivo</title>
    <link>${siteUrl}</link>
    <description>Tech, decoded. Fast.</description>
    <language>en</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}

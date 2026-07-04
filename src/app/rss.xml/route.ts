import { createClient } from "@/lib/supabase/server"

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const supabase = createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"

  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, content, featured_image, published_at, author:profiles(full_name), category:categories(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50)

  const seen = new Set<string>()
  const deduped = (posts || []).filter(p => {
    const norm = p.title?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80) || ""
    if (seen.has(norm)) return false
    seen.add(norm)
    return true
  })

  const items =
    deduped
      ?.map(
        (post: any) => {
          const img = post.featured_image ? esc(post.featured_image) : ""
          return `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>${esc(siteUrl)}/${esc(post.slug)}</link>
    <guid>${esc(siteUrl)}/${esc(post.slug)}</guid>
    ${img ? `<media:content url="${img}" medium="image" type="image/jpeg" />
    <enclosure url="${img}" type="image/jpeg" length="0" />` : ""}
    <description><![CDATA[${post.excerpt || ""}]]></description>
    <author>${post.author?.full_name || "Techpivo"}</author>
    <category>${post.category?.name || "Tech"}</category>
    <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
  </item>`
        }
      )
      .join("") || ""

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Techpivo</title>
    <link>${esc(siteUrl)}</link>
    <description>Tech, decoded. Fast.</description>
    <language>en</language>
    <atom:link href="${esc(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>
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

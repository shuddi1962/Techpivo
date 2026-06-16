import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const PEXELS_API_KEY = "GH735sp9bohSxSm2PnTFewYGjsZvGS2UoE0JzLCMgFgG2bAV0UTihSVn"

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Techpivo/1.0)" },
    })
    if (!response.ok) return null
    const html = await response.text()

    const patterns = [
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
      /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        const imgUrl = match[1].split("?")[0]
        if (imgUrl.startsWith("http")) return imgUrl
        if (imgUrl.startsWith("//")) return "https:" + imgUrl
      }
    }
    return null
  } catch {
    return null
  }
}

async function searchPexels(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.pexels.com/v1/search?query=" + encodeURIComponent(query) + "&per_page=3",
      {
        headers: { Authorization: PEXELS_API_KEY },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data.photos?.length > 0) {
      return data.photos[0].src?.large || data.photos[0].src?.medium || null
    }
    return null
  } catch {
    return null
  }
}

export async function GET() {
  const { data: posts, error } = await getSupabase()
    .from("posts")
    .select("id, title, featured_image, original_source_url, category:categories(name)")
    .or("featured_image.is.null,featured_image.eq.")
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ updated: 0 })

  let updated = 0
  for (const post of posts) {
    try {
      let image: string | null = null

      // Try to fetch from original source
      if (post.original_source_url) {
        image = await fetchOgImage(post.original_source_url)
      }

      // Fallback to Pexels
      if (!image) {
        const searchQuery = post.title || (post as any).category?.name || "technology"
        image = await searchPexels(searchQuery.split(" ").slice(0, 5).join(" "))
      }

      if (image) {
        await getSupabase().from("posts").update({ featured_image: image }).eq("id", post.id)
        updated++
      }
    } catch {
      // skip
    }
  }

  return NextResponse.json({ updated, total: posts.length })
}

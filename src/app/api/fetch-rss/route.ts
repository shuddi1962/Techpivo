import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Parser from "rss-parser"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const parser = new Parser()

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200) || ("post-" + Date.now())
}

function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "")
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

function extractExcerpt(html: string, maxLength = 300): string {
  const text = html.replace(/<[^>]*>/g, "").trim()
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "..."
}

function extractFirstImageFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1] : null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function extractFeaturedImage(item: any, content: string): string | null {
  if (item["media:content"]?.$?.url) return item["media:content"].$.url
  if (item.enclosure?.url) return item.enclosure.url
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url
  const fromContent = extractFirstImageFromHtml(content)
  if (fromContent) return fromContent
  return null
}

async function rewriteWithOpenRouter(title: string, content: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return content

  const textContent = stripHtml(content)
  const prompt = "Rewrite the following tech article in an engaging, SEO-optimized style for the blog Blizine. Write a FULL, complete article - at least 500 words. Keep facts accurate. Add a compelling intro, structured H2/H3 subheadings, and a conclusion. The rewrite must be complete so readers don't need to visit the original source. Output HTML only, no markdown. Article title: " + title + ". Original content: " + textContent

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    console.error("OpenRouter error: " + response.status)
    return content
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || content
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const feedId = searchParams.get("feed_id")

    let query = supabase
      .from("rss_feeds")
      .select("id, category_id, feed_url, feed_name, auto_rewrite, is_active, last_fetched_at, posts_fetched")
      .eq("is_active", true)

    if (feedId) query = query.eq("id", feedId)

    const { data: feeds, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!feeds?.length) {
      return NextResponse.json({ message: "No active feeds to process" })
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)

    const defaultAuthorId = profiles?.[0]?.id
    if (!defaultAuthorId) {
      return NextResponse.json({ error: "No author profile found" }, { status: 400 })
    }

    let totalNewPosts = 0
    const results: { feed: string; newPosts: number; error?: string }[] = []

    for (const feed of feeds) {
      try {
        const parsed = await parser.parseURL(feed.feed_url)
        if (!parsed.items?.length) {
          results.push({ feed: feed.feed_name, newPosts: 0 })
          continue
        }

        const feedItemUrls = parsed.items
          .map((item: any) => item.link || item.guid)
          .filter(Boolean) as string[]

        const { data: existingPosts } = await supabase
          .from("posts")
          .select("original_source_url")
          .in("original_source_url", feedItemUrls)

        const existingUrls = new Set(
          (existingPosts || []).map((p: any) => p.original_source_url)
        )

        const newItems = parsed.items.filter(
          (item: any) => !existingUrls.has(item.link || item.guid)
        )

        if (!newItems.length) {
          await supabase
            .from("rss_feeds")
            .update({ last_fetched_at: new Date().toISOString() })
            .eq("id", feed.id)
          results.push({ feed: feed.feed_name, newPosts: 0 })
          continue
        }

        let feedPostsCount = 0

        for (const item of newItems) {
          const title = item.title || "Untitled"
          const content = item.content || item.contentSnippet || ""
          const featuredImage = extractFeaturedImage(item, content)
          let finalContent = content

          if (feed.auto_rewrite && content.length > 50 && process.env.OPENROUTER_API_KEY) {
            try {
              finalContent = await rewriteWithOpenRouter(title, content)
            } catch {
              // fallback to original
            }
          }

          const slug = generateSlug(title) + "-" + Date.now()

          const { data: newPost, error: insertError } = await supabase
            .from("posts")
            .insert({
              title,
              slug,
              content: finalContent,
              excerpt: extractExcerpt(finalContent),
              featured_image: featuredImage,
              category_id: feed.category_id,
              author_id: defaultAuthorId,
              status: "published",
              rss_source_url: feed.feed_url,
              original_source_url: item.link || item.guid || "",
              ai_rewritten: feed.auto_rewrite,
              reading_time: calculateReadingTime(finalContent),
              tags: item.categories?.slice(0, 5) || [],
              published_at: item.isoDate
                ? new Date(item.isoDate).toISOString()
                : new Date().toISOString(),
            })
            .select("id")
            .single()

          if (insertError || !newPost) {
            console.error("Insert failed: " + insertError?.message)
            continue
          }

          if (feed.auto_rewrite && process.env.OPENROUTER_API_KEY) {
            fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/rewrite-post", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ post_id: newPost.id }),
            }).catch(() => {})
          }

          feedPostsCount++
          totalNewPosts++
        }

        await supabase
          .from("rss_feeds")
          .update({
            posts_fetched: (feed.posts_fetched || 0) + feedPostsCount,
            last_fetched_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", feed.id)

        results.push({ feed: feed.feed_name, newPosts: feedPostsCount })
      } catch (err: any) {
        await supabase
          .from("rss_feeds")
          .update({
            last_error: err.message?.slice(0, 500),
            last_fetched_at: new Date().toISOString(),
          })
          .eq("id", feed.id)

        results.push({ feed: feed.feed_name, newPosts: 0, error: err.message })
      }
    }

    return NextResponse.json({
      message: "Processed " + feeds.length + " feeds, imported " + totalNewPosts + " new posts",
      results,
    })
  } catch (err: any) {
    console.error("Fatal: " + err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

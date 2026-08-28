import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/admin-auth"
import { manualWriteFromTopic } from "@/lib/ai-rewriter"
import { SITE_URL } from "@/lib/constants"
import { storeRemoteImage } from "@/lib/media"
import { searchFeaturedImage, enrichArticleWithWebImages } from "@/lib/web-images"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const CATEGORY_SLUG_MAP: Record<string, string> = {
  "tech-news": "tech-news",
  "ai-automation": "ai-automation",
  cybersecurity: "cybersecurity",
  gadgets: "gadgets",
  programming: "programming",
  "web-development": "web-development",
  tutorials: "tutorials",
  "digital-business": "digital-business",
  "networking-it": "networking-it",
  reviews: "reviews",
  desktops: "desktops",
}

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) + "-" + Date.now().toString(36)
}

async function findInternalLinks(keyword: string): Promise<string[]> {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug")
    .eq("status", "published")
    .limit(50)

  if (!posts) return []

  const query = keyword.toLowerCase()
  const words = query.split(/\s+/).filter(w => w.length > 2)
  const maxLinks = 3
  let count = 0

  return posts
    .filter(p => {
      const t = (p.title || "").toLowerCase()
      return words.some(w => t.includes(w)) || query.includes(t)
    })
    .slice(0, maxLinks)
    .map(p => {
      count++
      const text = count <= 3 ? `related article on ${p.title.toLowerCase().includes(words[0] || "") ? "this topic" : p.title}` : p.title
      return `<a href="/${p.slug}" target="_blank">${text}</a>`
    })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response

  try {
    const { keyword } = await request.json()

    if (!keyword || typeof keyword !== "string" || keyword.trim().length < 3) {
      return NextResponse.json({ error: "Keyword must be at least 3 characters" }, { status: 400 })
    }

    const trimmed = keyword.trim()

    const { article, debug } = await manualWriteFromTopic(trimmed)
    if (!article) {
      if (debug.startsWith("duplicate:")) {
        const [, title, slug, status] = debug.split("|")
        return NextResponse.json(
          {
            error: `Duplicate detected — "${title}" already exists (${status}). The AI won't write it again. Edit the existing article instead.`,
            debug,
            duplicate: { title, slug, status },
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: `AI research failed. Debug: ${debug}.`, debug },
        { status: 500 }
      )
    }

    const supabase = createClient()

    const { data: categories } = await supabase.from("categories").select("id, slug")
    const catMap = new Map<string, string>()
    if (categories) {
      for (const c of categories) catMap.set(c.slug, c.id)
    }

    const catSlug = CATEGORY_SLUG_MAP[article.suggestedCategory] || "tech-news"
    const categoryId = catMap.get(catSlug) || null

    // Web images are the default site-wide: enrich the article body with real
    // web figures (charts, diagrams, photos) matching each section + a featured image.
    const enriched = await enrichArticleWithWebImages(article.content, trimmed, 3)
    let remoteImage = enriched.featuredImage
    if (!remoteImage) remoteImage = await searchFeaturedImage(catSlug.replace("-", " ") + " technology")
    // Store the picked image in the Media Library bucket (falls back to remote URL)
    const image = remoteImage ? (await storeRemoteImage(remoteImage, "featured")) || remoteImage : null

    const internalLinks = await findInternalLinks(trimmed)
    let finalContent = enriched.content
    if (internalLinks.length > 0) {
      const linksSection = `<section><h2>Related Resources</h2><p>For more context, check our ${internalLinks.join(", ")}.</p></section>`
      finalContent = finalContent + linksSection
    }

    const answerCapsule = article.quickBrief.length > 0
      ? article.quickBrief.join(" ")
      : `${article.seoDescription || `${trimmed} — ${article.headline}`}`

    const { data: profiles } = await supabase.from("profiles").select("id").limit(1)
    const authorId = profiles?.[0]?.id

    const slug = makeSlug(article.headline)

    const { error: insertError } = await supabase.from("keyword_articles").insert({
      keyword: trimmed,
      title: article.headline,
      slug,
      content: finalContent,
      excerpt: article.seoDescription || article.content.replace(/<[^>]+>/g, "").slice(0, 200),
      featured_image: image,
      category_id: categoryId,
      author_id: authorId,
      status: "published",
      source: "manual",
      search_volume: 0,
      pexels_image_url: image || null,
      seo_title: article.seoTitle,
      seo_description: article.seoDescription,
      seo_keywords: article.seoKeywords,
      tags: article.tags,
      quick_brief: article.quickBrief,
      key_points: article.keyPoints.map((k: string, i: number) => `${i + 1}. ${k}`),
      faq: article.faq,
      answer_capsule: answerCapsule,
      published_at: new Date().toISOString(),
      reading_time: Math.max(1, Math.round((finalContent.split(" ").length || 100) / 200)),
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { error: postError } = await supabase.from("posts").insert({
      slug,
      title: article.headline,
      content: finalContent,
      excerpt: article.seoDescription || article.content.replace(/<[^>]+>/g, "").slice(0, 200),
      featured_image: image,
      category_id: categoryId,
      author_id: authorId,
      status: "draft",
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seo_title: article.seoTitle,
      seo_description: article.seoDescription,
      seo_keywords: article.seoKeywords,
      tags: article.tags,
      quick_brief: article.quickBrief,
      key_points: article.keyPoints,
      faq: article.faq,
      quality_score: article.qualityScore,
      is_breaking: article.isBreaking,
      is_editors_pick: false,
      is_featured: false,
      reading_time: Math.max(1, Math.round((finalContent.split(" ").length || 100) / 200)),
      focus_keyword: trimmed,
      model_used: article.modelUsed,
      source_name: "manual-research",
      ai_rewritten: true,
      views: 0,
    })

    if (postError) {
      return NextResponse.json({ error: `Post insert failed: ${postError.message}` }, { status: 500 })
    }

    // Ping Google & Bing about the sitemap
    const sitemapUrl = `${SITE_URL}/sitemap.xml`
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {})
    fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {})

    return NextResponse.json({
      success: true,
      slug,
      url: `/${slug}`,
      headline: article.headline,
      qualityScore: article.qualityScore,
      suggestedCategory: catSlug,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { manualWriteFromTopic, getGeminiQuotaStatus } from "@/lib/ai-rewriter"
import { SITE_URL } from "@/lib/constants"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const CATEGORY_SLUG_MAP: Record<string, string> = {
  "tech-news": "tech-news", "ai-automation": "ai-automation",
  cybersecurity: "cybersecurity", gadgets: "gadgets",
  programming: "programming", "web-development": "web-development",
  tutorials: "tutorials", "digital-business": "digital-business",
  "networking-it": "networking-it", reviews: "reviews", desktops: "desktops",
}

function makeSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 80) + "-" + Date.now().toString(36)
}

async function pexelsSearch(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photos?.[0]?.src?.large2x || null
  } catch { return null }
}

async function findInternalLinks(keyword: string): Promise<string[]> {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from("posts").select("title, slug").eq("status", "published").limit(50)
  if (!posts) return []
  const words = keyword.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2)
  return posts
    .filter((p: any) => words.some((w: string) => (p.title || "").toLowerCase().includes(w)))
    .slice(0, 3)
    .map((p: any, i: number) =>
      `<a href="/${p.slug}" target="_blank">${i === 0 ? "related article on this topic" : p.title}</a>`
    )
}

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "keyword_articles id is required" }, { status: 400 })
    }

    const supabase = createClient()
    const { data: kw, error: fetchError } = await supabase
      .from("keyword_articles").select("*").eq("id", id).single()

    if (fetchError || !kw) {
      return NextResponse.json({ error: fetchError?.message || "Keyword article not found" }, { status: 404 })
    }

    if (kw.status === "published") {
      return NextResponse.json({ error: "Already published" }, { status: 400 })
    }

    const keyword = kw.keyword.trim()
    const { article, debug } = await manualWriteFromTopic(keyword)
    if (!article) {
      const capCheck = await getGeminiQuotaStatus()
      return NextResponse.json({
        error: `Generation failed. ${capCheck.canUseManualGemini ? `Gemini debug: ${debug}.` : `Manual Gemini limit reached (${capCheck.manualUsed}/${capCheck.manualCap}).`}`,
        cap: capCheck,
      }, { status: 500 })
    }

    const { data: categories } = await supabase.from("categories").select("id, slug")
    const catMap = new Map<string, string>()
    for (const c of categories || []) catMap.set(c.slug, c.id)

    const catSlug = CATEGORY_SLUG_MAP[article.suggestedCategory] || "tech-news"
    const categoryId = catMap.get(catSlug) || kw.category_id

    let image = await pexelsSearch(keyword)
    if (!image) image = await pexelsSearch(catSlug.replace("-", " ") + " technology")

    const internalLinks = await findInternalLinks(keyword)
    let finalContent = article.content
    if (internalLinks.length > 0) {
      finalContent += `<section><h2>Related Resources</h2><p>For more context, check our ${internalLinks.join(", ")}.</p></section>`
    }
    finalContent += `<section><h2>Sources</h2><p>This article was researched using Google Search via Gemini 2.5 Flash with real-time grounding.</p></section>`

    const answerCapsule = article.quickBrief.length > 0
      ? article.quickBrief.join(" ")
      : `${article.seoDescription || `${keyword} — ${article.headline}`}`

    const slug = makeSlug(article.headline)

    const { error: updateError } = await supabase
      .from("keyword_articles")
      .update({
        title: article.headline,
        slug,
        content: finalContent,
        excerpt: article.seoDescription || article.content.replace(/<[^>]+>/g, "").slice(0, 200),
        featured_image: image,
        category_id: categoryId,
        status: "published",
        search_volume: kw.search_volume || 0,
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
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: profiles } = await supabase.from("profiles").select("id").limit(1)
    const authorId = profiles?.[0]?.id

    const { error: postError } = await supabase.from("posts").insert({
      slug,
      title: article.headline,
      content: finalContent,
      excerpt: article.seoDescription || article.content.replace(/<[^>]+>/g, "").slice(0, 200),
      featured_image: image,
      category_id: categoryId,
      author_id: authorId,
      status: "published",
      published_at: new Date().toISOString(),
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
      focus_keyword: keyword,
      model_used: article.modelUsed,
      source_name: "manual-research",
      ai_rewritten: true,
      views: 0,
    })

    if (postError) {
      return NextResponse.json({ error: `Post insert failed: ${postError.message}` }, { status: 500 })
    }

    const sitemapUrl = `${SITE_URL}/sitemap.xml`
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {})
    fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {})

    return NextResponse.json({
      success: true, slug, url: `/${slug}`,
      headline: article.headline, qualityScore: article.qualityScore,
      suggestedCategory: catSlug, seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

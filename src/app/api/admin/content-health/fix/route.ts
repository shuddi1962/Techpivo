import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { storeRemoteImage } from "@/lib/media"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "how", "why", "what",
  "when", "where", "your", "you", "are", "our", "this", "that", "from", "into",
  "about", "over", "under", "using", "use", "used", "make", "made", "best", "top",
  "is", "of", "to", "in", "on", "at", "by", "as", "it", "we", "their", "them",
])

function textFromHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildMeta(post: { title: string; content: string; seo_keywords: unknown }) {
  const title = post.title.replace(/["'“”]/g, "").slice(0, 60)
  const text = textFromHtml(post.content)
  const description = (text.slice(0, 155) + (text.length > 155 ? "…" : "")) || `${title} — TechPivo guide and analysis.`
  let keywords: string[] | null = null
  if (!post.seo_keywords || (Array.isArray(post.seo_keywords) && post.seo_keywords.length === 0)) {
    const freq = new Map<string, number>()
    for (const word of text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w))) {
      freq.set(word, (freq.get(word) || 0) + 1)
    }
    keywords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([w]) => w)
  }
  return { title, description, keywords }
}

async function pexelsSearch(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photos?.[0]?.src?.large2x || null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const body = await req.json().catch(() => null)
  const postId = body?.postId as string | undefined
  const actions: string[] = Array.isArray(body?.actions) ? body.actions : []

  if (!postId || actions.length === 0) {
    return NextResponse.json({ error: "postId and actions required" }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, title, content, featured_image, seo_title, seo_description, seo_keywords, updated_at")
    .eq("id", postId)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  const patch: Record<string, unknown> = {}
  const applied: string[] = []

  if (actions.includes("meta")) {
    const meta = buildMeta(post)
    if (!post.seo_title) patch.seo_title = meta.title
    if (!post.seo_description) patch.seo_description = meta.description
    if (meta.keywords) patch.seo_keywords = meta.keywords
    if (Object.keys(patch).length > 0 || meta.keywords) applied.push("meta")
  }

  if (actions.includes("image") && !post.featured_image) {
    const q = post.title.split(/[^A-Za-z0-9 ]/).join(" ").split(/\s+/).slice(0, 4).join(" ")
    const remote = (await pexelsSearch(q)) || (await pexelsSearch("technology"))
    const url = remote ? await storeRemoteImage(remote, "featured") : null
    if (url) {
      patch.featured_image = url
      applied.push("image")
    }
  }

  if (actions.includes("refresh")) {
    patch.updated_at = new Date().toISOString()
    applied.push("refresh")
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateErr } = await supabase.from("posts").update(patch).eq("id", postId)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, applied })
}

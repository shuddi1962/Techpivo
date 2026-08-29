import { NextRequest, NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/admin-auth"
import { calculateReadability } from "@/lib/seo-utils"
import { improveReadability, splitLongParagraphs } from "@/lib/editor-autofix"
import { createServiceClient } from "@/lib/admin-auth"
import { openRouterSimplifyContent } from "@/lib/ai-rewriter"
import { revalidatePath } from "next/cache"

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const MIN = 50

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, flesch_score, readability_score")
    .eq("status", "published")
    .or(`flesch_score.lt.${MIN},flesch_score.is.null`)
    .order("flesch_score", { ascending: true })

  return NextResponse.json({ count: posts?.length ?? 0, posts: posts ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const MIN = 50
  const body = await request.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit) || 50, 100)

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, content, flesch_score, readability_score, word_count")
    .eq("status", "published")
    .or(`flesch_score.lt.${MIN},flesch_score.is.null`)
    .order("flesch_score", { ascending: true })
    .limit(limit)

  if (!posts?.length) {
    return NextResponse.json({ improved: 0, below: 0, results: [] })
  }

  const results: Array<{
    id: string; slug: string; title: string
    before: { flesch: number; score: number }
    after: { flesch: number; score: number }
    changed: boolean
  }> = []

  for (const post of posts) {
    if (!post.content) {
      results.push({ id: post.id, slug: post.slug, title: post.title, before: { flesch: 0, score: 0 }, after: { flesch: 0, score: 0 }, changed: false })
      continue
    }

    const before = calculateReadability(post.content)

    // Step 1: OpenRouter simplify — keeps facts, raises Flesch via vocabulary simplification
    let step1 = await openRouterSimplifyContent(post.title, post.content)
    let after1 = calculateReadability(step1)

    // Step 2: algorithmic sentence split + paragraph split (polish on top of AI rewrite)
    let step2 = improveReadability(step1)
    let after2 = calculateReadability(step2)
    let step3 = splitLongParagraphs(step2)
    let final = step3
    let after = calculateReadability(final)

    // If step-1 AI already hit MIN, skip unnecessary local passes
    if (after1.flesch >= MIN) {
      final = step1
      after = after1
    } else if (after2.flesch >= MIN) {
      final = step2
      after = after2
    }

    const changed = final !== post.content
    results.push({
      id: post.id, slug: post.slug, title: post.title,
      before: { flesch: before.flesch, score: before.score },
      after: { flesch: after.flesch, score: after.score },
      changed
    })

    if (changed) {
      const plain = (final || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : null

      await supabase.from("posts").update({
        content: final,
        flesch_score: after.flesch,
        readability_score: after.score,
        word_count: wordCount ?? post.word_count,
      }).eq("id", post.id)

      revalidatePath(`/${post.slug}`)
    }
  }

  revalidatePath("/")

  const improved = results.filter(r => r.after.flesch >= MIN).length
  return NextResponse.json({ processed: results.length, improved, below: results.length - improved, results })
}

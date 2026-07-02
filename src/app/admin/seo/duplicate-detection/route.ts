import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function similarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/)
  const wordsB = b.toLowerCase().split(/\s+/)
  const setA = new Set(wordsA)
  const setB = new Set(wordsB)
  const intersection = [...setA].filter(w => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const threshold = parseFloat(searchParams.get("threshold") || "0.6")

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, content, status, category_id, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const duplicates: Array<{
    post_a: any
    post_b: any
    similarity: number
    type: string
  }> = []

  const allPosts = posts || []
  for (let i = 0; i < allPosts.length; i++) {
    for (let j = i + 1; j < allPosts.length; j++) {
      const titleSim = similarity(allPosts[i].title || "", allPosts[j].title || "")
      const contentSim = similarity(allPosts[i].content || "", allPosts[j].content || "")
      const maxSim = Math.max(titleSim, contentSim)

      if (maxSim >= threshold) {
        duplicates.push({
          post_a: { id: allPosts[i].id, title: allPosts[i].title, slug: allPosts[i].slug },
          post_b: { id: allPosts[j].id, title: allPosts[j].title, slug: allPosts[j].slug },
          similarity: Math.round(maxSim * 100),
          type: titleSim >= contentSim ? "title" : "content",
        })
      }
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity)

  return NextResponse.json({
    duplicates,
    total: duplicates.length,
    threshold,
    posts_scanned: allPosts.length,
  })
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    // Get the current post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, title, content, excerpt, tags, category_id, seo_keywords")
      .eq("id", postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get all published posts (excluding current)
    const { data: allPosts, error: allPostsError } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt, tags, category_id, seo_keywords")
      .eq("status", "published")
      .neq("id", postId)
      .limit(200)

    if (allPostsError) throw allPostsError

    // Calculate relevance scores for each post
    const suggestions = allPosts.map(targetPost => {
      const score = calculateRelevance(post, targetPost)
      const anchor = suggestAnchor(post, targetPost)
      const context = suggestContext(post, targetPost)

      return {
        post_id: postId,
        target_post_id: targetPost.id,
        target_title: targetPost.title,
        target_slug: targetPost.slug,
        suggested_anchor: anchor,
        context: context,
        relevance_score: score
      }
    })

    // Sort by relevance and take top 10
    const topSuggestions = suggestions
      .filter(s => s.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 10)

    // Save suggestions
    for (const suggestion of topSuggestions) {
      await supabase
        .from("internal_link_suggestions")
        .upsert({
          post_id: postId,
          target_post_id: suggestion.target_post_id,
          suggested_anchor: suggestion.suggested_anchor,
          context: suggestion.context
        }, { onConflict: "post_id,target_post_id" })
    }

    return NextResponse.json({ 
      success: true, 
      suggestions: topSuggestions 
    })
  } catch (error: any) {
    console.error("Internal link suggestions error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateRelevance(sourcePost: any, targetPost: any): number {
  let score = 0

  // Same category = high relevance
  if (sourcePost.category_id && sourcePost.category_id === targetPost.category_id) {
    score += 40
  }

  // Shared tags
  const sourceTags = sourcePost.tags || []
  const targetTags = targetPost.tags || []
  const sharedTags = sourceTags.filter((t: string) => targetTags.includes(t))
  score += sharedTags.length * 15

  // Shared keywords
  const sourceKeywords = sourcePost.seo_keywords || []
  const targetKeywords = targetPost.seo_keywords || []
  const sharedKeywords = sourceKeywords.filter((k: string) => targetKeywords.includes(k))
  score += sharedKeywords.length * 10

  // Content similarity (simple word overlap)
  const sourceWords = extractKeywords(sourcePost.title + ' ' + (sourcePost.excerpt || ''))
  const targetWords = extractKeywords(targetPost.title + ' ' + (targetPost.excerpt || ''))
  const commonWords = sourceWords.filter((w: string) => targetWords.includes(w))
  score += Math.min(commonWords.length * 2, 20)

  return Math.min(100, score)
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why'])
  
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 20)
}

function suggestAnchor(sourcePost: any, targetPost: any): string {
  // Use target post title as anchor
  const title = targetPost.title
  
  // Shorten if too long
  if (title.length > 50) {
    const words = title.split(' ')
    let shortTitle = ''
    for (const word of words) {
      if ((shortTitle + ' ' + word).length > 45) break
      shortTitle += (shortTitle ? ' ' : '') + word
    }
    return shortTitle.trim() + '...'
  }
  
  return title
}

function suggestContext(sourcePost: any, targetPost: any): string {
  const sourceKeywords = extractKeywords(sourcePost.title + ' ' + (sourcePost.excerpt || ''))
  const targetKeywords = extractKeywords(targetPost.title + ' ' + (targetPost.excerpt || ''))
  const commonWords = sourceKeywords.filter((w: string) => targetKeywords.includes(w))

  if (commonWords.length > 0) {
    return `Related to: ${commonWords.slice(0, 3).join(', ')}`
  }

  if (sourcePost.category_id === targetPost.category_id) {
    return 'Same category'
  }

  return 'Potentially relevant'
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    const { data: suggestions, error } = await supabase
      .from("internal_link_suggestions")
      .select(`
        *,
        target_post:posts!internal_link_suggestions_target_post_id_fkey(id, title, slug)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error("Get suggestions error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'
import { rewriteArticle } from '@/lib/ai-rewriter'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    // Find posts that need reformatting (missing FAQ, key_points, or poor content)
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, content, slug, category_id, tags, seo_title, seo_description, seo_keywords, faq, key_points')
      .eq('status', 'published')
      .eq('ai_rewritten', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    if (!posts?.length) return NextResponse.json({ message: 'No posts need reformatting', reformatted: 0 })

    // Get category slugs
    const { data: cats } = await supabase.from('categories').select('id, slug')
    const catMap: Record<string, string> = {}
    for (const c of cats || []) catMap[c.id] = c.slug

    let reformatted = 0
    let failed = 0
    const results: Array<{ title: string; status: string }> = []

    for (const post of posts) {
      try {
        // Skip posts that already have good SEO structure
        if (post.faq && Array.isArray(post.faq) && post.faq.length >= 2 && post.key_points && Array.isArray(post.key_points) && post.key_points.length >= 2) {
          continue
        }

        const textContent = (post.content || '').replace(/<[^>]+>/g, ' ').trim()
        if (textContent.length < 100) {
          results.push({ title: post.title.slice(0, 50), status: 'skipped_short' })
          continue
        }

        const categorySlug = catMap[post.category_id] || 'tech-news'

        const result = await rewriteArticle(
          post.title,
          textContent,
          'Techpivo',
          categorySlug,
          'rss_auto'
        )

        if (!result.article) {
          failed++
          results.push({ title: post.title.slice(0, 50), status: `failed:${result.debug}` })
          continue
        }

        const ai = result.article

        // Update post with new SEO-optimized content
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            title: ai.headline,
            content: ai.content,
            seo_title: ai.seoTitle,
            seo_description: ai.seoDescription,
            seo_keywords: ai.seoKeywords,
            tags: ai.tags,
            key_points: ai.keyPoints,
            quick_brief: ai.quickBrief,
            faq: ai.faq,
            quality_score: ai.qualityScore,
            model_used: ai.modelUsed,
            ai_rewritten: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id)

        if (updateError) {
          failed++
          results.push({ title: post.title.slice(0, 50), status: 'update_failed' })
        } else {
          reformatted++
          results.push({ title: ai.headline.slice(0, 50), status: 'reformatted' })
        }

        // Rate limit: 1 second between Gemini calls
        await new Promise(r => setTimeout(r, 1000))

      } catch (e) {
        failed++
        results.push({ title: post.title.slice(0, 50), status: 'error' })
      }
    }

    return NextResponse.json({
      reformatted,
      failed,
      total: posts.length,
      results,
      timestamp: new Date().toISOString(),
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

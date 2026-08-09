import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)))

async function auditPost(supabase: SupabaseClient, postId: string) {
  const { data: post, error } = await supabase
    .from('posts')
    .select('id, title, slug, content, seo_description, seo_keywords, featured_image, schema_type, seo_score, readability_score, quality_score, updated_at, status')
    .eq('id', postId)
    .single()
  if (error || !post) return null

  const content: string = post.content || ''
  const imgCount = (content.match(/<img[^>]+>/gi) || []).length + (content.match(/!\[.*?\]\(.*?\)/g) || []).length
  const h2Count = (content.match(/<h2[\s>]/gi) || []).length
  const h3Count = (content.match(/<h3[\s>]/gi) || []).length
  const externalLinks = (content.match(/<a[^>]+href="https?:\/\/(?!techpivo\.com)[^"]+"/gi) || []).length
  const internalLinks = (content.match(/<a[^>]+href="\/(?!https?:)[^"]+"/gi) || []).length
  const keywords: string[] = Array.isArray(post.seo_keywords) ? post.seo_keywords : []
  const keywordHits = keywords.filter(k => k && content.toLowerCase().includes(String(k).toLowerCase())).length

  const seoScore = post.seo_score || clamp(55 + keywordHits * 8 + (post.seo_description ? 5 : 0) + (post.slug ? 3 : 0))
  const readabilityScore = post.readability_score || clamp(68 + Math.min(content.split(/\s+/).filter(Boolean).length / 500, 10) + (h2Count + h3Count) * 2)
  const mediaScore = clamp((post.featured_image ? 80 : 30) + (imgCount > 0 ? 15 : 0))
  const internalScore = internalLinks >= 3 ? 90 : internalLinks >= 1 ? 65 : 40
  const externalScore = externalLinks >= 2 ? 85 : externalLinks >= 1 ? 65 : 40
  const schemaScore = post.schema_type ? 90 : 30
  const keywordScore = keywords.length === 0 ? 35 : clamp(45 + keywordHits * 12)
  const daysSinceUpdate = (Date.now() - new Date(post.updated_at || Date.now()).getTime()) / 86400000
  const freshnessScore = clamp(100 - daysSinceUpdate * 0.4)
  const eeatScore = post.quality_score || clamp(60 + Math.min(content.length / 1000, 15))
  const technicalHealthScore = 90
  const overallScore = clamp(
    (seoScore * 2 + readabilityScore + mediaScore + internalScore + externalScore +
      schemaScore + keywordScore + freshnessScore + eeatScore + technicalHealthScore) / 11
  )

  const issues: any[] = []
  if (!post.seo_description) issues.push({ issue_type: 'missing_meta', severity: 'critical', description: 'Missing meta description', suggestion: 'Add a compelling meta description between 150-160 characters' })
  if (keywords.length === 0) issues.push({ issue_type: 'missing_keywords', severity: 'warning', description: 'No SEO keywords defined', suggestion: 'Add primary and secondary keywords' })
  if (!post.featured_image) issues.push({ issue_type: 'missing_featured_image', severity: 'warning', description: 'No featured image set', suggestion: 'Set a featured image from the Media Library' })
  if (imgCount === 0) issues.push({ issue_type: 'no_content_images', severity: 'info', description: 'No images inside article body', suggestion: 'Add at least one relevant image in the content' })
  if (internalLinks < 2) issues.push({ issue_type: 'few_internal_links', severity: 'info', description: `${internalLinks} internal link(s) found`, suggestion: 'Add 2-3 internal links to related articles' })
  if (externalLinks < 1) issues.push({ issue_type: 'no_external_links', severity: 'info', description: 'No external authority links found', suggestion: 'Link to official documentation or trusted sources' })
  if (h2Count < 2) issues.push({ issue_type: 'heading_structure', severity: 'warning', description: 'Poor heading structure', suggestion: 'Use H2 (and H3) headings to structure content' })
  if (keywordScore < 60) issues.push({ issue_type: 'keyword_coverage', severity: 'warning', description: 'Weak keyword coverage', suggestion: 'Naturally include the primary keyword in the content' })

  const { data: audit } = await supabase.from('seo_audits').insert({
    post_id: postId,
    overall_score: overallScore,
    seo_score: seoScore,
    readability_score: readabilityScore,
    eeat_score: eeatScore,
    media_score: mediaScore,
    internal_linking_score: internalScore,
    external_links_score: externalScore,
    schema_score: schemaScore,
    keyword_coverage_score: keywordScore,
    technical_health_score: technicalHealthScore,
    freshness_score: freshnessScore,
    issues,
    suggestions: issues.map(i => ({ issue: i.issue_type, suggestion: i.suggestion })),
    checked_at: new Date().toISOString(),
  }).select().single()

  for (const issue of issues) {
    await supabase.from('seo_issues').insert({
      post_id: postId,
      issue_type: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      suggestion: issue.suggestion,
    })
  }

  return audit
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try { body = await req.json() } catch {}
    const postId = body?.postId
    const supabase = createClient()

    if (postId && postId !== 'all') {
      const audit = await auditPost(supabase, postId)
      if (!audit) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      return NextResponse.json({ audit })
    }

    // Run audit on all published posts — server-side loop (no HTTP recursion)
    const { data: posts, error: listErr } = await supabase
      .from('posts').select('id').eq('status', 'published').limit(300)
    if (listErr) return NextResponse.json({ error: 'Failed to list posts', details: listErr.message }, { status: 500 })

    const results: string[] = []
    for (const post of posts || []) {
      const audit = await auditPost(supabase, post.id)
      if (audit) results.push(post.id)
    }

    return NextResponse.json({ audited: results.length, total: posts?.length || 0 })
  } catch (err) {
    return NextResponse.json({ error: 'Audit failed', details: String(err) }, { status: 500 })
  }
}

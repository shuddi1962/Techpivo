import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_BATCH = 50

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { postId, postIds } = body

    // Determine which posts to audit
    let posts: any[] = []
    if (Array.isArray(postIds) && postIds.length > 0) {
      const ids = postIds.slice(0, MAX_BATCH)
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .in("id", ids)
        .limit(MAX_BATCH)
      if (error) throw error
      posts = data || []
    } else {
      let query = supabase.from("posts").select("*").eq("status", "published")
      if (postId && postId !== "all") {
        query = query.eq("id", postId)
      }
      const { data, error } = await query.limit(MAX_BATCH)
      if (error) throw error
      posts = data || []
    }

    if (posts.length === 0) {
      return NextResponse.json({ error: "No posts found to audit" }, { status: 404 })
    }

    const auditResults: any[] = []
    const auditRows: any[] = []
    const issueRows: any[] = []

    for (const post of posts) {
      const scores = {
        seoScore: calculateSeoScore(post),
        readabilityScore: calculateReadabilityScore(post),
        eeatScore: calculateEeatScore(post),
        mediaScore: calculateMediaScore(post),
        internalLinkingScore: calculateInternalLinkingScore(post),
        externalLinksScore: calculateExternalLinksScore(post),
        schemaScore: calculateSchemaScore(post),
        keywordCoverageScore: calculateKeywordCoverageScore(post),
        technicalHealthScore: calculateTechnicalHealthScore(post),
        freshnessScore: calculateFreshnessScore(post),
      }

      const overallScore = Math.round(
        (scores.seoScore + scores.readabilityScore + scores.eeatScore + scores.mediaScore +
          scores.internalLinkingScore + scores.externalLinksScore + scores.schemaScore +
          scores.keywordCoverageScore + scores.technicalHealthScore + scores.freshnessScore) / 10
      )

      const issues = identifyIssues(post, scores)
      const suggestions = generateSuggestions(post, issues)

      auditRows.push({
        post_id: post.id,
        overall_score: overallScore,
        seo_score: scores.seoScore,
        readability_score: scores.readabilityScore,
        eeat_score: scores.eeatScore,
        media_score: scores.mediaScore,
        internal_linking_score: scores.internalLinkingScore,
        external_links_score: scores.externalLinksScore,
        schema_score: scores.schemaScore,
        keyword_coverage_score: scores.keywordCoverageScore,
        technical_health_score: scores.technicalHealthScore,
        freshness_score: scores.freshnessScore,
        issues: issues,
        suggestions: suggestions,
        checked_at: new Date().toISOString()
      })

      issues.forEach((i: any) => {
        issueRows.push({
          post_id: post.id,
          issue_type: i.type,
          severity: i.severity,
          description: i.description,
          suggestion: i.suggestion,
        })
      })
    }

    // Bulk write (2 roundtrips instead of ~50 per batch)
    const { data: savedAudits, error: auditError } = await supabase
      .from("seo_audits")
      .upsert(auditRows, { onConflict: "post_id" })
      .select()
    if (auditError) throw auditError

    if (issueRows.length > 0) {
      const { error: issuesError } = await supabase
        .from("seo_issues")
        .upsert(issueRows, { onConflict: "post_id,issue_type" })
      if (issuesError) throw issuesError
    }

    auditResults.push(...(savedAudits || []))

    return NextResponse.json({
      success: true,
      audits: auditResults,
      count: auditResults.length
    })
  } catch (error: any) {
    console.error("SEO audit error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateSeoScore(post: any): number {
  let score = 0

  if (post.seo_title && post.seo_title.length >= 30 && post.seo_title.length <= 60) score += 15
  else if (post.seo_title) score += 8

  if (post.seo_description && post.seo_description.length >= 120 && post.seo_description.length <= 160) score += 15
  else if (post.seo_description) score += 8

  if (post.seo_keywords && post.seo_keywords.length > 0) score += 10

  if (post.slug && post.slug.length < 75) score += 10

  if (post.content && post.content.split(' ').length >= 1000) score += 15
  else if (post.content && post.content.split(' ').length >= 500) score += 8

  if (post.content && post.content.includes('<h2')) score += 10
  if (post.content && post.content.includes('<h3')) score += 5

  if (post.excerpt && post.excerpt.length > 0) score += 10

  if (post.featured_image) score += 10

  return Math.min(100, score)
}

function calculateReadabilityScore(post: any): number {
  if (!post.content) return 0

  const text = post.content.replace(/<[^>]*>/g, '')
  const words = text.split(/\s+/).filter((w: string) => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0)
  const paragraphs = text.split(/\n\n+/).filter((p: string) => p.trim().length > 0)

  let score = 50

  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1)
  if (avgWordsPerSentence <= 20) score += 15
  else if (avgWordsPerSentence <= 25) score += 10
  else score -= 10

  if (paragraphs.length >= 5) score += 10

  if (post.content.includes('<ul') || post.content.includes('<ol')) score += 10

  if (post.content.includes('<table')) score += 5

  return Math.min(100, Math.max(0, score))
}

function calculateEeatScore(post: any): number {
  let score = 50

  if (post.author_id) score += 20

  if (post.published_at) score += 10

  if (post.updated_at && post.updated_at !== post.created_at) score += 10

  const externalLinks = (post.content || '').match(/https?:\/\/[^\s<]+/g) || []
  if (externalLinks.length >= 2) score += 10

  return Math.min(100, score)
}

function calculateMediaScore(post: any): number {
  let score = 0

  if (post.featured_image) score += 40
  else if (post.og_image) score += 30

  const imageCount = ((post.content || '').match(/<img/g) || []).length
  if (imageCount >= 3) score += 30
  else if (imageCount >= 1) score += 20

  const imagesWithAlt = ((post.content || '').match(/alt="[^"]+"/g) || []).length
  if (imagesWithAlt > 0 && imageCount > 0) score += 30

  return Math.min(100, score)
}

function calculateInternalLinkingScore(post: any): number {
  let score = 0

  const internalLinks = ((post.content || '').match(/href="\/[^"]+"/g) || []).length
  if (internalLinks >= 5) score += 50
  else if (internalLinks >= 3) score += 35
  else if (internalLinks >= 1) score += 20

  if (post.tags && post.tags.length > 0) score += 25

  if (post.category_id) score += 25

  return Math.min(100, score)
}

function calculateExternalLinksScore(post: any): number {
  const externalLinks = ((post.content || '').match(/https?:\/\/[^\s<]+/g) || []).length

  if (externalLinks >= 3) return 100
  if (externalLinks >= 2) return 80
  if (externalLinks >= 1) return 60
  return 30
}

function calculateSchemaScore(post: any): number {
  let score = 50

  if (post.title && post.published_at) score += 25
  if (post.featured_image) score += 15
  if (post.excerpt) score += 10

  return Math.min(100, score)
}

function calculateKeywordCoverageScore(post: any): number {
  if (!post.seo_keywords || post.seo_keywords.length === 0) return 20

  let score = 40

  const content = (post.content || '').toLowerCase()
  const title = (post.title || '').toLowerCase()

  for (const keyword of post.seo_keywords.slice(0, 5)) {
    const kw = keyword.toLowerCase()
    if (title.includes(kw)) score += 12
    else if (content.includes(kw)) score += 8
  }

  return Math.min(100, score)
}

function calculateTechnicalHealthScore(post: any): number {
  let score = 70

  if (post.slug && !post.slug.includes('_')) score += 10

  if (post.slug && post.slug.length < 75) score += 10

  if (post.canonical_url) score += 10

  return Math.min(100, score)
}

function calculateFreshnessScore(post: any): number {
  if (!post.published_at) return 50

  const publishedDate = new Date(post.published_at)
  const now = new Date()
  const daysSincePublished = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSincePublished <= 30) return 100
  if (daysSincePublished <= 90) return 85
  if (daysSincePublished <= 180) return 70
  if (daysSincePublished <= 365) return 50
  return 30
}

function identifyIssues(post: any, scores: any): any[] {
  const issues = []

  if (scores.seoScore < 50) {
    issues.push({
      type: "seo",
      severity: "critical",
      description: "SEO score is below 50%",
      suggestion: "Improve title, meta description, and keyword usage"
    })
  }

  if (scores.readabilityScore < 50) {
    issues.push({
      type: "readability",
      severity: "warning",
      description: "Content may be difficult to read",
      suggestion: "Use shorter sentences and paragraphs"
    })
  }

  if (!post.featured_image) {
    issues.push({
      type: "media",
      severity: "warning",
      description: "Missing featured image",
      suggestion: "Add a relevant featured image"
    })
  }

  if (!post.seo_description || post.seo_description.length < 120) {
    issues.push({
      type: "seo",
      severity: "warning",
      description: "Meta description is missing or too short",
      suggestion: "Add a meta description between 120-160 characters"
    })
  }

  if (!post.seo_keywords || post.seo_keywords.length === 0) {
    issues.push({
      type: "keywords",
      severity: "info",
      description: "No SEO keywords defined",
      suggestion: "Add relevant keywords for better targeting"
    })
  }

  const contentWords = (post.content || '').split(' ').length
  if (contentWords < 500) {
    issues.push({
      type: "content",
      severity: "warning",
      description: "Content is too short (under 500 words)",
      suggestion: "Expand content to provide more value"
    })
  }

  const externalLinks = ((post.content || '').match(/https?:\/\/[^\s<]+/g) || []).length
  if (externalLinks === 0) {
    issues.push({
      type: "links",
      severity: "info",
      description: "No external links found",
      suggestion: "Add links to authoritative sources"
    })
  }

  const imageCount = ((post.content || '').match(/<img/g) || []).length
  if (imageCount === 0) {
    issues.push({
      type: "media",
      severity: "warning",
      description: "No images in article content",
      suggestion: "Add images throughout the article with descriptive alt text"
    })
  }

  return issues
}

function generateSuggestions(post: any, issues: any[]): string[] {
  const suggestions = []

  if (issues.some(i => i.type === "seo")) {
    suggestions.push("Optimize title and meta description with target keywords")
  }

  if (issues.some(i => i.type === "readability")) {
    suggestions.push("Break long paragraphs and use bullet points")
  }

  if (issues.some(i => i.type === "media")) {
    suggestions.push("Add relevant images with descriptive alt text")
  }

  suggestions.push("Add 2-3 internal links to related articles")
  suggestions.push("Add FAQ section for better featured snippet chances")
  suggestions.push("Ensure all images have alt text")

  return suggestions
}

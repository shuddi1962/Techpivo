import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_FIX_ALL = 30

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that', 'how', 'what', 'why', 'when',
  'your', 'you', 'our', 'are', 'can', 'will', 'best', 'top', 'new', 'get', 'guide', '2026', '2025', 'vs', 'of',
])

function deriveKeywords(post: any): string[] {
  const title = (post.title || '').toLowerCase()
  const words = title
    .replace(/[^a-z0-9\s+]/g, ' ')
    .split(/\s+/)
    .filter((w: string) => w.length > 2 && !STOPWORDS.has(w)) as string[]
  const keywords = [...new Set(words)].slice(0, 5)
  return keywords
}

function buildMetaDescription(post: any): string {
  const source = post.excerpt || (post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const clean = source.slice(0, 160).replace(/\s+\S*$/, '')
  return clean || (post.title || 'TechPivo article')
}

async function resolveIssue(supabase: any, postId: string, issueType: string, issueId?: string) {
  let query = supabase.from('seo_issues').update({ resolved: true, resolved_at: new Date().toISOString() })
  if (issueId) query = query.eq('id', issueId)
  else query = query.eq('post_id', postId).eq('issue_type', issueType).eq('resolved', false)
  await query
}

async function pickImages(supabase: any, post: any, count: number): Promise<{ url: string; alt: string }[]> {
  const picked: { url: string; alt: string }[] = []

  // 1. Featured images from same-category published posts
  if (post.category_id) {
    const { data: catPosts } = await supabase
      .from('posts')
      .select('featured_image, title')
      .eq('category_id', post.category_id)
      .eq('status', 'published')
      .not('featured_image', 'is', null)
      .neq('id', post.id)
      .limit(count * 4)
    for (const cp of catPosts || []) {
      if (picked.length >= count) break
      if (cp.featured_image && !picked.some(p => p.url === cp.featured_image)) {
        picked.push({ url: cp.featured_image, alt: cp.title || post.title })
      }
    }
  }

  // 2. Media library fallback
  if (picked.length < count) {
    const { data: media } = await supabase.from('media_files').select('url, name').limit(count * 4)
    for (const m of media || []) {
      if (picked.length >= count) break
      if (m.url && !picked.some(p => p.url === m.url)) {
        picked.push({ url: m.url, alt: m.name || post.title })
      }
    }
  }

  // 3. Own featured image as last resort
  if (picked.length < count && post.featured_image) {
    picked.push({ url: post.featured_image, alt: post.title })
  }

  return picked
}

function injectImagesIntoContent(content: string, images: { url: string; alt: string }[]): string {
  if (!content) return content
  const blocks = images.map(i => {
    const alt = (i.alt || '').replace(/"/g, '&quot;').slice(0, 120)
    return `<figure><img src="${i.url}" alt="${alt}" loading="lazy" /></figure>`
  })

  // HTML content — insert after the first paragraph close
  if (content.includes('</p>')) {
    const idx = content.indexOf('</p>') + 4
    return content.slice(0, idx) + '\n' + blocks.join('\n') + '\n' + content.slice(idx)
  }

  // Markdown content — insert after first paragraph block
  const mdBlocks = images.map(i => `\n\n![${(i.alt || '').slice(0, 120)}](${i.url})\n\n`)
  const m = content.match(/^(.*?)(\n\n|\r?\n\r?\n)/)
  if (m) {
    const idx = m[0].length
    return content.slice(0, idx) + mdBlocks.join('') + content.slice(idx)
  }
  return mdBlocks.join('') + content
}

async function fixMetaDescription(supabase: any, post: any, issueId?: string) {
  const meta = buildMetaDescription(post)
  if (!meta) return false
  const { error } = await supabase
    .from('posts')
    .update({ seo_description: meta, updated_at: new Date().toISOString() })
    .eq('id', post.id)
  if (error) throw error
  await resolveIssue(supabase, post.id, 'missing_meta', issueId)
  return true
}

async function fixKeywords(supabase: any, post: any, issueId?: string) {
  const newKeywords = deriveKeywords(post)
  const existing: string[] = Array.isArray(post.seo_keywords) ? post.seo_keywords : []
  const merged = [...new Set([...existing, ...newKeywords])].slice(0, 10)
  if (merged.length === 0) return false
  const { error } = await supabase
    .from('posts')
    .update({ seo_keywords: merged, updated_at: new Date().toISOString() })
    .eq('id', post.id)
  if (error) throw error
  await resolveIssue(supabase, post.id, 'missing_keywords', issueId)
  return true
}

async function fixFeaturedImage(supabase: any, post: any, issueId?: string) {
  if (post.featured_image) {
    await resolveIssue(supabase, post.id, 'missing_featured_image', issueId)
    return true
  }
  const images = await pickImages(supabase, post, 1)
  if (images.length === 0) return false
  const { error } = await supabase
    .from('posts')
    .update({ featured_image: images[0].url, og_image: images[0].url, updated_at: new Date().toISOString() })
    .eq('id', post.id)
  if (error) throw error
  await resolveIssue(supabase, post.id, 'missing_featured_image', issueId)
  return true
}

async function fixContentImages(supabase: any, post: any, issueId?: string, count = 1) {
  const content = post.content || ''
  if (/<img[^>]+>/i.test(content) || /!\[.*?\]\(.*?\)/.test(content)) {
    await resolveIssue(supabase, post.id, 'no_content_images', issueId)
    return true
  }
  const images = await pickImages(supabase, post, count)
  if (images.length === 0) return false
  const updated = injectImagesIntoContent(content, images)
  const { error } = await supabase
    .from('posts')
    .update({ content: updated, updated_at: new Date().toISOString() })
    .eq('id', post.id)
  if (error) throw error
  await resolveIssue(supabase, post.id, 'no_content_images', issueId)
  return true
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try { body = await req.json() } catch {}
    const supabase = createClient()
    const { action, postId, issueId, issueType, count } = body

    // Resolve without fixing
    if (action === 'resolve_issue') {
      if (!issueId) return NextResponse.json({ error: 'issueId required' }, { status: 400 })
      const { error } = await supabase.from('seo_issues').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', issueId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Fetch post when postId provided
    let post: any = null
    if (postId) {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, content, excerpt, seo_description, seo_keywords, featured_image, og_image, category_id')
        .eq('id', postId)
        .single()
      if (error) throw error
      post = data
    }

    if (action === 'fix_issue' && post && issueType) {
      let ok = false
      if (issueType === 'missing_meta') ok = await fixMetaDescription(supabase, post, issueId)
      else if (issueType === 'missing_keywords') ok = await fixKeywords(supabase, post, issueId)
      else if (issueType === 'missing_featured_image') ok = await fixFeaturedImage(supabase, post, issueId)
      else if (issueType === 'no_content_images') ok = await fixContentImages(supabase, post, issueId, count || 1)
      else if (issueType === 'missing_seo_title') ok = true
      if (!ok) return NextResponse.json({ error: 'Could not auto-fix this issue' }, { status: 400 })
      return NextResponse.json({ success: true, postId })
    }

    if (action === 'fix_all' && issueType) {
      const { data: issues } = await supabase
        .from('seo_issues')
        .select('id, post_id, issue_type')
        .eq('issue_type', issueType)
        .eq('resolved', false)
        .limit(MAX_FIX_ALL)

      let fixed = 0
      for (const issue of issues || []) {
        const { data: p } = await supabase
          .from('posts')
          .select('id, title, slug, content, excerpt, seo_description, seo_keywords, featured_image, og_image, category_id')
          .eq('id', issue.post_id)
          .single()
        if (!p) continue
        try {
          let ok = false
          if (issueType === 'missing_meta') ok = await fixMetaDescription(supabase, p, issue.id)
          else if (issueType === 'missing_keywords') ok = await fixKeywords(supabase, p, issue.id)
          else if (issueType === 'missing_featured_image') ok = await fixFeaturedImage(supabase, p, issue.id)
          else if (issueType === 'no_content_images') ok = await fixContentImages(supabase, p, issue.id, count || 1)
          if (ok) fixed++
        } catch (e) {
          console.error('fix_all item error:', e)
        }
      }
      return NextResponse.json({ success: true, fixed, total: issues?.length || 0 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('SEO fix error:', err)
    return NextResponse.json({ error: 'Fix failed', details: String(err) }, { status: 500 })
  }
}

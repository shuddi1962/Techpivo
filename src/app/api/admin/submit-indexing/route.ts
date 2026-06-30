import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'
import { submitToGoogleIndexing } from '@/lib/google-indexing'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug')
    .eq('status', 'published')

  if (error || !posts?.length) {
    return NextResponse.json({ error: error?.message || 'No posts found' }, { status: 500 })
  }

  const baseUrl = 'https://techpivo.com'
  const results = { submitted: 0, failed: 0, skipped: 0, errors: [] as string[] }

  for (const post of posts) {
    const url = `${baseUrl}/${post.slug}`

    const { data: existing } = await supabase
      .from('google_indexing_queue')
      .select('id')
      .eq('url', url)
      .in('status', ['submitted', 'indexed'])
      .maybeSingle()

    if (existing) {
      results.skipped++
      continue
    }

    const ok = await submitToGoogleIndexing(url)

    await supabase.from('google_indexing_queue').insert({
      url,
      status: ok ? 'submitted' : 'failed',
      submitted_at: new Date().toISOString(),
    })

    if (ok) {
      results.submitted++
    } else {
      results.failed++
      results.errors.push(url)
    }

    await new Promise(r => setTimeout(r, 600))
  }

  return NextResponse.json({
    total: posts.length,
    ...results,
    timestamp: new Date().toISOString(),
  })
}

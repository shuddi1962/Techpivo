import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function processFeed(feedId: string, supabase: ReturnType<typeof createClient>) {
  const { data: feed } = await supabase
    .from('rss_feeds')
    .select('*, categories!inner(slug)')
    .eq('id', feedId)
    .single()

  if (!feed) throw new Error('Feed not found')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${supabaseUrl}/functions/v1/fetch-rss-feeds`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(120000),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Edge function error: ${err}`)
  }

  return await res.json()
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    const feedId = new URL(req.url).searchParams.get('feed_id')

    if (feedId) {
      const result = await processFeed(feedId, supabase)
      return NextResponse.json({ ok: true, message: `Feed processed: ${result.new_posts || 0} new posts`, result })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(
      `${supabaseUrl}/functions/v1/fetch-rss-feeds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(240000),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Edge function error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, message: `All feeds processed: ${data.new_posts || 0} new posts`, result: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}

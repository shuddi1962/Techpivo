import { NextRequest, NextResponse } from 'next/server'
import { processScheduledPosts } from '@/lib/social-publisher'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const result = await processScheduledPosts()

  return NextResponse.json({
    ok:        true,
    processed: result.processed,
    results:   result.results,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}

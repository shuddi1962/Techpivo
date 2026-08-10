import { NextRequest, NextResponse } from 'next/server'
import { processScheduledPosts } from '@/lib/social-publisher'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
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

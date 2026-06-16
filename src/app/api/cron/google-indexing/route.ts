import { NextRequest, NextResponse }      from 'next/server'
import { processPendingIndexingQueue }    from '@/lib/google-indexing'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  await processPendingIndexingQueue()
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}

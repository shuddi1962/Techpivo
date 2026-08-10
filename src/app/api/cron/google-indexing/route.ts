import { NextRequest, NextResponse }      from 'next/server'
import { processPendingIndexingQueue }    from '@/lib/google-indexing'
import { isCronAuthorized }               from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  await processPendingIndexingQueue()
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}

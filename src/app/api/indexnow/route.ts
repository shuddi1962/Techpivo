import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCronAuthorized } from '@/lib/cron-auth'

const ENGINES: Array<{ name: string; url: string }> = [
  { name: 'Bing',      url: 'https://www.bing.com/indexnow' },
  { name: 'Yandex',    url: 'https://yandex.com/indexnow' },
  { name: 'Seznam',    url: 'https://search.seznam.cz/indexnow' },
]

async function getIndexNowKey(): Promise<string> {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'indexnow_key').maybeSingle()
    return typeof data?.value === 'string' ? data.value : ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  if (!(await isCronAuthorized(req, { required: true }))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { urls }: { urls: string[] } = await req.json()
    if (!urls?.length) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
    }

    const INDEXNOW_KEY = await getIndexNowKey()
    if (!INDEXNOW_KEY) {
      return NextResponse.json({ error: 'IndexNow key not configured (INDEXNOW_KEY env or site_settings.indexnow_key)' }, { status: 500 })
    }

    const results: Array<{ engine: string; ok: boolean; error?: string }> = []

    for (const engine of ENGINES) {
      try {
        const res = await fetch(engine.url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host:       new URL(urls[0]).host,
            key:        INDEXNOW_KEY,
            keyLocation: `https://${new URL(urls[0]).host}/${INDEXNOW_KEY}.txt`,
            urlList:    urls.slice(0, 10000),
          }),
        })
        const body = await res.text().catch(() => '')
        results.push({ engine: engine.name, ok: res.ok, error: res.ok ? undefined : body.slice(0, 120) })
      } catch (e) {
        results.push({ engine: engine.name, ok: false, error: String(e).slice(0, 100) })
      }
    }

    return NextResponse.json({ ok: true, results, urlCount: urls.length })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}

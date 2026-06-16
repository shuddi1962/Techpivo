import { NextRequest, NextResponse } from 'next/server'

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || ''

const ENGINES: Array<{ name: string; url: string }> = [
  { name: 'Bing',      url: 'https://www.bing.com/indexnow' },
  { name: 'Yandex',    url: 'https://yandex.com/indexnow' },
  { name: 'Seznam',    url: 'https://search.seznam.cz/indexnow' },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { urls }: { urls: string[] } = await req.json()
    if (!urls?.length) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
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
        results.push({ engine: engine.name, ok: res.ok })
      } catch (e) {
        results.push({ engine: engine.name, ok: false, error: String(e).slice(0, 100) })
      }
    }

    return NextResponse.json({ ok: true, results, urlCount: urls.length })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}

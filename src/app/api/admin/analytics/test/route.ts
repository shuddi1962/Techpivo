import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {
    envVars: {
      psKey: !!process.env.PAGESPEED_API_KEY,
    },
    pagespeed: null,
  }

  try {
    const key = process.env.PAGESPEED_API_KEY
    if (key) {
      const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://techpivo.com')}&strategy=mobile&key=${key}`
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const data = await res.json()
        results.pagespeed = { success: true, data: data.lighthouseResult?.categories }
      } else {
        results.pagespeed = { success: false, error: res.statusText }
      }
    }
  } catch (e: any) {
    results.pagespeed = { success: false, error: e.message }
  }

  return NextResponse.json(results)
}

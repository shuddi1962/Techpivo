import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [geminiResult, articleResult] = await Promise.all([
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('daily_article_count').select('count').eq('date', new Date().toISOString().slice(0, 10)).single(),
  ])

  const geminiUsed = geminiResult.count || 0
  const totalToday = articleResult.data?.count || 0

  const tomorrow = new Date(todayStart)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  return NextResponse.json({
    gemini: {
      used:      geminiUsed,
      cap:       20,
      remaining: Math.max(0, 20 - geminiUsed),
      resetsAt:  tomorrow.toISOString(),
      note:      'Gemini 2.5 Flash + Google Search Grounding. No fallback model.',
    },
    total: {
      today: totalToday,
      cap:   20,
      note:  '20 articles/day — Gemini grounded only',
    },
  })
}

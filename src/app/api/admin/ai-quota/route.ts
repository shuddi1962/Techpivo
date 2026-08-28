import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const [manualDailyResult, manualMonthlyResult, articleResult, kwPendingResult, kwPublishedResult] = await Promise.all([
    supabase.from('ai_usage_log').select('*', { count: 'exact', head: true }).eq('type', 'manual').gte('created_at', todayStart.toISOString()),
    supabase.from('ai_usage_log').select('*', { count: 'exact', head: true }).eq('type', 'manual').gte('created_at', firstOfMonth.toISOString()),
    supabase.from('daily_article_count').select('count').eq('date', new Date().toISOString().slice(0, 10)).maybeSingle(),
    supabase.from('keyword_articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('keyword_articles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
  ])

  const manualDailyUsed = manualDailyResult.count || 0
  const manualMonthlyUsed = manualMonthlyResult.count || 0
  const totalToday = articleResult.data?.count || 0
  const kwPending = kwPendingResult.count || 0
  const kwPublishedToday = kwPublishedResult.count || 0

  const tomorrow = new Date(todayStart)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const nextFirstOfMonth = new Date(firstOfMonth)
  nextFirstOfMonth.setMonth(nextFirstOfMonth.getMonth() + 1)

  const MANUAL_DAILY_CAP = 50
  const MANUAL_MONTHLY_CAP = 2000

  return NextResponse.json({
    manual: {
      used:      manualDailyUsed,
      cap:       MANUAL_DAILY_CAP,
      remaining: Math.max(0, MANUAL_DAILY_CAP - manualDailyUsed),
      resetsAt:  tomorrow.toISOString(),
      note:      'Manual AI writes from the post editor. Resets daily.',
    },
    manualMonthly: {
      used:      manualMonthlyUsed,
      cap:       MANUAL_MONTHLY_CAP,
      remaining: Math.max(0, MANUAL_MONTHLY_CAP - manualMonthlyUsed),
      resetsAt:  nextFirstOfMonth.toISOString(),
      note:      'Monthly AI write budget. Resets on the 1st.',
    },
    total: {
      today: totalToday,
      note:  'Articles written today.',
    },
    keywordArticles: {
      pending: kwPending,
      publishedToday: kwPublishedToday,
      note: 'SEO/GEO/AEO keyword-driven articles.',
    },
  })
}

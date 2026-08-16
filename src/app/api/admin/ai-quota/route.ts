import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const [geminiResult, articleResult, kwPendingResult, kwPublishedResult, manualGeminiResult, manualMonthlyResult] = await Promise.all([
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('daily_article_count').select('count').eq('date', new Date().toISOString().slice(0, 10)).maybeSingle(),
    supabase.from('keyword_articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('keyword_articles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()).eq('used_for', 'manual'),
    supabase.from('ai_usage_log').select('*', { count: 'exact', head: true }).eq('type', 'manual').gte('created_at', firstOfMonth.toISOString()),
  ])

  const geminiUsed = geminiResult.count || 0
  const manualGeminiUsed = manualGeminiResult.count || 0
  const totalToday = articleResult.data?.count || 0
  const kwPending = kwPendingResult.count || 0
  const kwPublishedToday = kwPublishedResult.count || 0
  const manualMonthlyUsed = manualMonthlyResult.count || 0

  const tomorrow = new Date(todayStart)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const nextFirstOfMonth = new Date(firstOfMonth)
  nextFirstOfMonth.setMonth(nextFirstOfMonth.getMonth() + 1)

  const GEMINI_CAP = 30
  const MANUAL_GEMINI_CAP = 50
  const MANUAL_MONTHLY_CAP = 2000

  return NextResponse.json({
    gemini: {
      used:      geminiUsed,
      cap:       GEMINI_CAP,
      remaining: Math.max(0, GEMINI_CAP - geminiUsed),
      resetsAt:  tomorrow.toISOString(),
      note:      'Gemini 2.5 Flash + Google Search Grounding — shared across RSS auto-rewrite',
    },
    manualGemini: {
      used:      manualGeminiUsed,
      cap:       MANUAL_GEMINI_CAP,
      remaining: Math.max(0, MANUAL_GEMINI_CAP - manualGeminiUsed),
      resetsAt:  tomorrow.toISOString(),
      note:      'Separate budget for manual keyword research. Does not affect RSS quota.',
    },
    total: {
      today: totalToday,
      cap:   GEMINI_CAP,
      note:  '30 articles/day — Gemini grounded only',
    },
    manual: {
      used:      manualMonthlyUsed,
      cap:       MANUAL_MONTHLY_CAP,
      remaining: Math.max(0, MANUAL_MONTHLY_CAP - manualMonthlyUsed),
      resetsAt:  nextFirstOfMonth.toISOString(),
      note:      'Manual AI Research & Write from the post editor (ai_usage_log type=manual). Resets on the 1st.',
    },
    keywordArticles: {
      pending: kwPending,
      publishedToday: kwPublishedToday,
      note: 'SEO/GEO/AEO keyword-driven articles (written at 04:15 UTC)',
    },
  })
}

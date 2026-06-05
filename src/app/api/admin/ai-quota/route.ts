import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [geminiResult, articleResult, kwPendingResult, kwPublishedResult, manualGeminiResult] = await Promise.all([
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('daily_article_count').select('count').eq('date', new Date().toISOString().slice(0, 10)).single(),
    supabase.from('keyword_articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('keyword_articles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()).eq('used_for', 'manual'),
  ])

  const geminiUsed = geminiResult.count || 0
  const manualGeminiUsed = manualGeminiResult.count || 0
  const totalToday = articleResult.data?.count || 0
  const kwPending = kwPendingResult.count || 0
  const kwPublishedToday = kwPublishedResult.count || 0

  const tomorrow = new Date(todayStart)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const GEMINI_CAP = 30
  const MANUAL_GEMINI_CAP = 20

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
    keywordArticles: {
      pending: kwPending,
      publishedToday: kwPublishedToday,
      note: 'SEO/GEO/AEO keyword-driven articles (written at 04:15 UTC)',
    },
  })
}

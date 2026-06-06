import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function fetchPageSpeed() {
  const key = process.env.PAGESPEED_API_KEY
  if (!key) return null
  try {
    const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://blizine.com')}&strategy=mobile&key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const data = await res.json()
    const cats = data.lighthouseResult?.categories
    const audits = data.lighthouseResult?.audits
    return {
      performance:   Math.round((cats?.performance?.score || 0) * 100),
      accessibility: Math.round((cats?.accessibility?.score || 0) * 100),
      seo:           Math.round((cats?.seo?.score || 0) * 100),
      bestPractices: Math.round((cats?.['best-practices']?.score || 0) * 100),
      lcp:           audits?.['largest-contentful-paint']?.displayValue || 'N/A',
      inp:           audits?.['interaction-to-next-paint']?.displayValue || 'N/A',
      cls:           audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
      fcp:           audits?.['first-contentful-paint']?.displayValue || 'N/A',
    }
  } catch {
    return null
  }
}

async function fetchBlizineStats(supabase: any) {
  const today = new Date().toISOString().slice(0, 10)

  const [postsRes, draftCountRes, scheduledRes, archivedRes, todayRssPostsRes, todayAllPostsRes, totalFeedRes, geminiRes] = await Promise.allSettled([
    supabase.from('posts').select('id, views, title, slug, published_at').eq('status', 'published'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published').not('source_name', 'is', null).gte('published_at', `${today}T00:00:00Z`),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', `${today}T00:00:00Z`),
    supabase.from('rss_feeds').select('posts_fetched').not('posts_fetched', 'is', null),
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', today),
  ])

  const posts = postsRes.status === 'fulfilled' ? postsRes.value.data || [] : []
  const totalViews = posts.reduce((s: number, p: any) => s + (p.views || 0), 0)

  const sorted = [...posts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0)).slice(0, 5)

  const draftCount = draftCountRes.status === 'fulfilled' ? draftCountRes.value.count || 0 : 0
  const scheduledCount = scheduledRes.status === 'fulfilled' ? scheduledRes.value.count || 0 : 0
  const archivedCount = archivedRes.status === 'fulfilled' ? archivedRes.value.count || 0 : 0

  return {
    publishedPosts: posts.length,
    totalViews,
    draftPosts: draftCount,
    scheduledPosts: scheduledCount,
    archivedPosts: archivedCount,
    postStatusDist: [
      { name: 'Published', value: posts.length },
      { name: 'Draft', value: draftCount },
      { name: 'Scheduled', value: scheduledCount },
      { name: 'Archived', value: archivedCount },
    ].filter(s => s.value > 0),
    todayArticles: todayAllPostsRes.status === 'fulfilled' ? todayAllPostsRes.value.count || 0 : 0,
    rssArticlesToday: todayRssPostsRes.status === 'fulfilled' ? todayRssPostsRes.value.count || 0 : 0,
    geminiToday: geminiRes.status === 'fulfilled' ? geminiRes.value.count || 0 : 0,
    totalFeedPosts: totalFeedRes.status === 'fulfilled'
      ? (totalFeedRes.value.data || []).reduce((s: number, f: any) => s + (f.posts_fetched || 0), 0) : 0,
    topPosts: sorted.map((p: any) => ({
      id: p.id, title: p.title, slug: p.slug, views: p.views || 0,
    })),
  }
}

async function fetchAnalyticsEvents(supabase: any, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const [dailyRes, pagesRes, referrersRes, countriesRes] = await Promise.allSettled([
    supabase
      .from('analytics_events')
      .select('created_at')
      .eq('event_type', 'page_view')
      .gte('created_at', since),
    supabase
      .from('analytics_events')
      .select('page_url')
      .eq('event_type', 'page_view')
      .not('page_url', 'is', null)
      .gte('created_at', since)
      .limit(5000),
    supabase
      .from('analytics_events')
      .select('referrer')
      .eq('event_type', 'page_view')
      .not('referrer', 'is', null)
      .gte('created_at', since)
      .limit(5000),
    supabase
      .from('analytics_events')
      .select('country')
      .eq('event_type', 'page_view')
      .not('country', 'is', null)
      .gte('created_at', since)
      .limit(5000),
  ])

  const dailyRows = dailyRes.status === 'fulfilled' ? dailyRes.value.data || [] : []
  const dailyMap: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dailyMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0
  }
  dailyRows.forEach((e: any) => {
    const key = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (dailyMap[key] !== undefined) dailyMap[key]++
  })

  const countByKey = (rows: any[], field: string) => {
    const map: Record<string, number> = {}
    const referrerRows = rows
    referrerRows.forEach((r: any) => {
      let val = r[field] || 'Unknown'
      if (field === 'referrer') {
        if (!val || val === '') val = 'Direct'
        else try { val = new URL(val).hostname } catch { val = 'Direct' }
      }
      map[val] = (map[val] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }

  const referrerRows = referrersRes.status === 'fulfilled' ? referrersRes.value.data || [] : []

  let directCount = 0
  let referredCount = 0
  referrerRows.forEach((r: any) => {
    const ref = r.referrer
    if (!ref || ref === '') directCount++
    else referredCount++
  })

  const trafficSourceDist = []
  if (directCount > 0) trafficSourceDist.push({ name: 'Direct', value: directCount })
  if (referredCount > 0) trafficSourceDist.push({ name: 'Referred', value: referredCount })

  return {
    totalPageViews: dailyRows.length,
    viewsOverTime: Object.entries(dailyMap).map(([date, views]) => ({ date, views })),
    topPages: countByKey(pagesRes.status === 'fulfilled' ? pagesRes.value.data || [] : [], 'page_url'),
    topReferrers: countByKey(referrerRows, 'referrer'),
    topCountries: countByKey(countriesRes.status === 'fulfilled' ? countriesRes.value.data || [] : [], 'country'),
    trafficSourceDist,
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'editor', 'author'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const days = parseInt(new URL(req.url).searchParams.get('days') || '28')

  const [blizine, analytics, pagespeed] = await Promise.all([
    fetchBlizineStats(supabase),
    fetchAnalyticsEvents(supabase, days),
    fetchPageSpeed(),
  ])

  return NextResponse.json({
    ok: true,
    days,
    blizine,
    analytics,
    pagespeed,
    fetchedAt: new Date().toISOString(),
  })
}

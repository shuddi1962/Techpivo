import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GOOGLE_CONFIGURED = !!(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  process.env.GOOGLE_PRIVATE_KEY &&
  process.env.GOOGLE_GA4_PROPERTY_ID
)

function getGoogleAuth() {
  if (!GOOGLE_CONFIGURED) return null
  const { google } = require('googleapis')
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  })
}

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date(Date.now() - days * 86400000)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

async function fetchGA4Data(auth: any, days: number) {
  if (!auth || !GOOGLE_CONFIGURED) return null
  try {
    const { google } = require('googleapis')
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth })
    const { startDate, endDate } = getDateRange(days)
    const propertyId = process.env.GOOGLE_GA4_PROPERTY_ID!

    const [overview, daily, sources, devices, pages, geo, realtime] = await Promise.allSettled([
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [
            { startDate, endDate },
            { startDate: getDateRange(days * 2).startDate, endDate: getDateRange(days).startDate },
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'averageSessionDuration' },
            { name: 'engagementRate' },
            { name: 'newUsers' },
          ],
        },
      }),
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'newUsers' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
      }),
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
        },
      }),
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }],
        },
      }),
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'newUsers' }, { name: 'totalUsers' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        },
      }),
      analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'totalUsers' }],
          orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
          limit: 8,
        },
      }),
      analyticsData.properties.runRealtimeReport({
        property: propertyId,
        requestBody: {
          metrics: [{ name: 'activeUsers' }],
          dimensions: [{ name: 'deviceCategory' }],
        },
      }),
    ])

    const extract = (r: any) => r.status === 'fulfilled' ? r.value?.data : null

    return {
      overview: extract(overview),
      daily: extract(daily),
      sources: extract(sources),
      devices: extract(devices),
      pages: extract(pages),
      geo: extract(geo),
      realtime: extract(realtime),
    }
  } catch {
    return null
  }
}

async function fetchSearchConsoleData(auth: any, days: number) {
  if (!auth || !GOOGLE_CONFIGURED) return null
  try {
    const { google } = require('googleapis')
    const webmasters = google.webmasters({ version: 'v3', auth })
    const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL!
    const { startDate, endDate } = getDateRange(days)

    const [summary, daily, keywords, pages] = await Promise.allSettled([
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, type: 'web' },
      }),
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions: ['date'], type: 'web', rowLimit: days },
      }),
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate, endDate, dimensions: ['query'], type: 'web', rowLimit: 10,
          orderBy: [{ field: 'clicks', sortOrder: 'DESCENDING' }],
        },
      }),
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate, endDate, dimensions: ['page'], type: 'web', rowLimit: 10,
          orderBy: [{ field: 'clicks', sortOrder: 'DESCENDING' }],
        },
      }),
    ])

    const extract = (r: any) => r.status === 'fulfilled' ? r.value?.data : null

    return {
      summary: extract(summary),
      daily: extract(daily),
      keywords: extract(keywords),
      pages: extract(pages),
    }
  } catch {
    return null
  }
}

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
      performance: Math.round((cats?.performance?.score || 0) * 100),
      accessibility: Math.round((cats?.accessibility?.score || 0) * 100),
      seo: Math.round((cats?.seo?.score || 0) * 100),
      lcp: audits?.['largest-contentful-paint']?.displayValue || 'N/A',
      inp: audits?.['interaction-to-next-paint']?.displayValue || 'N/A',
      cls: audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
      fcp: audits?.['first-contentful-paint']?.displayValue || 'N/A',
    }
  } catch {
    return null
  }
}

async function fetchBlizineStats() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const today = new Date().toISOString().slice(0, 10)

  const [postsRes, todayCountRes, feedsRes, geminiRes] = await Promise.allSettled([
    supabase.from('posts').select('status, views').eq('status', 'published'),
    supabase.from('daily_article_count').select('count').eq('date', today).single(),
    supabase.from('rss_feeds').select('posts_fetched').not('posts_fetched', 'is', null),
    supabase.from('gemini_usage_log').select('*', { count: 'exact', head: true }).gte('created_at', today),
  ])

  const posts = postsRes.status === 'fulfilled' ? postsRes.value.data || [] : []
  const totalViews = posts.reduce((s: number, p: any) => s + (p.views || 0), 0)
  const publishedCount = posts.length

  return {
    publishedPosts: publishedCount,
    totalViews,
    todayArticles: todayCountRes.status === 'fulfilled' ? todayCountRes.value.data?.count || 0 : 0,
    geminiToday: geminiRes.status === 'fulfilled' ? geminiRes.value.count || 0 : 0,
    totalFeedPosts: feedsRes.status === 'fulfilled'
      ? (feedsRes.value.data || []).reduce((s: number, f: any) => s + (f.posts_fetched || 0), 0)
      : 0,
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

  try {
    const auth = getGoogleAuth()
    const [ga4, gsc, pagespeed, blizine] = await Promise.allSettled([
      fetchGA4Data(auth, days),
      fetchSearchConsoleData(auth, days),
      fetchPageSpeed(),
      fetchBlizineStats(),
    ])

    return NextResponse.json({
      ok: true,
      days,
      googleConfigured: GOOGLE_CONFIGURED,
      ga4: ga4.status === 'fulfilled' ? ga4.value : null,
      gsc: gsc.status === 'fulfilled' ? gsc.value : null,
      pagespeed: pagespeed.status === 'fulfilled' ? pagespeed.value : null,
      blizine: blizine.status === 'fulfilled' ? blizine.value : null,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

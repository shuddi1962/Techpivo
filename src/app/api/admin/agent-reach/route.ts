import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  webFetch, webSearch, youtubeInfo, githubSearch,
  rssFetch, linkedinProfile, channelHealth,
  searchSuggest, trending,
} from "@/lib/agent-reach"
import type { TrendingBundle } from "@/lib/agent-reach"
import { filterVerified, verifyUrls } from "@/lib/link-verify"
import { logAIUsage, logAIUsageThrottled } from "@/lib/ai-usage"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim()
}

function isCovered(keyword: string, covered: string[]): boolean {
  const kw = normalize(keyword)
  if (!kw) return false
  const kwWords = kw.split(" ")
  return covered.some((raw) => {
    const title = normalize(raw)
    if (!title) return false
    if (kw.length >= 5 && title.includes(kw)) return true
    const significant = kwWords.filter((w) => w.length > 3)
    if (significant.length === 0) return false
    const hit = significant.filter((w) => title.includes(w)).length
    return hit / significant.length >= 0.6
  })
}

async function filterAlreadyCovered(supabase: SupabaseClient, bundle: TrendingBundle): Promise<TrendingBundle> {
  const { data: posts } = await supabase
    .from("posts")
    .select("title, tags")
    .not("title", "is", null)
    .limit(2000)
  if (!posts || posts.length === 0) return bundle

  const covered: string[] = []
  for (const p of posts) {
    if (p.title) covered.push(p.title)
    if (Array.isArray(p.tags)) covered.push(...p.tags.map(String))
  }

  const coveredCheck = (s: string) => isCovered(s, covered)
  return {
    ...bundle,
    hackerNews: bundle.hackerNews.filter((i) => !coveredCheck(i.title)),
    github: bundle.github.filter((i) => !coveredCheck(i.title)),
    keywords: bundle.keywords.filter((k) => !coveredCheck(k)),
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { channel, query, url, q } = await request.json()
    const text = String(query || q || url || "").trim()
    const startTime = Date.now()

    const logChannel = (status: "success" | "error" = "success", throttleMinutes?: number) => {
      const headline = channel === "trending" ? "Trending bundle poll" : text.slice(0, 120)
      if (throttleMinutes) {
        return logAIUsageThrottled(channel, throttleMinutes, headline, status, Date.now() - startTime)
      }
      return logAIUsage(channel, headline, status, Date.now() - startTime)
    }

    switch (channel) {
      case "web": {
        if (!text) return NextResponse.json({ error: "URL required" }, { status: 400 })
        try {
          const result = await webFetch(text)
          await logChannel()
          return NextResponse.json({ result })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "search": {
        if (!text) return NextResponse.json({ error: "Query required" }, { status: 400 })
        try {
          const result = await webSearch(text)
          const verified = await filterVerified(result.results)
          await logChannel()
          return NextResponse.json({ result: { ...result, results: verified } })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "youtube": {
        if (!text) return NextResponse.json({ error: "YouTube URL required" }, { status: 400 })
        try {
          const result = await youtubeInfo(text)
          await logChannel()
          return NextResponse.json({ result })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "github": {
        if (!text) return NextResponse.json({ error: "Query required" }, { status: 400 })
        try {
          const result = await githubSearch(text)
          const items = Array.isArray(result.items) ? result.items : []
          const urls = items.map((i: any) => i?.html_url).filter(Boolean) as string[]
          const verified = await verifyUrls(urls)
          const filteredItems = items.filter((i: any) => !i?.html_url || verified.has(i.html_url))
          await logChannel()
          return NextResponse.json({ result: { ...result, items: filteredItems } })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "rss": {
        if (!text) return NextResponse.json({ error: "RSS URL required" }, { status: 400 })
        try {
          const result = await rssFetch(text)
          const verified = await filterVerified(
            result.items.map((item) => ({ ...item, url: item.link || "" })),
          )
          await logChannel()
          return NextResponse.json({ result: { ...result, items: verified } })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "linkedin": {
        if (!text) return NextResponse.json({ error: "Username required" }, { status: 400 })
        try {
          const result = await linkedinProfile(text)
          await logChannel()
          return NextResponse.json({ result })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "suggest": {
        if (!text) return NextResponse.json({ suggestions: [] })
        try {
          const suggestions = await searchSuggest(text)
          await logChannel()
          return NextResponse.json({ suggestions })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      case "trending": {
        try {
          const result = await trending()
          const filtered = await filterAlreadyCovered(supabase, result)
          const [hn, gh, tr] = await Promise.all([
            filterVerified(filtered.hackerNews),
            filterVerified(filtered.github),
            filterVerified(filtered.trends),
          ])
          // Trending auto-refreshes every minute — throttle its usage log
          await logChannel("success", 15)
          return NextResponse.json({ result: { ...filtered, hackerNews: hn, github: gh, trends: tr } })
        } catch (e) {
          await logChannel("error")
          throw e
        }
      }
      default:
        return NextResponse.json({ error: "Unknown channel" }, { status: 400 })
    }
  } catch (error) {
    console.error("agent-reach error:", error)
    const message = error instanceof Error ? error.message : "Request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const health = await channelHealth()
    return NextResponse.json({ health })
  } catch (error) {
    console.error("agent-reach health error:", error)
    return NextResponse.json({ error: "Health check failed" }, { status: 500 })
  }
}

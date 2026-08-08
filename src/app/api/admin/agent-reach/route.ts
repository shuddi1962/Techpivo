import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  webFetch, webSearch, youtubeInfo, githubSearch,
  rssFetch, linkedinProfile, channelHealth,
  searchSuggest, trending,
} from "@/lib/agent-reach"
import type { TrendingBundle } from "@/lib/agent-reach"

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

    switch (channel) {
      case "web": {
        if (!text) return NextResponse.json({ error: "URL required" }, { status: 400 })
        const result = await webFetch(text)
        return NextResponse.json({ result })
      }
      case "search": {
        if (!text) return NextResponse.json({ error: "Query required" }, { status: 400 })
        const result = await webSearch(text)
        return NextResponse.json({ result })
      }
      case "youtube": {
        if (!text) return NextResponse.json({ error: "YouTube URL required" }, { status: 400 })
        const result = await youtubeInfo(text)
        return NextResponse.json({ result })
      }
      case "github": {
        if (!text) return NextResponse.json({ error: "Query required" }, { status: 400 })
        const result = await githubSearch(text)
        return NextResponse.json({ result })
      }
      case "rss": {
        if (!text) return NextResponse.json({ error: "RSS URL required" }, { status: 400 })
        const result = await rssFetch(text)
        return NextResponse.json({ result })
      }
      case "linkedin": {
        if (!text) return NextResponse.json({ error: "Username required" }, { status: 400 })
        const result = await linkedinProfile(text)
        return NextResponse.json({ result })
      }
      case "suggest": {
        if (!text) return NextResponse.json({ suggestions: [] })
        const suggestions = await searchSuggest(text)
        return NextResponse.json({ suggestions })
      }
      case "trending": {
        const result = await trending()
        const filtered = await filterAlreadyCovered(supabase, result)
        return NextResponse.json({ result: filtered })
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

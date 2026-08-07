import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  webFetch, webSearch, youtubeInfo, githubSearch,
  rssFetch, linkedinProfile, channelHealth,
} from "@/lib/agent-reach"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { channel, query, url } = await request.json()

    switch (channel) {
      case "web": {
        if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })
        const result = await webFetch(String(url))
        return NextResponse.json({ result })
      }
      case "search": {
        if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 })
        const result = await webSearch(String(query))
        return NextResponse.json({ result })
      }
      case "youtube": {
        if (!url) return NextResponse.json({ error: "YouTube URL required" }, { status: 400 })
        const result = await youtubeInfo(String(url))
        return NextResponse.json({ result })
      }
      case "github": {
        if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 })
        const result = await githubSearch(String(query))
        return NextResponse.json({ result })
      }
      case "rss": {
        if (!url) return NextResponse.json({ error: "RSS URL required" }, { status: 400 })
        const result = await rssFetch(String(url))
        return NextResponse.json({ result })
      }
      case "linkedin": {
        if (!query) return NextResponse.json({ error: "Username required" }, { status: 400 })
        const result = await linkedinProfile(String(query))
        return NextResponse.json({ result })
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

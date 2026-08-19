import { NextRequest, NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/admin-auth"
import {
  generateTodayOpportunities,
  generateCategoryIntelligence,
  generateTrendPredictions,
  generateCompanyStories,
  generateBreakingNews,
  generateContentGaps,
  generateCompetitorData,
  generateProductLaunches,
  generateEditorialQueue,
  generateSmartCalendar,
  generateDailyBriefing,
} from "@/lib/editorial-intelligence"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "all"

  try {
    switch (section) {
      case "opportunities":
        return NextResponse.json({ opportunities: await generateTodayOpportunities() })
      case "categories":
        return NextResponse.json({ categories: await generateCategoryIntelligence() })
      case "trends":
        return NextResponse.json({ trends: await generateTrendPredictions() })
      case "predictions":
        return NextResponse.json({ predictions: await generateTrendPredictions() })
      case "companies":
        return NextResponse.json({ companies: await generateCompanyStories() })
      case "breaking":
        return NextResponse.json({ breaking: await generateBreakingNews() })
      case "gaps":
        return NextResponse.json({ gaps: await generateContentGaps() })
      case "competitors":
        return NextResponse.json({ competitors: await generateCompetitorData() })
      case "launches":
        return NextResponse.json({ launches: await generateProductLaunches() })
      case "queue":
        return NextResponse.json({ queue: await generateEditorialQueue() })
      case "calendar":
        return NextResponse.json({ calendar: await generateSmartCalendar() })
      case "briefing":
        return NextResponse.json({ briefing: await generateDailyBriefing() })
      case "briefs": {
        const opportunities = await generateTodayOpportunities()
        const briefs = opportunities.slice(0, 5).map((o, i) => ({
          id: `brief-${i}`,
          topic: o.topic,
          category: o.category,
          opportunity_score: o.score,
          status: "generated" as const,
          created_at: new Date().toISOString(),
          keywords: [o.topic.toLowerCase(), `${o.topic} guide`, `${o.topic} 2026`],
          estimated_reading_time: "12 min read",
        }))
        return NextResponse.json({ briefs })
      }
      case "all": {
        const [opportunities, categories, trends, companies, breaking, gaps, competitors, launches, queue, calendar, briefing] = await Promise.all([
          generateTodayOpportunities(),
          generateCategoryIntelligence(),
          generateTrendPredictions(),
          generateCompanyStories(),
          generateBreakingNews(),
          generateContentGaps(),
          generateCompetitorData(),
          generateProductLaunches(),
          generateEditorialQueue(),
          generateSmartCalendar(),
          generateDailyBriefing(),
        ])
        return NextResponse.json({ opportunities, categories, trends, companies, breaking, gaps, competitors, launches, queue, calendar, briefing })
      }
      default:
        return NextResponse.json({ error: "Unknown section" }, { status: 400 })
    }
  } catch (error) {
    console.error("Editorial intelligence API error:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

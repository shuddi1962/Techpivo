import { NextResponse } from "next/server"
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

export async function GET(request: Request) {
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
      case "companies":
        return NextResponse.json({ companies: generateCompanyStories() })
      case "breaking":
        return NextResponse.json({ breaking: generateBreakingNews() })
      case "gaps":
        return NextResponse.json({ gaps: generateContentGaps() })
      case "competitors":
        return NextResponse.json({ competitors: generateCompetitorData() })
      case "launches":
        return NextResponse.json({ launches: generateProductLaunches() })
      case "queue":
        return NextResponse.json({ queue: generateEditorialQueue() })
      case "calendar":
        return NextResponse.json({ calendar: generateSmartCalendar() })
      case "briefing":
        return NextResponse.json({ briefing: generateDailyBriefing() })
      default:
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

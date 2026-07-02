import { NextRequest, NextResponse } from "next/server"
import {
  generateTodayOpportunities,
  generateCategoryIntelligence,
  generateTrendPredictions,
  generateCompanyStories,
  generateBreakingNews,
} from "@/lib/editorial-intelligence"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const section = searchParams.get("section") || "all"

  try {
    if (section === "opportunities") {
      const data = await generateTodayOpportunities()
      return NextResponse.json({ opportunities: data })
    }
    if (section === "categories") {
      const data = await generateCategoryIntelligence()
      return NextResponse.json({ categories: data })
    }
    if (section === "trends") {
      const data = await generateTrendPredictions()
      return NextResponse.json({ trends: data })
    }
    if (section === "companies") {
      const data = generateCompanyStories()
      return NextResponse.json({ companies: data })
    }
    if (section === "breaking") {
      const data = generateBreakingNews()
      return NextResponse.json({ breaking: data })
    }

    const [opportunities, categories, trends, companies, breaking] = await Promise.all([
      generateTodayOpportunities(),
      generateCategoryIntelligence(),
      generateTrendPredictions(),
      Promise.resolve(generateCompanyStories()),
      Promise.resolve(generateBreakingNews()),
    ])
    return NextResponse.json({ opportunities, categories, trends, companies, breaking })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

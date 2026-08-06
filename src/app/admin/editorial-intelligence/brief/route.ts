import { NextResponse } from "next/server"
import { generateArticlePlan, generateResearchResults } from "@/lib/editorial-intelligence"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get("topic")
    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }
    const results = await generateResearchResults(topic)
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Failed to run research" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topic, category } = body

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    const plan = generateArticlePlan(topic, category || "Technology")
    return NextResponse.json({ plan })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { generateArticlePlan } from "@/lib/editorial-intelligence"

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

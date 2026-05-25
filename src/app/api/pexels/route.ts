import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")
  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 })
  }

  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Pexels API key not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: "Pexels search failed" }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Pexels search failed" }, { status: 500 })
  }
}

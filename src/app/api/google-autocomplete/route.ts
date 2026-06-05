import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] })
    }

    const data = await res.json()
    const suggestions: string[] = Array.isArray(data?.[1])
      ? data[1].map((s: any) => (typeof s === "string" ? s : s[0])).filter(Boolean)
      : []

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}

import { NextResponse } from "next/server"
import { searchWebImages } from "@/lib/web-images"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const engine = (searchParams.get("engine") || "auto") as "auto" | "google" | "bing" | "wikimedia"

  if (!query) {
    return NextResponse.json({ items: [], source: "none" })
  }

  // engine=auto tries Google Custom Search (needs keys), then keyless Bing
  // live web scrape, then the keyless Wikimedia Commons API as a last resort.
  const result = await searchWebImages(query, engine)
  return NextResponse.json(result)
}
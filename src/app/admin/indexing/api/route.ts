import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { urls } = await request.json()

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "No URLs provided" }, { status: 400 })
    }

    const { data: settings } = await supabase.from("site_settings").select("value").eq("key", "indexnow_key").single()
    const key = settings?.value || process.env.INDEXNOW_KEY || ""
    if (!key) {
      return NextResponse.json({ error: "IndexNow key not configured (set site_settings.indexnow_key or INDEXNOW_KEY env)" }, { status: 500 })
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || "https://techpivo.com"

    const indexNowRes = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key,
        keyLocation: `${siteUrl}/${key}.txt`,
        urlList: urls,
      }),
    })

    if (!indexNowRes.ok) {
      const errorText = await indexNowRes.text()
      return NextResponse.json({ error: `IndexNow API error: ${indexNowRes.status} ${errorText}` }, { status: indexNowRes.status })
    }

    const now = new Date().toISOString()
    for (const url of urls) {
      await supabase
        .from("google_indexing_queue")
        .update({ status: "submitted", submitted_at: now })
        .eq("url", url)
    }

    return NextResponse.json({ success: true, submitted: urls.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

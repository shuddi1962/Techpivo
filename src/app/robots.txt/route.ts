import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SITE_URL } from "@/lib/constants"

export const dynamic = "force-dynamic"

const DEFAULT_ROBOTS = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin",
  "Disallow: /api/",
  "Disallow: /preview/",
  "Disallow: /tag/",
  "Disallow: /reading-list",
  "Disallow: /subscribe",
  "Disallow: /unsubscribe",
  "Disallow: /media",
  "Disallow: /login",
  "Disallow: /signup",
  "Disallow: /account",
  "",
  "User-agent: Googlebot",
  "Allow: /",
  "",
  "User-agent: Googlebot-Image",
  "Allow: /",
  "",
  "User-agent: Googlebot-News",
  "Allow: /",
  "",
  "User-agent: Mediapartners-Google",
  "Allow: /",
  "",
  "User-agent: GPTBot",
  "Disallow: /",
  "",
  `Sitemap: ${SITE_URL}/sitemap.xml`,
].join("\n")

export async function GET(req: NextRequest) {
  const preview = req.nextUrl.searchParams.get("preview")
  if (preview) {
    return new NextResponse(preview, {
      headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex" },
    })
  }
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "robots_txt")
      .maybeSingle()
    const body = data?.value || DEFAULT_ROBOTS
    return new NextResponse(body, { headers: { "Content-Type": "text/plain" } })
  } catch {
    return new NextResponse(DEFAULT_ROBOTS, { headers: { "Content-Type": "text/plain" } })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()

  const { data: redirects } = await supabase
    .from("redirects")
    .select("from_path")
    .eq("status_code", 410)

  const disallowedPaths = [
    "/admin",
    "/api",
    "/_next",
    "/login",
    "/reset-password",
    ...(redirects?.map(r => r.from_path) || []),
  ]

  const robots = `User-agent: *
Allow: /
${disallowedPaths.map(p => `Disallow: ${p}`).join("\n")}

Sitemap: https://techpivo.com/sitemap.xml
`

  return new NextResponse(robots, {
    headers: { "Content-Type": "text/plain" },
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { rules } = body

  const lines = ["User-agent: *"]
  if (rules?.allow) rules.allow.forEach((p: string) => lines.push(`Allow: ${p}`))
  if (rules?.disallow) rules.disallow.forEach((p: string) => lines.push(`Disallow: ${p}`))
  lines.push("")
  lines.push(`Sitemap: https://techpivo.com/sitemap.xml`)

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain" },
  })
}

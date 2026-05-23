export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blizine.com"

  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${siteUrl}/sitemap.xml`

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  })
}

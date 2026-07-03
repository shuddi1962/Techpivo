import { SITE_URL } from "@/lib/constants"
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/preview/",
          "/tag/",
          "/reading-list",
          "/subscribe",
          "/unsubscribe",
          "/media",
          "/login",
          "/signup",
          "/account",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

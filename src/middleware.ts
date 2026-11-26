import { createServerClientSafe } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { MARKETPLACE_DOMAIN, MAIN_DOMAIN, COOKIE_DOMAIN } from "@/lib/constants"

/** Detect whether the incoming request targets the marketplace subdomain. */
function isMarketplaceHost(host: string): boolean {
  const h = host.toLowerCase()
  return h === MARKETPLACE_DOMAIN || h.endsWith(`.${MARKETPLACE_DOMAIN}`)
}

/** Build a 301 redirect from old /marketplace/* path to shop.techpivo.com/* */
function marketplaceRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl
  if (!pathname.startsWith("/marketplace")) return null

  const target = `https://${MARKETPLACE_DOMAIN}${pathname.replace(/^\/marketplace/, "") || "/"}${search}`
  return NextResponse.redirect(target, 301)
}

/** Paths that are shared between main site and marketplace and must NOT
 *  be rewritten when the marketplace subdomain is hit. */
const SHARED_PREFIXES = [
  "/api",
  "/_next",
  "/admin",
  "/auth",
  "/account",
  "/tools",
  "/community",
  "/answers",
  "/u/",
  "/tag",
  "/category",
  "/series",
  "/author",
  "/search",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-use",
  "/cookies-policy",
  "/disclaimer",
  "/editorial-policy",
  "/corrections-policy",
  "/advertise",
  "/links",
  "/newsletter",
  "/subscribe",
  "/unsubscribe",
  "/connect",
  "/data-deletion",
  "/feed",
  "/media",
  "/preview",
  "/signup",
  "/login",
  "/marketplace",
  "/robots.txt",
  "/sitemap.xml",
  "/rss.xml",
  "/favicon.ico",
  "/icon.svg",
  "/icon.png",
  "/icon-192.png",
  "/og-home.png",
  "/logo.svg",
  "/logo-light.svg",
  "/manifest.json",
  "/badge.png",
  "/badge-72.png",
  "/llms.txt",
]

function isSharedPath(pathname: string): boolean {
  return SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/cgi-sys")) {
    return new NextResponse("Gone", { status: 410 })
  }

  const host = request.headers.get("host") || ""
  const isMarketplace = isMarketplaceHost(host)
  const { pathname, search } = request.nextUrl

  // Skip static asset requests entirely.
  if (
    pathname.startsWith("/_next") ||
    /\.(ico|png|jpg|jpeg|svg|webp|avif|css|js|woff2?|json|xml|txt)$/i.test(
      pathname,
    )
  ) {
    const response = NextResponse.next({ request })
    if (isMarketplace) response.headers.set("x-marketplace", "1")
    return response
  }

  // Legacy redirect: techpivo.com/marketplace/* → shop.techpivo.com/* (301, SEO-preserving).
  if (!isMarketplace && pathname.startsWith("/marketplace")) {
    const target = `https://${MARKETPLACE_DOMAIN}${pathname.replace(/^\/marketplace/, "") || "/"}${search}`
    return NextResponse.redirect(target, 301)
  }

  // Host-based rewrite: shop.techpivo.com/<path> → /marketplace/<path>
  // so the marketplace subdomain serves the marketplace at its root.
  // Shared paths (API, admin, auth, tools, main-site pages, etc.) are left alone.
  if (isMarketplace && !pathname.startsWith("/marketplace") && !isSharedPath(pathname)) {
    return NextResponse.rewrite(
      new URL(`/marketplace${pathname === "/" ? "" : pathname}${search}`, request.url),
    )
  }

  const response = NextResponse.next({ request })

  // Tag marketplace requests so downstream route handlers know.
  if (isMarketplace) {
    response.headers.set("x-marketplace", "1")
  }

  // API/XHR requests must never be redirected to the HTML login page.
  const isRsc = request.headers.get("rsc") === "1"
  const accept = request.headers.get("accept") || ""
  if (!isRsc && !accept.includes("text/html")) {
    return response
  }

  const supabase = createServerClientSafe({
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        // Scope Supabase auth cookies to .techpivo.com so sessions are
        // shared across techpivo.com and shop.techpivo.com.
        const cookieOptions: Record<string, unknown> = { ...options }
        if (!cookieOptions.domain) {
          cookieOptions.domain = COOKIE_DOMAIN
        }
        response.cookies.set(name, value, cookieOptions)
      })
    },
  })

  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const isAdminPath = pathname.startsWith("/admin")
  const isAdminLogin = pathname === "/admin/login"

  if (!user) {
    if (isAdminPath && !isAdminLogin) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      return NextResponse.redirect(url)
    }
  } else {
    if (isAdminPath) {
      let hasAccess = false
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        hasAccess = !!profile && ["admin", "editor", "author"].includes(profile.role)
      } catch {
        hasAccess = false
      }
      if (isAdminLogin) {
        if (hasAccess) {
          const url = request.nextUrl.clone()
          url.pathname = "/admin"
          return NextResponse.redirect(url)
        }
      } else if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next).*)"],
}

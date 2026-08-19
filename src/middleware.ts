import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/cgi-sys")) {
    return new NextResponse("Gone", { status: 410 })
  }
  const response = NextResponse.next({ request })

  // API/XHR requests (client fetch calls) must never be redirected to the HTML
  // login page: admin route handlers self-guard with requireAdminRole and return
  // JSON 401s. Redirecting them turns every response into HTML, which breaks
  // res.json() client-side ("Unexpected token '<', \"<!DOCTYPE...\" is not valid
  // JSON") whenever the session lookup below transiently fails (cold start,
  // network hiccup) or the cookie session has expired.
  const isRsc = request.headers.get("rsc") === "1"
  const accept = request.headers.get("accept") || ""
  if (!isRsc && !accept.includes("text/html")) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // Transient failures (network hiccup, cold start) must never turn into a
  // site-wide 500 — fall through to the request instead.
  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const isAdminPath = request.nextUrl.pathname.startsWith("/admin")
  const isAdminLogin = request.nextUrl.pathname === "/admin/login"

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
  matcher: ["/admin/:path*", "/cgi-sys/:path*"],
}

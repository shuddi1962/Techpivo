import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const requestedNext = searchParams.get("next")

  const isAuthPath = (path: string) => path.startsWith("/auth/") || path.startsWith("/admin/login")
  const hasExplicitNext = !!requestedNext && !isAuthPath(requestedNext)
  const next = hasExplicitNext ? requestedNext : "/account/activity"

  const response = NextResponse.redirect(`${origin}${next}`)
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

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Supabase's verify page redirects back with ONLY `code` (PKCE) — no `type`
      // param, so the session's identity provider tells us which flow completed:
      // "email" = signup confirmation → success page; OAuth providers = login.
      const provider = data.session?.user.app_metadata?.provider
      if (!hasExplicitNext && provider === "email") {
        return NextResponse.redirect(`${origin}/auth/success`)
      }
      return response
    }
  } else if (tokenHash && type) {
    // Custom email template flow: the app receives token_hash + type directly.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return response
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}

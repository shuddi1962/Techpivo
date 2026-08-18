import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limiter"
import { isSameOrigin } from "@/lib/csrf"
import { auditLog } from "@/lib/audit-log"

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 })
  }
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1"
  const ua = request.headers.get("user-agent") || null
  const key = `login:${ip}`

  const { allowed, cooldown } = checkRateLimit(key)
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${cooldown}s.`, cooldown },
      { status: 429 }
    )
  }

  const response = NextResponse.json({ success: true })
  const { email, password } = await request.json()

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    void auditLog({ action: "login_failed", entity_type: "auth", details: { email, reason: error.message }, ip_address: ip, user_agent: ua })
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  resetRateLimit(key)
  void auditLog({ user_id: data.user?.id, action: "login", entity_type: "auth", ip_address: ip, user_agent: ua })
  return response
}

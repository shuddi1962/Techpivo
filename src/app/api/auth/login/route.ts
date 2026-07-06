import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limiter"

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1"
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  resetRateLimit(key)
  return response
}

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SITE_URL } from "@/lib/constants"
import { sendBrandedEmail } from "@/lib/email"
import { isSameOrigin } from "@/lib/csrf"
import { auditLog } from "@/lib/audit-log"
import { checkRateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limiter"
import { verifyTurnstile } from "@/lib/turnstile"
import { isPasswordBreached } from "@/lib/hibp"

const ALLOWED_SIGNUP_DOMAINS = ["gmail.com", "googlemail.com", "techpivo.com"]

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 })
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  const ua = request.headers.get("user-agent") || null
  const body = await request.json().catch(() => null)
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }
  const { email, password, fullName } = body

  const limit = checkRateLimit(`signup:${clientIp(request)}`, RATE_LIMITS.signup)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many signup attempts from this IP. Please try again in ${limit.cooldown}s.` },
      { status: 429 }
    )
  }

  if (!(await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : null))) {
    return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const domain = normalizedEmail.split("@")[1] ?? ""
  if (!ALLOWED_SIGNUP_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "Signup is limited to Gmail accounts only." }, { status: 400 })
  }

  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  if (await isPasswordBreached(password)) {
    return NextResponse.json({ error: "This password has appeared in a data breach. Please choose a stronger one." }, { status: 400 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 })
  }

  if (data.user) {
    void auditLog({ user_id: data.user.id, action: "signup", entity_type: "auth", details: { email: normalizedEmail }, ip_address: ip, user_agent: ua })
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      username: normalizedEmail.split("@")[0],
      role: "contributor",
    })
    if (profileError) {
      console.error("Profile creation error:", profileError)
    }

    const name = (fullName as string) || normalizedEmail.split("@")[0]
    sendBrandedEmail({
      to: normalizedEmail,
      subject: `Welcome to Techpivo, ${name}! 🚀`,
      title: `Welcome aboard, ${name}!`,
      bodyHtml: `<p style="margin:0 0 12px;">Your Techpivo account has been created. You can now:</p>
<ul style="margin:0 0 12px;padding-left:20px;">
  <li>Join discussions and answer questions in the <strong>Forum</strong></li>
  <li>Take <strong>quizzes</strong> and climb the leaderboard</li>
  <li>Bookmark articles and track your reading history</li>
  <li>Earn XP and unlock badges as you explore</li>
</ul>
<p style="margin:0;">One last step — confirm your email address using the link we sent you to activate your account fully.</p>`,
      cta: { label: "Start Exploring", url: SITE_URL },
      footerNote: "You received this because you created an account on Techpivo.com.",
    }).catch((err) => console.error("Welcome email error:", err))
  }

  return NextResponse.json({ success: true, email: normalizedEmail })
}

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SITE_URL } from "@/lib/constants"
import { sendBrandedEmail } from "@/lib/email"
import { isSameOrigin } from "@/lib/csrf"
import { auditLog } from "@/lib/audit-log"

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
    email,
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
    void auditLog({ user_id: data.user.id, action: "signup", entity_type: "auth", details: { email }, ip_address: ip, user_agent: ua })
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      username: email.split("@")[0],
      role: "contributor",
    })
    if (profileError) {
      console.error("Profile creation error:", profileError)
    }

    const name = (fullName as string) || email.split("@")[0]
    sendBrandedEmail({
      to: email,
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

  return NextResponse.json({ success: true, email })
}

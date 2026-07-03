import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json()

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription: endpoint is required" }, { status: 400 })
    }

    if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription: missing keys" }, { status: 400 })
    }

    const supabase = await createClient()

    const userAgent = req.headers.get("user-agent") || ""
    let deviceType = "desktop"
    if (/android|iphone|ipad|mobile/i.test(userAgent)) {
      deviceType = /ipad|tablet/i.test(userAgent) ? "tablet" : "mobile"
    }

    let browser = "Unknown"
    if (/chrome/i.test(userAgent) && !/edge|opr/i.test(userAgent)) browser = "Chrome"
    else if (/firefox/i.test(userAgent)) browser = "Firefox"
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari"
    else if (/edge/i.test(userAgent)) browser = "Edge"
    else if (/opr|opera/i.test(userAgent)) browser = "Opera"

    let os = "Unknown"
    if (/windows/i.test(userAgent)) os = "Windows"
    else if (/mac os/i.test(userAgent)) os = "macOS"
    else if (/linux/i.test(userAgent)) os = "Linux"
    else if (/android/i.test(userAgent)) os = "Android"
    else if (/iphone|ipad/i.test(userAgent)) os = "iOS"

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          device_type: deviceType,
          browser,
          os,
          user_agent: userAgent,
          subscribed_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select()
      .single()

    if (error) {
      console.error("Push subscribe error:", error)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, subscriber: data })
  } catch (err) {
    console.error("Push subscribe error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const endpoint = body?.endpoint

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)

    if (error) {
      console.error("Push unsubscribe error:", error)
      return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Push unsubscribe error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

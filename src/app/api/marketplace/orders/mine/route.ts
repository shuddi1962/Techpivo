import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@/lib/supabase/admin"
import { checkRateLimit, clientIp } from "@/lib/rate-limiter"
import { isSameOrigin } from "@/lib/csrf"

export const dynamic = "force-dynamic"

// GET /api/marketplace/orders/mine — the signed-in shopper's own orders,
// matched server-side against their account email. 401 when logged out.
export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 })
  }
  const rl = checkRateLimit(`orders-mine:${clientIp(request)}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const email = user.email.trim().toLowerCase()
  const svc = createServiceClient()
  const { data: orders, error } = await svc
    .from("marketplace_orders")
    .select("paystack_reference,status,paystack_status,total_ngn,total_usd,items,created_at,ship_city,ship_country")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: "Could not load orders." }, { status: 500 })
  return NextResponse.json({ orders: orders || [] })
}

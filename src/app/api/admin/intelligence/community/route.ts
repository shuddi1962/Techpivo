import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { getCommunitySignals } from "@/lib/intelligence/community";

export const dynamic = "force-dynamic";

/** GET /api/admin/intelligence/community — real community demand signals. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-comm:${clientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }
  try {
    return NextResponse.json(await getCommunitySignals());
  } catch {
    return NextResponse.json({ error: "Community signals unavailable (database read failed)." }, { status: 500 });
  }
}

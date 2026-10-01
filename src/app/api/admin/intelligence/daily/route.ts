import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { getDailyIntel } from "@/lib/intelligence/daily";

export const dynamic = "force-dynamic";

/** GET /api/admin/intelligence/daily — "What should TechPivo do today?" */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-daily:${clientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }
  try {
    const intel = await getDailyIntel();
    return NextResponse.json({
      ...intel,
      note: intel.recommendations.length === 0
        ? "No signals yet — run a discovery, analyze a keyword, or wait for snapshot history to accumulate."
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Daily intel unavailable (database read failed)." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import {
  fetchLiveSerp,
  logDataForSeoUsage,
  resolveLocation,
  DFS_DEFAULT_LANGUAGE_CODE,
  DFS_DEFAULT_LOCATION_CODE,
} from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  keyword: z.string().trim().min(2).max(80),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().trim().min(2).max(10).optional(),
  depth: z.number().int().min(1).max(20).optional(),
});

/**
 * POST /api/admin/intelligence/dataforseo/serp
 * Live Google organic SERP snapshot for one keyword + market.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`dfs-serp:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide keyword (2-80 chars), optional locationCode, languageCode, depth (1-20)." }, { status: 400 });
  }

  try {
    const { serp, cost } = await fetchLiveSerp({
      keyword: body.keyword,
      locationCode: body.locationCode ?? DFS_DEFAULT_LOCATION_CODE,
      languageCode: (body.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE).toLowerCase(),
      depth: body.depth ?? 10,
    });
    const location = resolveLocation(serp.locationCode);
    logDataForSeoUsage("serp_snapshot", cost, { keyword: body.keyword, locationCode: serp.locationCode });
    return NextResponse.json({
      ...serp,
      locationName: location.name,
      locationScope: location.scope,
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : 502;
      return NextResponse.json(
        { error: err.message, reason: err.status, retryable: err.retryable },
        { status: http }
      );
    }
    return NextResponse.json({ error: "SERP lookup failed.", reason: "unknown" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import {
  fetchKeywordOverview,
  fetchKeywordSuggestions,
  normalizeMetric,
  logDataForSeoUsage,
  resolveLocation,
  DFS_DEFAULT_LANGUAGE_CODE,
  DFS_DEFAULT_LOCATION_CODE,
} from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  seed: z.string().trim().min(2).max(80),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().trim().min(2).max(10).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * POST /api/admin/intelligence/dataforseo/keywords
 * Real keyword ideas + volume for a seed + market. No fake data:
 * every row carries source + fetchedAt; errors surface as
 * "Data unavailable / reason" with retry guidance.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`dfs-keywords:${clientIp(request)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide seed (2-80 chars), optional locationCode, languageCode, limit (1-50)." }, { status: 400 });
  }

  const locationCode = body.locationCode ?? DFS_DEFAULT_LOCATION_CODE;
  const languageCode = (body.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE).toLowerCase();
  const location = resolveLocation(locationCode);

  try {
    const [sugg, over] = await Promise.all([
      fetchKeywordSuggestions({ seed: body.seed, keywords: [], locationCode, locationName: location.name, languageCode, limit: body.limit ?? 20 }),
      fetchKeywordOverview({ keywords: [body.seed], locationCode, locationName: location.name, languageCode }),
    ]);
    logDataForSeoUsage("keyword_discovery", sugg.cost, { seed: body.seed, locationCode });
    if (over.cost.cost) logDataForSeoUsage("keyword_discovery", over.cost, { seed: body.seed, locationCode });
    const suggestions = sugg.suggestions
      .map((s) => normalizeMetric(s))
      .filter((s): s is NonNullable<typeof s> => s !== null);
    return NextResponse.json({
      seed: body.seed,
      location: { code: locationCode, name: location.name, scope: location.scope },
      languageCode,
      seedData: over.metrics[0] ?? sugg.seedData ?? null,
      totalCount: sugg.totalCount,
      suggestions,
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      const http = err.status === "not_configured" ? 503 : err.status === "auth_failed" ? 502 : 502;
      return NextResponse.json(
        { error: err.message, reason: err.status, retryable: err.retryable },
        { status: http }
      );
    }
    return NextResponse.json({ error: "Keyword lookup failed.", reason: "unknown" }, { status: 500 });
  }
}

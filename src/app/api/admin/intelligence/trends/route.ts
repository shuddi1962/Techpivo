import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limiter";
import { classifyTrend, type SnapshotPoint } from "@/lib/intelligence/trends";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/trends?keyword=&locationCode=&languageCode=
 * Real movement from stored keyword_snapshots. Without a keyword, returns
 * the tracked-keyword overview (latest volume + snapshot count per keyword).
 * DB reads only — no DataForSEO spend. Never invents a trend.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`intel-trends:${clientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited. Wait a minute and retry." }, { status: 429 });
  }

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim().slice(0, 80);
  const locationCode = Number(url.searchParams.get("locationCode")) || 2840;
  const languageCode = (url.searchParams.get("languageCode") ?? "en").toLowerCase().slice(0, 10);

  const supabase = createClient();

  if (!keyword) {
    const { data, error } = await supabase
      .from("keyword_snapshots")
      .select("keyword, location_code, language_code, metrics, fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(2000);
    if (error) return NextResponse.json({ error: "Failed to load trend history." }, { status: 500 });
    const seen = new Map<string, { keyword: string; location_code: number; language_code: string; latest_volume: number | null; snapshots: number; last_measured: string }>();
    for (const row of data ?? []) {
      const key = `${(row.keyword as string).toLowerCase()}|${row.location_code}|${row.language_code}`;
      const metrics = (row.metrics ?? {}) as { searchVolume?: number | null };
      if (!seen.has(key)) {
        seen.set(key, {
          keyword: row.keyword as string,
          location_code: row.location_code as number,
          language_code: row.language_code as string,
          latest_volume: typeof metrics.searchVolume === "number" ? metrics.searchVolume : null,
          snapshots: 0,
          last_measured: row.fetched_at as string,
        });
      }
      seen.get(key)!.snapshots += 1;
    }
    return NextResponse.json({ tracked: [...seen.values()] });
  }

  const { data, error } = await supabase
    .from("keyword_snapshots")
    .select("metrics, fetched_at")
    .eq("keyword", keyword)
    .eq("location_code", locationCode)
    .eq("language_code", languageCode)
    .order("fetched_at", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: "Failed to load trend history." }, { status: 500 });

  const points: SnapshotPoint[] = (data ?? []).map((row) => {
    const m = (row.metrics ?? {}) as {
      searchVolume?: number | null; trendMonthly?: number | null; trendYearly?: number | null;
    };
    return {
      fetchedAt: row.fetched_at as string,
      searchVolume: typeof m.searchVolume === "number" ? m.searchVolume : null,
      trendMonthly: typeof m.trendMonthly === "number" ? m.trendMonthly : null,
      trendYearly: typeof m.trendYearly === "number" ? m.trendYearly : null,
    };
  });

  return NextResponse.json(classifyTrend(keyword, locationCode, languageCode, points));
}

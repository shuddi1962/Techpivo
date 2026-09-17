/**
 * Batch tool usage stats API
 * GET /api/public/v1/tool-stats?slugs=json-formatter,password-generator,...
 * Returns usage_count + trending status for the requested slugs.
 * GET /api/public/v1/tool-stats?trending=true&limit=8
 * Returns the top N trending tools by usage_count.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CACHE_MS = 5 * 60 * 1000; // 5 minutes
let statsCache: { data: Record<string, { usage_count: number; trending: boolean }>; timestamp: number } | null = null;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const trendingMode = url.searchParams.get("trending") === "true";
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));

    if (trendingMode) {
      // Return top N trending tools by usage_count
      const { data, error } = await supabase
        .from("tools")
        .select("slug, usage_count")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const topSlugs = new Set((data || []).map((r) => r.slug));
      const lookup: Record<string, { usage_count: number; trending: boolean }> = {};
      for (const row of data || []) {
        lookup[row.slug] = { usage_count: row.usage_count || 0, trending: true };
      }

      return NextResponse.json({
        success: true,
        data: lookup,
        top_slugs: Array.from(topSlugs),
        generated_at: new Date().toISOString(),
      });
    }

    // Batch mode: return stats for specific slugs
    const slugsParam = url.searchParams.get("slugs") || "";
    const slugs = slugsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100); // cap at 100

    if (slugs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Provide ?slugs=slug1,slug2 or ?trending=true" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = slugs.sort().join(",");
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_MS) {
      const hit: Record<string, { usage_count: number; trending: boolean }> = {};
      for (const s of slugs) {
        if (statsCache.data[s]) hit[s] = statsCache.data[s];
      }
      if (Object.keys(hit).length === slugs.length) {
        return NextResponse.json({ success: true, data: hit, cached: true });
      }
    }

    // Fetch from DB
    const { data, error } = await supabase
      .from("tools")
      .select("slug, usage_count")
      .in("slug", slugs);

    if (error) throw error;

    // Also get top-N trending set for badge display
    const { data: topData } = await supabase
      .from("tools")
      .select("slug")
      .eq("is_active", true)
      .order("usage_count", { ascending: false })
      .limit(10);

    const trendingSet = new Set((topData || []).map((r) => r.slug));

    const lookup: Record<string, { usage_count: number; trending: boolean }> = {};
    for (const slug of slugs) {
      const row = (data || []).find((r) => r.slug === slug);
      lookup[slug] = {
        usage_count: row?.usage_count || 0,
        trending: trendingSet.has(slug),
      };
    }

    // Update cache (merge)
    if (statsCache) {
      Object.assign(statsCache.data, lookup);
      statsCache.timestamp = Date.now();
    } else {
      statsCache = { data: lookup, timestamp: Date.now() };
    }

    return NextResponse.json({ success: true, data: lookup });
  } catch (error) {
    console.error("Tool stats API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

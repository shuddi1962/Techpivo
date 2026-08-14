import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const [placements, campaigns, revenue] = await Promise.all([
      supabase
        .from("ad_placements")
        .select("id, name, position, min_bid_cpm, min_bid_cpc, supports_video, est_impressions, is_active")
        .eq("is_active", true)
        .order("min_bid_cpm", { ascending: false }),
      supabase
        .from("ad_campaigns")
        .select("status, impressions, clicks, currency, bid_amount, billing_model"),
      supabase
        .from("ad_revenue")
        .select("impressions, clicks, revenue")
        .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    ]);

    const live = (campaigns.data || []).filter((c) => c.status === "live" || c.status === "approved");
    const totalImpressions = (campaigns.data || []).reduce((s, c) => s + Number(c.impressions || 0), 0);
    const totalClicks = (campaigns.data || []).reduce((s, c) => s + Number(c.clicks || 0), 0);
    const revImpressions = (revenue.data || []).reduce((s, r) => s + Number(r.impressions || 0), 0);

    return NextResponse.json({
      live_campaigns: live.length,
      total_campaigns: (campaigns.data || []).length,
      impressions: totalImpressions + revImpressions,
      clicks: totalClicks,
      placements: (placements.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        min_bid_cpm: p.min_bid_cpm,
        min_bid_cpc: p.min_bid_cpc,
        supports_video: !!p.supports_video,
        est_impressions: p.est_impressions,
      })),
    });
  } catch {
    return NextResponse.json(
      { live_campaigns: 0, total_campaigns: 0, impressions: 0, clicks: 0, placements: [] },
      { status: 200 }
    );
  }
}
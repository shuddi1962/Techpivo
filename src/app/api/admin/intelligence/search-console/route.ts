import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/search-console — integration architecture stub.
 * Search Console is NOT connected (no credentials). Returns the honest
 * status + exact setup path so a future connection plugs in here.
 * Never fabricates queries/clicks/impressions.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const supabase = createClient();
  const { data } = await supabase
    .from("integration_status")
    .select("provider, connected, last_sync_at, last_error, capabilities")
    .eq("provider", "google_search_console")
    .maybeSingle();

  return NextResponse.json({
    connected: (data?.connected as boolean) ?? false,
    last_sync_at: (data?.last_sync_at as string | null) ?? null,
    capabilities: (data?.capabilities as string[]) ?? ["queries", "clicks", "impressions", "ctr", "position"],
    metrics: null,
    message: "Google Search Console is not connected — performance metrics are NOT AVAILABLE.",
    setup: [
      "Create a Google Cloud OAuth client (Search Console API enabled).",
      "Store GOOGLE_SEARCH_CONSOLE_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN as server env vars (never in the DB).",
      "This endpoint will then serve queries, clicks, impressions, CTR and position per page/query.",
      "Combined insight (DataForSEO demand + Search Console visibility) will power CTR and quick-win detection.",
    ],
  });
}

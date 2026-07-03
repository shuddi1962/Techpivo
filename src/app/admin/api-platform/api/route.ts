import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function generateApiKey(): string {
  return `tp_live_${crypto.randomBytes(24).toString("hex")}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const section = request.nextUrl.searchParams.get("section") || "overview";

    if (section === "overview") {
      const { data: keys } = await supabase
        .from("api_keys" as any)
        .select("id, name, rate_limit, status, request_count");

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayRequests } = await supabase
        .from("api_usage_logs" as any)
        .select("id", { count: "exact" })
        .gte("created_at", todayStart.toISOString());

      const { data: topEndpoints } = await supabase
        .from("api_usage_logs" as any)
        .select("endpoint");

      const endpointCounts: Record<string, number> = {};
      (topEndpoints || []).forEach((r: any) => {
        endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] || 0) + 1;
      });
      const topEps = Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([endpoint, count]) => ({ endpoint, count }));

      const { data: avgData } = await supabase
        .from("api_usage_logs" as any)
        .select("response_time_ms");

      const avgResponse = (avgData || []).length > 0
        ? Math.round((avgData || []).reduce((s: number, r: any) => s + (r.response_time_ms || 0), 0) / (avgData || []).length)
        : 0;

      const activeKeys = (keys || []).filter((k: any) => k.status === "active");
      const rateLimitStatus = activeKeys.map((k: any) => ({
        key_name: k.name,
        used: k.request_count || 0,
        limit: k.rate_limit || 1000,
      }));

      return NextResponse.json({
        total_keys: (keys || []).length,
        active_keys: activeKeys.length,
        requests_today: (todayRequests || []).length,
        requests_this_month: (todayRequests || []).length,
        avg_response_time: avgResponse,
        top_endpoints: topEps,
        rate_limit_status: rateLimitStatus,
      });
    }

    if (section === "keys") {
      const { data: keys, error } = await supabase
        .from("api_keys" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error && error.code === "42P01") {
        return NextResponse.json({ keys: [] });
      }

      return NextResponse.json({ keys: keys || [] });
    }

    if (section === "usage") {
      const { data: usage, error } = await supabase
        .from("api_usage_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error && error.code === "42P01") {
        return NextResponse.json({ usage: [] });
      }

      return NextResponse.json({ usage: usage || [] });
    }

    if (section === "docs") {
      return NextResponse.json({
        version: "v1",
        base_url: "/api/public/v1",
        auth_header: "X-API-Key",
        rate_limits: { default: 1000, search: 500, public: 2000 },
        endpoints: [
          { method: "GET", path: "/posts", description: "List posts with pagination", params: ["page", "per_page", "category", "tag"] },
          { method: "GET", path: "/posts/:slug", description: "Get a single post" },
          { method: "GET", path: "/categories", description: "List categories" },
          { method: "GET", path: "/search", description: "Search posts", params: ["q", "page", "per_page"] },
          { method: "GET", path: "/tags", description: "List tags" },
        ],
      });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body;

    if (action === "create_key") {
      const { name, scopes, rate_limit } = body;
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const prefix = rawKey.substring(0, 12);

      const { data, error } = await supabase
        .from("api_keys" as any)
        .insert({
          name,
          key_hash: keyHash,
          prefix,
          scopes: scopes || ["read"],
          rate_limit: rate_limit || 1000,
          status: "active",
          request_count: 0,
          last_used_at: null,
        })
        .select()
        .single();

      if (error && error.code === "42P01") {
        return NextResponse.json({ success: true, api_key: rawKey, message: "Key created (mock)" });
      }
      if (error) throw error;

      return NextResponse.json({ success: true, api_key: rawKey, key_id: data?.id });
    }

    if (action === "revoke_key") {
      const { key_id } = body;
      if (!key_id) return NextResponse.json({ error: "key_id required" }, { status: 400 });

      const { error } = await supabase
        .from("api_keys" as any)
        .update({ status: "revoked" })
        .eq("id", key_id);

      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, key_id } = body;

    if (action === "delete_key") {
      if (!key_id) return NextResponse.json({ error: "key_id required" }, { status: 400 });

      const { error } = await supabase
        .from("api_keys" as any)
        .delete()
        .eq("id", key_id);

      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

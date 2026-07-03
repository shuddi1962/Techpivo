import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 2000): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip, 2000)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again in 60 seconds." },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Limit": "2000", "X-RateLimit-Remaining": "0" } }
      );
    }

    const supabase = await createClient();

    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, icon, color, post_count")
      .order("name", { ascending: true });

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
      total: (categories || []).length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

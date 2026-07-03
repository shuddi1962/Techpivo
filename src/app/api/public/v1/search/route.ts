import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 500): boolean {
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

    if (!checkRateLimit(ip, 500)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again in 60 seconds." },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Limit": "500", "X-RateLimit-Remaining": "0" } }
      );
    }

    const supabase = await createClient();
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("per_page") || "20")));
    const offset = (page - 1) * perPage;

    if (!query.trim()) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();

    const { data: posts, error, count } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt, featured_image, category, tags, author, published_at, reading_time", { count: "exact" })
      .eq("status", "published")
      .or(`title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order("published_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          data: [],
          query: searchTerm,
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
        });
      }
      throw error;
    }

    const totalPages = count ? Math.ceil(count / perPage) : 0;

    return NextResponse.json({
      success: true,
      data: posts || [],
      query: searchTerm,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

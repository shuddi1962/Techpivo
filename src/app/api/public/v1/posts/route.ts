import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category: string;
  tags: string[];
  author: string;
  published_at: string;
  updated_at: string;
  reading_time: number;
  seo_title: string;
  meta_description: string;
}

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 1000): boolean {
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

    if (!checkRateLimit(ip, 1000)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again in 60 seconds." },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Limit": "1000", "X-RateLimit-Remaining": "0" } }
      );
    }

    const supabase = await createClient();
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "20")));
    const category = url.searchParams.get("category");
    const tag = url.searchParams.get("tag");
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("posts")
      .select("id, title, slug, excerpt, featured_image, category, tags, author, published_at, updated_at, reading_time, seo_title, meta_description", { count: "exact" })
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }
    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data: posts, error, count } = await query
      .range(offset, offset + perPage - 1);

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
        });
      }
      throw error;
    }

    const totalPages = count ? Math.ceil(count / perPage) : 0;

    return NextResponse.json({
      success: true,
      data: posts || [],
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

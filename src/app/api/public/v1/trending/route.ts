/**
 * Trending Content API - calculates viral scores and returns trending content
 * GET /api/public/v1/trending?type=posts&period=day&limit=10
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateViralScore } from "@/lib/search-utils";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let trendingCache: { data: any; timestamp: number } | null = null;

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const url = new URL(request.url);
        
        const type = url.searchParams.get("type") || "posts";
        const period = url.searchParams.get("period") || "day";
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
        const category = url.searchParams.get("category") || "";
        const useCache = url.searchParams.get("cache") !== "false";

        if (useCache && trendingCache && Date.now() - trendingCache.timestamp < CACHE_DURATION) {
            return NextResponse.json(trendingCache.data);
        }

        let results: any[] = [];
        let query;

        if (type === "posts") {
            query = supabase
                .from("posts")
                .select("id, title, slug, excerpt, featured_image, category, tags, author, published_at, reading_time, views")
                .eq("status", "published");

            if (category) query = query.eq("category", category);

            const { data, error } = await query
                .order("published_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            const now = Date.now();
            const resultsWithScore = (data || []).map((post) => {
                const ageHours = Math.max(1, (now - new Date(post.published_at).getTime()) / (1000 * 60 * 60));
                
                // Approximate views from different time periods
                // In production, these would come from analytics_events table
                const viewsToday = Math.round(post.views * 0.3); // 30% assumed from today
                const viewsWeek = Math.round(post.views * 0.8); // 80% from this week
                const shares = Math.round(post.views * 0.02); // 2% share rate
                const comments = Math.round(post.views * 0.05); // 5% comment rate

                const score = calculateViralScore(
                    post.views,
                    viewsToday,
                    viewsWeek,
                    shares,
                    comments,
                    ageHours
                );

                return {
                    ...post,
                    score,
                    views_today: viewsToday,
                    views_week: viewsWeek,
                    trending_since: post.published_at,
                };
            });

            results = resultsWithScore
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } else if (type === "community") {
            // Trending community discussions
            query = supabase
                .from("forum_posts")
                .select("id, title, slug, excerpt, category, tags, author_id, created_at, views, reply_count")
                .eq("is_published", true);

            if (category) query = query.eq("category", category);

            const { data, error } = await query
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            const now = Date.now();
            results = (data || []).map((post) => {
                const ageHours = Math.max(1, (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60));
                const score = calculateViralScore(
                    post.views || 0,
                    Math.round((post.views || 0) * 0.3),
                    Math.round((post.views || 0) * 0.8),
                    Math.round((post.views || 0) * 0.01),
                    post.reply_count || 0,
                    ageHours
                );
                return { ...post, score, trending_since: post.created_at };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } else if (type === "tools") {
            // Trending tools
            const { data, error } = await supabase
                .from("tools")
                .select("id, name, slug, description, category, icon, usage_count, is_active")
                .eq("is_active", true);

            if (error) throw error;

            results = (data || [])
                .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                .slice(0, limit);
        }

        const response = {
            success: true,
            type,
            period,
            data: results,
            generated_at: new Date().toISOString(),
        };

        trendingCache = { data: response, timestamp: Date.now() };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Trending API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
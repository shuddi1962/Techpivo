/**
 * Search Analytics API - logs search queries and click-through events
 * 
 * This endpoint receives:
 * - POST /api/public/v1/search-analytics - log a search query
 * - POST /api/public/v1/search-analytics/click - log a click on a result
 * - POST /api/public/v1/search-analytics/engage - log engagement metrics
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 100): boolean {
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

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

        if (!checkRateLimit(ip, 100)) {
            return NextResponse.json(
                { success: false, error: "Rate limit exceeded" },
                { status: 429 }
            );
        }

        const supabase = await createClient();
        const body = await request.json();

        const { query, result_type, result_id, clicked, position, session_id, dwell_time, bounce, conversion } = body;

        if (!query || !result_type) {
            return NextResponse.json(
                { success: false, error: "query and result_type are required" },
                { status: 400 }
            );
        }

        // Get user if authenticated
        let user_id = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) user_id = user.id;
        } catch {
            // Not authenticated, continue
        }

        const { data, error } = await supabase
            .from("search_analytics")
            .insert({
                query: query.trim().toLowerCase(),
                result_type,
                result_id: result_id || null,
                clicked: clicked || false,
                position: position || 0,
                user_id,
                session_id: session_id || null,
                ip_address: ip,
                user_agent: request.headers.get("user-agent") || null,
                referrer: request.headers.get("referer") || null,
                dwell_time: dwell_time || null,
                bounce: bounce || null,
                conversion: conversion || false,
            })
            .select()
            .single();

        if (error) {
            console.error("Search analytics insert error:", error);
            return NextResponse.json(
                { success: false, error: "Failed to log analytics" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error("Search analytics API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Only allow authenticated users to view analytics
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const url = new URL(request.url);
        const query = url.searchParams.get("q") || "";
        const resultType = url.searchParams.get("type") || "";
        const days = parseInt(url.searchParams.get("days") || "30");
        const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

        let dbQuery = supabase
            .from("search_analytics")
            .select("*", { count: "exact" })
            .gte("timestamp", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order("timestamp", { ascending: false })
            .limit(limit);

        if (query) {
            dbQuery = dbQuery.eq("query", query.toLowerCase());
        }
        if (resultType) {
            dbQuery = dbQuery.eq("result_type", resultType);
        }

        const { data, error, count } = await dbQuery;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || [],
            total: count || 0,
        });
    } catch (error) {
        console.error("Search analytics GET error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
/**
 * Related Content API - finds similar content based on tags, keywords, and engagement
 * GET /api/public/v1/related?type=post&id=xxx&limit=5
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateRelatedityScore } from "@/lib/search-utils";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const url = new URL(request.url);

        const type = url.searchParams.get("type") || "post";
        const id = url.searchParams.get("id") || "";
        const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") || "5")));
        const exclude = url.searchParams.get("exclude") || "";

        if (!id) {
            return NextResponse.json(
                { success: false, error: "id is required" },
                { status: 400 }
            );
        }

        let sourceItem: any = null;
        let relatedResults: any[] = [];

        if (type === "post") {
            const { data, error } = await supabase
                .from("posts")
                .select("id, title, slug, excerpt, content, featured_image, category, tags, author, published_at, reading_time, views")
                .eq("id", id)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { success: false, error: "Post not found" },
                    { status: 404 }
                );
            }

            sourceItem = data;

            const { data: candidates, error: candidateError } = await supabase
                .from("posts")
                .select("id, title, slug, excerpt, content, featured_image, category, tags, author, published_at, reading_time, views")
                .eq("status", "published")
                .neq("id", id)
                .limit(100);

            if (candidateError) throw candidateError;

            relatedResults = (candidates || []).map((candidate) => {
                const score = calculateRelatedityScore(
                    sourceItem.tags || [],
                    sourceItem.content || "",
                    candidate.tags || [],
                    candidate.content || ""
                );
                return { ...candidate, score };
            })
                .filter((item) => item.score > 20)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } else if (type === "community") {
            const { data, error } = await supabase
                .from("forum_posts")
                .select("id, title, slug, excerpt, category, tags, author_id, created_at, views, reply_count")
                .eq("id", id)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { success: false, error: "Community post not found" },
                    { status: 404 }
                );
            }

            sourceItem = data;

            const { data: candidates, error: candidateError } = await supabase
                .from("forum_posts")
                .select("id, title, slug, excerpt, category, tags, author_id, created_at, views, reply_count")
                .eq("is_published", true)
                .neq("id", id)
                .limit(100);

            if (candidateError) throw candidateError;

            relatedResults = (candidates || []).map((candidate) => {
                const score = calculateRelatedityScore(
                    sourceItem.tags || [],
                    sourceItem.excerpt || "",
                    candidate.tags || [],
                    candidate.excerpt || ""
                );
                return { ...candidate, score };
            })
                .filter((item) => item.score > 20)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } else if (type === "tool") {
            const { data, error } = await supabase
                .from("tools")
                .select("id, name, slug, description, category, icon, usage_count, is_active")
                .eq("id", id)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { success: false, error: "Tool not found" },
                    { status: 404 }
                );
            }

            sourceItem = data;

            const { data: candidates, error: candidateError } = await supabase
                .from("tools")
                .select("id, name, slug, description, category, icon, usage_count, is_active")
                .eq("is_active", true)
                .neq("id", id)
                .limit(100);

            if (candidateError) throw candidateError;

            relatedResults = (candidates || []).map((candidate) => {
                const score = calculateRelatedityScore(
                    [sourceItem.category || ""],
                    sourceItem.description || "",
                    [candidate.category || ""],
                    candidate.description || ""
                );
                return { ...candidate, score };
            })
                .filter((item) => item.score > 10)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }

        return NextResponse.json({
            success: true,
            type,
            data: relatedResults,
            source: {
                id: sourceItem.id,
                title: sourceItem.title || sourceItem.name,
                slug: sourceItem.slug,
            },
        });
    } catch (error) {
        console.error("Related content API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUSES = [
  "discovered", "analyzing", "ready_for_research", "researching", "brief_ready",
  "drafting", "editor_review", "ready_to_publish", "published",
  "update_required", "rejected", "archived",
] as const;

/** GET /api/admin/intelligence/opportunities?status=&category=&limit=&offset= */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const supabase = createClient();
  let query = supabase
    .from("content_opportunities")
    .select("id, primary_keyword, category, intent, search_volume, score, existing_coverage, status, location_code, created_at, updated_at", { count: "exact" })
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (category) query = query.eq("category", category);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Failed to load opportunities." }, { status: 500 });
  return NextResponse.json({ total: count ?? 0, opportunities: data ?? [] });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
});

/** PATCH /api/admin/intelligence/opportunities {id, status} — editor moves the queue. */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide id (uuid) and a valid status." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_opportunities")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ error: "Status update failed." }, { status: 500 });
  return NextResponse.json(data);
}

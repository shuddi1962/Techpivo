import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const auth = await requireAdminRole();
  if (!auth.ok) return auth.response;

  let body: { slug?: string; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const slug = body.slug;
  if (!slug || typeof slug !== "string" || !/^[a-z0-9-]{1,64}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid tool slug" }, { status: 400 });
  }
  if (typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("tools")
    .update({ is_active: body.is_active })
    .eq("slug", slug)
    .select("slug, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: `Failed to update tool: ${error.message}` }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Tool not found in database" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, tool: data });
}
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth";
import { TOOL_META } from "@/lib/tools-metadata";

const KNOWN_CATEGORIES = ["developer", "security", "network", "seo", "image", "pdf", "calculator", "ai"];
const SLUG_RE = /^[a-z0-9-]{1,64}$/;

function str(v: unknown, max: number): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > max ? undefined : t;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], req);
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action || "toggle";
  if (!["toggle", "update", "delete", "seed"].includes(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const slug = body.slug;
  if (!slug || typeof slug !== "string" || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid tool slug" }, { status: 400 });
  }

  const service = createServiceClient();

  if (action === "toggle") {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
    }
    const { data, error } = await service
      .from("tools")
      .update({ is_active: body.is_active })
      .eq("slug", slug)
      .select("slug, is_active")
      .single();
    if (error) return NextResponse.json({ error: `Failed to update tool: ${error.message}` }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Tool not found in database" }, { status: 404 });
    return NextResponse.json({ ok: true, tool: data });
  }

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    const name = str(body.name, 120);
    const description = str(body.description, 500);
    const category = body.category;
    const icon = str(body.icon, 60);
    const is_ai_tool = body.is_ai_tool;
    const meta_title = str(body.meta_title, 160);
    const meta_description = str(body.meta_description, 320);
    const api_endpoint = str(body.api_endpoint, 500);

    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description || null;
    if (category !== undefined) {
      if (typeof category !== "string" || !KNOWN_CATEGORIES.includes(category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      patch.category = category;
    }
    if (icon !== undefined) patch.icon = icon || null;
    if (is_ai_tool !== undefined) {
      if (typeof is_ai_tool !== "boolean") return NextResponse.json({ error: "is_ai_tool must be a boolean" }, { status: 400 });
      patch.is_ai_tool = is_ai_tool;
    }
    if (meta_title !== undefined) patch.meta_title = meta_title || null;
    if (meta_description !== undefined) patch.meta_description = meta_description || null;
    if (api_endpoint !== undefined) patch.api_endpoint = api_endpoint || null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const { data, error } = await service
      .from("tools")
      .update(patch)
      .eq("slug", slug)
      .select("slug, name, description, category, icon, is_ai_tool, meta_title, meta_description, api_endpoint, is_active")
      .single();
    if (error) return NextResponse.json({ error: `Failed to update tool: ${error.message}` }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Tool not found in database" }, { status: 404 });
    return NextResponse.json({ ok: true, tool: data });
  }

  if (action === "delete") {
    const { error } = await service.from("tools").delete().eq("slug", slug);
    if (error) {
      return NextResponse.json(
        { error: `Could not delete: ${error.message}. If other records reference this tool, deactivate it instead.` },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, deleted: slug });
  }

  // seed: insert a registry tool row (ON CONFLICT DO NOTHING) so it becomes live/trackable
  const meta = TOOL_META[slug];
  if (!meta) {
    return NextResponse.json({ error: "No registry metadata for this slug — add it to TOOL_META first" }, { status: 404 });
  }
  const { data, error } = await service
    .from("tools")
    .insert({
      slug: meta.slug,
      name: meta.name,
      description: meta.description,
      category: meta.category,
      is_active: true,
      is_ai_tool: meta.category === "ai",
      icon: null,
      meta_title: null,
      meta_description: null,
    })
    .select("slug, is_active")
    .single();
  if (error) {
    if (/duplicate key/i.test(error.message)) {
      return NextResponse.json({ ok: true, alreadySeeded: slug }, { status: 200 });
    }
    return NextResponse.json({ error: `Failed to seed tool: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tool: data, seeded: true });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ error: "Use POST for tool management actions" }, { status: 400 });
}

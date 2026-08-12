import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth";
import { getSiteBlock, sanitizeBlockStyle } from "@/lib/site-blocks";

function str(v: unknown, max: number): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > max ? undefined : t;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], req);
  if (!auth.ok) return auth.response;

  const service = createServiceClient();
  const { data, error } = await service.from("site_blocks").select("*").order("block_key");
  if (error) return NextResponse.json({ error: `Failed to load blocks: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, blocks: data ?? [] });
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

  const action = body.action || "upsert";
  if (!["upsert", "reset", "toggle"].includes(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const blockKey = body.block_key;
  if (!blockKey || typeof blockKey !== "string" || !/^[a-z0-9-]{1,64}$/.test(blockKey)) {
    return NextResponse.json({ error: "Invalid block key" }, { status: 400 });
  }

  const service = createServiceClient();

  if (action === "reset") {
    const { error } = await service.from("site_blocks").delete().eq("block_key", blockKey);
    if (error) return NextResponse.json({ error: `Failed to reset block: ${error.message}` }, { status: 500 });
    return NextResponse.json({ ok: true, reset: blockKey });
  }

  if (action === "toggle") {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
    }
    const { data, error } = await service
      .from("site_blocks")
      .update({ is_active: body.is_active, updated_by: auth.user.id, updated_at: new Date().toISOString() })
      .eq("block_key", blockKey)
      .select("block_key, is_active")
      .single();
    if (error) return NextResponse.json({ error: `Failed to update block: ${error.message}` }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Block not found — save it first" }, { status: 404 });
    return NextResponse.json({ ok: true, block: data });
  }

  const def = getSiteBlock(blockKey);
  if (!def) return NextResponse.json({ error: "Unknown block key" }, { status: 400 });

  const title = str(body.title, 200);
  const content_md = body.content_md !== undefined && body.content_md !== null ? String(body.content_md).slice(0, 50_000) : undefined;
  const style = sanitizeBlockStyle(body.style);
  const is_active = typeof body.is_active === "boolean" ? body.is_active : true;

  if (content_md === undefined) {
    return NextResponse.json({ error: "content_md is required" }, { status: 400 });
  }

  const { data, error } = await service
    .from("site_blocks")
    .upsert(
      {
        block_key: blockKey,
        title: title || def.label,
        content_md,
        style,
        is_active,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "block_key" },
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: `Failed to save block: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, block: data });
}
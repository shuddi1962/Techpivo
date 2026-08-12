import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, createServiceClient } from "@/lib/admin-auth";
import { PAGE_SLUGS, getSitePage } from "@/lib/pages";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

function str(v: unknown, max: number): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > max ? undefined : t;
}

export async function GET() {
  const auth = await requireAdminRole();
  if (!auth.ok) return auth.response;

  const service = createServiceClient();
  const { data, error } = await service.from("site_pages").select("*").order("slug");
  if (error) return NextResponse.json({ error: `Failed to load pages: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, pages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminRole();
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

  const slug = body.slug;
  if (!slug || typeof slug !== "string" || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  const service = createServiceClient();

  if (action === "reset") {
    const { error } = await service.from("site_pages").delete().eq("slug", slug);
    if (error) return NextResponse.json({ error: `Failed to reset page: ${error.message}` }, { status: 500 });
    return NextResponse.json({ ok: true, reset: slug });
  }

  if (action === "toggle") {
    if (typeof body.is_published !== "boolean") {
      return NextResponse.json({ error: "is_published must be a boolean" }, { status: 400 });
    }
    const { data, error } = await service
      .from("site_pages")
      .update({ is_published: body.is_published, updated_by: auth.user.id, updated_at: new Date().toISOString() })
      .eq("slug", slug)
      .select("slug, is_published")
      .single();
    if (error) return NextResponse.json({ error: `Failed to update page: ${error.message}` }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Page not found — save it first" }, { status: 404 });
    return NextResponse.json({ ok: true, page: data });
  }

  // upsert: create or fully replace the stored content for this slug
  const def = getSitePage(slug);
  if (!def) return NextResponse.json({ error: "Unknown page slug" }, { status: 400 });

  const title = str(body.title, 200);
  const subtitle = str(body.subtitle, 500);
  const content_md = body.content_md !== undefined && body.content_md !== null ? String(body.content_md).slice(0, 200_000) : undefined;
  const hero_image = str(body.hero_image, 2000);
  const meta_title = str(body.meta_title, 160);
  const meta_description = str(body.meta_description, 320);
  const is_published = typeof body.is_published === "boolean" ? body.is_published : true;

  if (title === undefined || content_md === undefined) {
    return NextResponse.json({ error: "title and content_md are required" }, { status: 400 });
  }

  const { data, error } = await service
    .from("site_pages")
    .upsert(
      {
        slug,
        title: title || def.hero.title,
        subtitle: subtitle != null && subtitle !== "" ? subtitle : def.hero.subtitle,
        content_md: content_md || def.contentMd,
        hero_image: hero_image !== undefined ? (hero_image === "" ? null : hero_image) : def.hero.heroImage || null,
        meta_title: meta_title || def.metaTitle,
        meta_description: meta_description || def.metaDescription,
        is_published,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: `Failed to save page: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, page: data });
}
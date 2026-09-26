import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;

/** GET /api/admin/intelligence/competitors — admin-configured domains. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("competitor_watch")
    .select("id, domain, name, category, country, notes, is_active, last_checked, observation, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Failed to load competitors." }, { status: 500 });
  return NextResponse.json({
    competitors: data ?? [],
    // Honest limitation: DataForSEO Labs domain/keyword endpoints are not
    // integrated — gap checks below run against TechPivo's own coverage data.
    dataLimitation: "DataForSEO domain-keyword endpoints (Labs) are not integrated. Gap checks compare a topic against TechPivo's own coverage — they do not pull the competitor's keywords.",
  });
}

const CreateBody = z.object({
  domain: z.string().trim().max(120).refine((d) => DOMAIN_RE.test(d.replace(/^https?:\/\//, "").split("/")[0]), "Provide a valid domain (e.g. example.com)."),
  name: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** POST — add a competitor domain (admin decides; never assumed). */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide a valid domain (e.g. example.com)." }, { status: 400 });
  }
  const domain = body.domain.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("competitor_watch")
    .insert({ domain, name: body.name ?? null, category: body.category ?? null, country: body.country ?? null, notes: body.notes ?? null })
    .select("id, domain, name, is_active")
    .single();
  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    return NextResponse.json({ error: dup ? "That domain is already tracked." : "Saving failed. Retry." }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
});

/** PATCH — edit notes/fields or activate/deactivate. */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json().catch(() => null));
  } catch {
    return NextResponse.json({ error: "Provide id and valid fields." }, { status: 400 });
  }
  const { id, ...fields } = body;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("competitor_watch")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, domain, is_active")
    .single();
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/admin/intelligence/competitors?id= — stop tracking. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Provide id (uuid)." }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.from("competitor_watch").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return NextResponse.json({ deleted: id });
}

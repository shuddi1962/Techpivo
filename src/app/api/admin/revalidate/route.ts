import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/admin-auth"

// Session-guarded ISR revalidation used by the post editor so publish/sticky/
// status toggles and content edits reflect on the public article page and the
// front page immediately instead of waiting for the next ISR revalidate.
export async function POST(req: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], req)
  if (!auth.ok) return auth.response

  try {
    const { slug } = (await req.json()) as { slug?: string | null }
    revalidatePath("/")
    if (slug) revalidatePath(`/${slug}`)
    return NextResponse.json({ ok: true, revalidated: slug ? ["/", `/${slug}`] : ["/"] })
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { createClient as createSessionClient } from "@/lib/supabase/server"
import { checkRateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limiter"

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
])

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = checkRateLimit(`upload:${ip}`, RATE_LIMITS.upload)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 })
  }

  // Authenticated uploads only (post editor + media library are admin/author tools)
  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { data: profile } = await session
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (!profile || !["admin", "editor", "author"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 })
    }
    const mime = (file.type || "").toLowerCase()
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const supabase = createClient()
    const ext =
      mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/gif" ? "gif" : mime === "image/webp" ? "webp" : "avif"
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from("media")
      .upload(fileName, buffer, {
        contentType: mime,
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName)

    await supabase.from("media_files").insert({
      name: file.name,
      path: fileName,
      url: publicUrl,
      mimetype: mime,
      size: file.size,
    })

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient as createSessionClient } from "@/lib/supabase/server"
import { checkRateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limiter"
import { isSameOrigin } from "@/lib/csrf"
import { auditLog } from "@/lib/audit-log"
import { r2Upload } from "@/lib/r2"

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
])

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

/** Verify image magic bytes server-side — never trust the client MIME. */
function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false
  switch (mime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case "image/gif":
      return buffer.subarray(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38]))
    case "image/webp":
      return buffer.subarray(0, 4).equals(Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
    case "image/avif":
      return buffer.subarray(4, 12).toString("latin1").includes("ftyp")
    default:
      return false
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 })
  }
  const ip = clientIp(req)
  const rl = checkRateLimit(`upload:${ip}`, RATE_LIMITS.upload)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 })
  }

  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!matchesMagicBytes(buffer, mime)) {
      return NextResponse.json({ error: "File content does not match its declared type" }, { status: 400 })
    }

    const ext =
      mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/gif" ? "gif" : mime === "image/webp" ? "webp" : "avif"
    const fileName = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const publicUrl = await r2Upload({ key: fileName, body: buffer, contentType: mime })

    const supabase = createSessionClient()
    await supabase.from("media_files").insert({
      name: file.name,
      path: fileName,
      url: publicUrl,
      mimetype: mime,
      size: file.size,
    })

    await auditLog({
      user_id: user.id,
      action: "file_upload",
      entity_type: "media",
      details: { name: file.name, path: fileName, size: file.size, mime },
      ip_address: ip,
    })

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const supabase = createClient()
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from("media")
      .upload(fileName, buffer, {
        contentType: file.type,
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
      mimetype: file.type || null,
      size: file.size,
    })

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

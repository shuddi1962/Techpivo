import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import crypto from "crypto"

function generateCode() {
  return crypto.randomBytes(8).toString("hex")
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const signedRequest = formData.get("signed_request") as string | null

    let facebookUserId: string | null = null

    if (signedRequest) {
      try {
        const parts = signedRequest.split(".")
        if (parts.length === 2) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8"),
          )
          facebookUserId = payload.user_id || payload.user?.id || null
        }
      } catch {
        // if signed_request parsing fails, proceed without facebook_user_id
      }
    }

    const confirmationCode = generateCode()

    await supabase.from("data_deletion_requests").insert({
      facebook_user_id: facebookUserId,
      provider: "facebook",
      status: "pending",
      confirmation_code: confirmationCode,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
      metadata: {
        signed_request_received: !!signedRequest,
        user_agent: req.headers.get("user-agent"),
      },
    })

    return NextResponse.json({
      url: `https://techpivo.com/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const signedRequest = searchParams.get("signed_request")

  let facebookUserId: string | null = null

  if (signedRequest) {
    try {
      const parts = signedRequest.split(".")
      if (parts.length === 2) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8"),
        )
        facebookUserId = payload.user_id || payload.user?.id || null
      }
    } catch {
      // ignore
    }
  }

  const confirmationCode = generateCode()

  await supabase.from("data_deletion_requests").insert({
    facebook_user_id: facebookUserId,
    provider: "facebook",
    status: "pending",
    confirmation_code: confirmationCode,
    ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
    metadata: {
      signed_request_received: !!signedRequest,
      method: "GET",
    },
  })

  return NextResponse.json({
    url: `https://techpivo.com/data-deletion/status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  })
}

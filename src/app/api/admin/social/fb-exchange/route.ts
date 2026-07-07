import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

const APP_SECRET = "59a6a422366a2ca76a08b2b823dea22a"

export async function POST(req: NextRequest) {
  try {
    const { userToken } = await req.json()
    if (!userToken) {
      return NextResponse.json({ error: "userToken is required" }, { status: 400 })
    }

    // 1. Exchange short-lived user token for long-lived one
    // First, get the app_id from the token itself by inspecting /me
    let appId: string
    try {
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${userToken}&fields=id`)
      const meData = await meRes.json()
      if (!meData.id) {
        return NextResponse.json({ error: "Invalid token — could not identify user" }, { status: 400 })
      }
      // app_id can't be determined from user token directly, so we'll use the stored one
      appId = "1409956737618255" // user's app_id
    } catch {
      return NextResponse.json({ error: "Failed to validate token with Facebook" }, { status: 502 })
    }

    // 2. Exchange for long-lived token
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${APP_SECRET}&` +
      `fb_exchange_token=${userToken}`

    const exchangeRes = await fetch(exchangeUrl)
    const exchangeData = await exchangeRes.json()

    if (!exchangeRes.ok) {
      return NextResponse.json({
        error: `Token exchange failed: ${exchangeData.error?.message || JSON.stringify(exchangeData)}`,
      }, { status: 400 })
    }

    const longLivedToken = exchangeData.access_token

    // 3. List pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}&fields=id,name,access_token,picture`
    )
    const pagesData = await pagesRes.json()

    if (!pagesRes.ok) {
      return NextResponse.json({
        error: `Failed to list pages: ${pagesData.error?.message || JSON.stringify(pagesData)}`,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      pages: pagesData.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { pageAccessToken, pageId, pageName } = await req.json()
    if (!pageAccessToken || !pageId) {
      return NextResponse.json({ error: "pageAccessToken and pageId are required" }, { status: 400 })
    }

    const supabase = createClient()

    const { data: existing } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("platform", "facebook")
      .single()

    if (existing) {
      await supabase
        .from("social_accounts")
        .update({
          credentials: { page_id: pageId, page_access_token: pageAccessToken },
          account_name: pageName || "Facebook Page",
          is_active: true,
          auto_publish: true,
        })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("social_accounts")
        .insert({
          platform: "facebook",
          account_name: pageName || "Facebook Page",
          credentials: { page_id: pageId, page_access_token: pageAccessToken },
          is_active: true,
          auto_publish: true,
        })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Save failed" }, { status: 500 })
  }
}

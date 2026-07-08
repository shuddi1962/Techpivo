import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

const APP_SECRET = "59a6a422366a2ca76a08b2b823dea22a"

export async function POST(req: NextRequest) {
  try {
    const { userToken } = await req.json()
    if (!userToken) {
      return NextResponse.json({ error: "userToken is required" }, { status: 400 })
    }

    // 1. Validate token and get user info
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${userToken}&fields=id,name`)
    const meData = await meRes.json()
    if (!meData.id) {
      return NextResponse.json({ error: "Invalid token — could not identify user" }, { status: 400 })
    }

    const appId = "1409956737618255"

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

    // 3. List pages (for Page Access Tokens and Instagram Business IDs)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}&fields=id,name,access_token,picture`
    )
    const pagesData = await pagesRes.json()

    if (!pagesRes.ok) {
      // Pages endpoint may fail if token lacks page scopes — that's OK, try Instagram directly
    }

    const pages = (pagesData?.data || []).map((p: any) => ({ ...p, platform: 'facebook' }))

    // 4. For each page, try to get the linked Instagram Business Account
    for (const page of pages) {
      if (!page.access_token) continue
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${page.access_token}`
        )
        const igData = await igRes.json()
        if (igData?.instagram_business_account?.id) {
          page.instagram_business_account = igData.instagram_business_account
        }
      } catch {
        // Page may not have Instagram connected
      }
    }

    return NextResponse.json({
      success: true,
      user: meData,
      pages,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { pageAccessToken, pageId, pageName, instagramUserId, platform } = await req.json()
    if (!pageAccessToken || !pageId) {
      return NextResponse.json({ error: "pageAccessToken and pageId are required" }, { status: 400 })
    }

    const targetPlatform = platform || 'facebook'
    const supabase = createClient()

    const { data: existing } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("platform", targetPlatform)
      .single()

    const credentials: Record<string, string> = {
      page_id: pageId,
      page_access_token: pageAccessToken,
    }

    if (instagramUserId) {
      credentials.instagram_user_id = instagramUserId
      credentials.access_token = pageAccessToken
    }

    if (existing) {
      await supabase
        .from("social_accounts")
        .update({
          credentials,
          account_name: pageName || "Facebook Page",
          is_active: true,
          auto_publish: true,
        })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("social_accounts")
        .insert({
          platform: targetPlatform,
          account_name: pageName || (targetPlatform === 'instagram' ? 'Instagram Business' : 'Facebook Page'),
          credentials,
          is_active: true,
          auto_publish: true,
        })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Save failed" }, { status: 500 })
  }
}

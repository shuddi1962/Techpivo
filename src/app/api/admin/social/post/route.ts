import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import {
  postToInstagram,
  postToThreads,
  postToFacebook,
  postToTwitter,
  postToLinkedIn,
  postToTelegram,
  shortenUrl,
  instagramCaption,
  threadsCaption,
  facebookCaption,
  twitterCaption,
  linkedinCaption,
  telegramCaption,
} from "@/lib/social-publisher"

export async function POST(req: Request) {
  try {
    const { platform, postId } = await req.json()
    if (!platform || !postId) {
      return NextResponse.json({ error: "platform and postId are required" }, { status: 400 })
    }

    const supabase = createClient()

    // 1. Fetch the post
    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("*, category:categories(slug)")
      .eq("id", postId)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // 2. Fetch connected account for this platform
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("platform", platform)
      .eq("is_active", true)
      .limit(1)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: `No connected ${platform} account found` }, { status: 400 })
    }

    const account = accounts[0]
    const creds = account.credentials || {}
    const hasCreds = Object.values(creds).some((v: any) => v && String(v).trim())
    if (!hasCreds) {
      return NextResponse.json({ error: `${platform} credentials are incomplete` }, { status: 400 })
    }

    // 3. Build caption
    const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"
    const postUrl = `${SITE}/${post.slug}`
    const shortUrl = await shortenUrl(postUrl)
    const title = post.title || ""
    const excerpt = post.excerpt || ""
    const tags = post.tags || []
    const imageUrl = post.featured_image || ""
    const hashtags = tags.slice(0, 3).map((t: string) => "#" + t.replace(/\s+/g, "")).join(" ")

    let result: string | null = null

    switch (platform) {
      case "instagram": {
        const caption = instagramCaption(title, excerpt, shortUrl, tags)
        result = await postToInstagram(caption, creds, imageUrl)

        // Update IG bio link
        try {
          const igUserId = creds.instagram_user_id
          const igToken = creds.access_token
          if (igUserId && igToken) {
            await fetch(
              `https://graph.facebook.com/v19.0/${igUserId}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ website: shortUrl, access_token: igToken }).toString(),
              },
            )
          }
        } catch {}
        break
      }

      case "threads": {
        const caption = threadsCaption(title, excerpt, shortUrl, tags)
        result = await postToThreads(caption, creds, imageUrl)
        break
      }

      case "facebook": {
        const caption = facebookCaption(title, excerpt, shortUrl, hashtags)
        result = await postToFacebook(caption, creds, imageUrl, shortUrl)
        break
      }

      case "twitter": {
        const caption = twitterCaption(title, excerpt, shortUrl, tags)
        result = await postToTwitter(caption, creds, imageUrl) ?? null
        break
      }

      case "linkedin": {
        const caption = linkedinCaption(title, excerpt, shortUrl, hashtags)
        result = await postToLinkedIn(caption, creds) ?? null
        break
      }

      case "telegram": {
        const caption = telegramCaption(title, excerpt, shortUrl, tags)
        await postToTelegram(caption, creds, imageUrl)
        result = "sent"
        break
      }

      default:
        return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 })
    }

    // 4. Log to social_posts
    const status = result ? "sent" : "failed"
    await supabase.from("social_posts").insert({
      post_id: postId,
      platform,
      social_account_id: account.id,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      platform_post_id: result,
      content_preview: result ? "Posted via direct-publish" : null,
      error_message: result ? null : "Post returned no ID",
    })

    if (status === "sent") {
      await supabase
        .from("social_accounts")
        .update({
          total_posts_sent: (account.total_posts_sent || 0) + 1,
          last_posted_at: new Date().toISOString(),
        })
        .eq("id", account.id)
    }

    return NextResponse.json({ success: status === "sent", postId: result, platform })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Post failed" }, { status: 500 })
  }
}

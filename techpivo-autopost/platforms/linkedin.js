import { buildUrl } from "../utils.js"

const LINKEDIN_API = "https://api.linkedin.com/v2"

export async function post(article, env) {
  const orgUrn = env.LINKEDIN_ORG_URN
  const token  = env.LINKEDIN_ACCESS_TOKEN
  if (!orgUrn || !token) throw new Error("LINKEDIN_ORG_URN / LINKEDIN_ACCESS_TOKEN not set")

  const author = `urn:li:organization:${orgUrn}`

  const text = (env.LINKEDIN_TEMPLATE || "{title}\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "linkedin"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 150))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: article.image ? "IMAGE" : "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  }

  if (article.image) {
    // Register the image upload first
    const regRes = await fetch(`${LINKEDIN_API}/assets?action=registerUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: author,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    })

    if (regRes.ok) {
      const regData = await regRes.json()
      const uploadUrl = regData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl
      const assetUrn  = regData.value.asset

      // Upload the image binary
      const imgRes = await fetch(article.image)
      if (imgRes.ok) {
        const imgBuf = await imgRes.arrayBuffer()
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: Buffer.from(imgBuf),
        })

        body.specificContent["com.linkedin.ugc.ShareContent"].media = [
          {
            status: "READY",
            description: { text: article.title },
            media: assetUrn,
            title: { text: article.title },
          },
        ]
        body.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "IMAGE"
      }
    }
  }

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "linkedin", postId: data.id }
}

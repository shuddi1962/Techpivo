import crypto from 'crypto'
import { createClient } from '@/lib/supabase/admin'
import type { SocialAccount, SocialPost } from '@/types/database'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com'

// ── URL shortener ───────────────────────────────────────────────────────

export async function shortenUrl(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return url
    const short = await res.text()
    return short.startsWith('http') ? short.trim() : url
  } catch {
    return url
  }
}

const SUBREDDIT_MAP: Record<string, string> = {
  'tech-news':        'technology',
  'ai-automation':    'artificial',
  'cybersecurity':    'cybersecurity',
  'gadgets':          'gadgets',
  'programming':      'programming',
  'web-development':  'webdev',
  'tutorials':        'learnprogramming',
  'digital-business': 'startups',
  'networking-it':    'sysadmin',
  'reviews':          'gadgets',
  'desktops':         'buildapc',
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

function buildUtmLink(url: string, platform: string, slug: string): string {
  return `${url}?utm_source=${platform}&utm_medium=social&utm_campaign=techpivo-auto&utm_content=${slug}`
}

// ── Per-platform caption formatters ─────────────────────────────────────

export function facebookCaption(title: string, excerpt: string, shortUrl: string, hashtags: string): string {
  return `${title}

${excerpt.length > 200 ? excerpt.slice(0, 197) + '...' : excerpt}

${hashtags}

🔗 Read more: ${shortUrl}`
}

export function instagramCaption(title: string, excerpt: string, shortUrl: string, tags: string[]): string {
  const igHashtags = tags.slice(0, 15).map(t => '#' + t.replace(/\s+/g, '')).join(' ')
  return `${title} 🔥

${excerpt.length > 300 ? excerpt.slice(0, 297) + '...' : excerpt}

${igHashtags}

🔗 Link: ${shortUrl}`
}

export function threadsCaption(title: string, excerpt: string, shortUrl: string, tags: string[]): string {
  const sentence = excerpt.length > 120 ? excerpt.slice(0, 117) + '...' : excerpt
  return `${sentence} 👀

${title}

${shortUrl}

${tags.slice(0, 4).map(t => '#' + t.replace(/\s+/g, '')).join(' ')}`
}

export function twitterCaption(title: string, excerpt: string, shortUrl: string, tags: string[]): string {
  const headline = title.length > 100 ? title.slice(0, 97) + '...' : title
  const teaser = excerpt.length > 120 ? excerpt.slice(0, 117) + '...' : excerpt
  return `${headline}

${teaser}

${tags.slice(0, 3).map(t => '#' + t.replace(/\s+/g, '')).join(' ')}

🔗 ${shortUrl}`
}

export function telegramCaption(title: string, excerpt: string, shortUrl: string, tags: string[]): string {
  return `*${title}*

${excerpt.length > 250 ? excerpt.slice(0, 247) + '...' : excerpt}

${tags.slice(0, 3).map(t => '#' + t.replace(/\s+/g, '')).join(' ')}

[Read more →](${shortUrl})`
}

export function linkedinCaption(title: string, excerpt: string, shortUrl: string, hashtags: string): string {
  return `${title}

${excerpt.length > 300 ? excerpt.slice(0, 297) + '...' : excerpt}

${hashtags}

Read more: ${shortUrl}`
}

export function redditTitle(title: string): string {
  return title.length > 300 ? title.slice(0, 297) + '...' : title
}

// ── Platform posting functions (read from DB credentials) ──────────────

function buildTwitterOAuth(
  method: string,
  url: string,
  credentials: Record<string, string>,
  extraParams: Record<string, string> = {},
): string {
  const { api_key, api_secret, access_token, access_token_secret } = credentials
  const nonce     = crypto.randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const params: Record<string, string> = {
    oauth_consumer_key:     api_key,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            access_token,
    oauth_version:          '1.0',
    ...extraParams,
  }
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const key  = `${encodeURIComponent(api_secret)}&${encodeURIComponent(access_token_secret)}`
  const sig  = crypto.createHmac('sha1', key).update(base).digest('base64')
  params['oauth_signature'] = sig
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')
}

async function uploadTwitterMedia(imageUrl: string, credentials: Record<string, string>): Promise<string | null> {
  if (!imageUrl) return null
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return null
    const arrayBuf = await imgRes.arrayBuffer()
    const b64 = Buffer.from(arrayBuf).toString('base64')

    const mediaUrl = 'https://upload.twitter.com/1.1/media/upload.json'
    const auth = buildTwitterOAuth('POST', mediaUrl, credentials, { command: 'INIT', media_type: 'image/jpeg', total_bytes: String(arrayBuf.byteLength) })

    const initRes = await fetch(mediaUrl, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'INIT', media_type: 'image/jpeg', total_bytes: String(arrayBuf.byteLength) }).toString(),
    })
    if (!initRes.ok) return null
    const initData = await initRes.json()
    const mediaId = initData.media_id_string
    if (!mediaId) return null

    const appendAuth = buildTwitterOAuth('POST', mediaUrl, credentials, { command: 'APPEND', media_id: mediaId, segment_index: '0' })
    const form = new FormData()
    form.append('command', 'APPEND')
    form.append('media_id', mediaId)
    form.append('segment_index', '0')
    form.append('media_data', b64)

    await fetch(mediaUrl, {
      method: 'POST',
      headers: { 'Authorization': appendAuth },
      body: form,
    })

    const finalizeAuth = buildTwitterOAuth('POST', mediaUrl, credentials, { command: 'FINALIZE', media_id: mediaId })
    await fetch(mediaUrl, {
      method: 'POST',
      headers: { 'Authorization': finalizeAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }).toString(),
    })

    return mediaId
  } catch (e) {
    console.warn('[Twitter Media Upload]', String(e).slice(0, 100))
    return null
  }
}

export async function postToTwitter(
  content: string,
  credentials: Record<string, string>,
  imageUrl?: string,
): Promise<string | null> {
  const { api_key, api_secret, access_token, access_token_secret } = credentials
  if (!api_key || !api_secret || !access_token || !access_token_secret) return null

  let mediaId: string | null = null
  if (imageUrl) {
    mediaId = await uploadTwitterMedia(imageUrl, credentials)
  }

  const url = 'https://api.twitter.com/2/tweets'
  const auth = buildTwitterOAuth('POST', url, credentials)

  const tweetBody: Record<string, any> = {
    text: content.length > 280 ? content.substring(0, 277) + '...' : content,
  }
  if (mediaId) {
    tweetBody.media = { media_ids: [mediaId] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body: JSON.stringify(tweetBody),
  })
  if (!res.ok) throw new Error(`Twitter API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data?.data?.id || null
}

export async function postToFacebook(
  content: string,
  credentials: Record<string, string>,
  imageUrl?: string,
): Promise<string | null> {
  const { page_id, page_access_token } = credentials
  if (!page_id || !page_access_token) return null

  // Use /photos endpoint when we have an image — creates a native photo post
  // with visible caption (includes the read-more link) for much better engagement
  if (imageUrl) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${page_id}/photos`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          url: imageUrl,
          message: content,
          access_token: page_access_token,
        }).toString(),
      },
    )
    if (!res.ok) throw new Error(`Facebook API error (${res.status}): ${await res.text()}`)
    const data = await res.json()
    return data?.id || null
  }

  // No image — fall back to text-only feed post
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${page_id}/feed`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ message: content, access_token: page_access_token }).toString(),
    },
  )
  if (!res.ok) throw new Error(`Facebook API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data?.id || null
}

export async function postToInstagram(
  content: string,
  credentials: Record<string, string>,
  imageUrl?: string,
): Promise<string | null> {
  const { instagram_user_id, access_token } = credentials
  if (!instagram_user_id || !access_token) return null
  if (!imageUrl) {
    throw new Error('Instagram posts require an image')
  }

  // 1. Create media container
  const createRes = await fetch(
    `https://graph.facebook.com/v19.0/${instagram_user_id}/media`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        image_url: imageUrl,
        caption:   content.slice(0, 2200),
        access_token,
      }).toString(),
    },
  )
  if (!createRes.ok) throw new Error(`Instagram API error (create): ${await createRes.text()}`)
  const { id: creationId } = await createRes.json()
  if (!creationId) throw new Error('Instagram returned no creation ID')

  // 2. Publish the media container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${instagram_user_id}/media_publish`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        creation_id: creationId,
        access_token,
      }).toString(),
    },
  )
  if (!publishRes.ok) throw new Error(`Instagram API error (publish): ${await publishRes.text()}`)
  const data = await publishRes.json()
  return data?.id || null
}

export async function postToThreads(
  content: string,
  credentials: Record<string, string>,
  imageUrl?: string,
): Promise<string | null> {
  const { threads_user_id, access_token } = credentials
  if (!threads_user_id || !access_token) return null
  if (!imageUrl) {
    throw new Error('Threads posts require an image')
  }

  // 1. Create media container
  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${threads_user_id}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        media_type: 'IMAGE',
        image_url: imageUrl,
        text: content.slice(0, 500),
        access_token,
      }).toString(),
    },
  )
  if (!createRes.ok) throw new Error(`Threads API error (create): ${await createRes.text()}`)
  const { id: creationId } = await createRes.json()
  if (!creationId) throw new Error('Threads returned no creation ID')

  // 2. Wait for processing
  await new Promise(r => setTimeout(r, 30000))

  // 3. Publish
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${threads_user_id}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token,
      }).toString(),
    },
  )
  if (!publishRes.ok) throw new Error(`Threads API error (publish): ${await publishRes.text()}`)
  const data = await publishRes.json()
  return data?.id || null
}

export async function postToLinkedIn(
  content: string,
  credentials: Record<string, string>,
): Promise<string | null> {
  const { access_token } = credentials
  if (!access_token) return null

  const urn = credentials.linkedin_page_urn || credentials.page_urn || ''
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${access_token}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author:          urn ? `urn:li:organization:${urn}` : '',
      lifecycleState:  'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary:    { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  if (!res.ok) throw new Error(`LinkedIn API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data?.id || null
}

export async function postToTelegram(
  content: string,
  credentials: Record<string, string>,
  imageUrl?: string,
): Promise<boolean> {
  const { bot_token, chat_id } = credentials
  if (!bot_token || !chat_id) return false

  if (imageUrl) {
    const res = await fetch(
      `https://api.telegram.org/bot${bot_token}/sendPhoto`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          photo: imageUrl,
          caption: content.slice(0, 1024),
          parse_mode: 'Markdown',
        }),
      },
    )
    return res.ok
  }

  const res = await fetch(
    `https://api.telegram.org/bot${bot_token}/sendMessage`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id,
        text:                  content,
        parse_mode:            'HTML',
        disable_web_page_preview: false,
      }),
    },
  )
  return res.ok
}

async function postToReddit(
  content: string,
  credentials: Record<string, string>,
  categorySlug: string,
): Promise<boolean> {
  const { client_id, client_secret, refresh_token } = credentials
  if (!client_id || !client_secret || !refresh_token) return false

  const subreddit = SUBREDDIT_MAP[categorySlug] || 'technology'
  const tokenRes  = await fetch('https://www.reddit.com/api/v1/access_token', {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'User-Agent':    'Techpivo/1.0',
    },
    body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
  })
  const { access_token } = await tokenRes.json()
  if (!access_token) return false

  const lines   = content.split('\n')
  const title   = redditTitle(lines[0] || 'New Article')
  const postUrl = lines.find(l => l.startsWith('http')) || SITE

  const params = new URLSearchParams({
    api_type: 'json', kind: 'link', sr: subreddit,
    title, url: postUrl, resubmit: 'true',
  })
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'User-Agent':    'Techpivo/1.0',
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  return res.ok
}

async function postToMedium(
  content: string,
  credentials: Record<string, string>,
  title: string,
  tags: string[],
  canonicalUrl: string,
): Promise<boolean> {
  const { integration_token } = credentials
  if (!integration_token) return false

  const userRes = await fetch('https://api.medium.com/v1/me', {
    headers: { 'Authorization': `Bearer ${integration_token}` },
  })
  const { data: user } = await userRes.json()
  if (!user?.id) return false

  const res = await fetch(`https://api.medium.com/v1/users/${user.id}/posts`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${integration_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      title,
      contentFormat: 'html',
      content,
      canonicalUrl,
      tags:          tags.slice(0, 5),
      publishStatus: 'public',
    }),
  })
  return res.ok
}

async function postToDevTo(
  content: string,
  credentials: Record<string, string>,
  title: string,
  tags: string[],
  categorySlug: string,
): Promise<boolean> {
  const { api_key } = credentials
  if (!api_key) return false

  const devCats = ['programming', 'web-development', 'tutorials', 'ai-automation']
  if (!devCats.includes(categorySlug)) return false

  const res = await fetch('https://dev.to/api/articles', {
    method:  'POST',
    headers: { 'api-key': api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      article: {
        title,
        body_markdown: content.replace(/<[^>]+>/g, ''),
        published:     true,
        tags:          tags.slice(0, 4).map((t: string) => t.toLowerCase().replace(/\s+/g, '')),
      },
    }),
  })
  return res.ok
}

async function postToHashnode(
  content: string,
  credentials: Record<string, string>,
  title: string,
  tags: string[],
  canonicalUrl: string,
): Promise<boolean> {
  const { personal_access_token } = credentials
  if (!personal_access_token) return false

  const res = await fetch('https://gql.hashnode.com', {
    method:  'POST',
    headers: {
      'Authorization': personal_access_token,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      query: `mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) { post { id url } }
      }`,
      variables: {
        input: {
          title,
          contentMarkdown:  content.replace(/<[^>]+>/g, ''),
          tags:             tags.slice(0, 5).map((t: string) => ({ name: t, slug: t.toLowerCase().replace(/\s+/g, '-') })),
          originalArticleURL: canonicalUrl,
        },
      },
    }),
  })
  return res.ok
}

async function postToWhatsApp(
  content: string,
  credentials: Record<string, string>,
): Promise<string | null> {
  const { phone_number_id, access_token } = credentials
  if (!phone_number_id || !access_token) return null

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phone_number_id}/messages`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:                phone_number_id,
        type:              'text',
        text:              { body: content },
      }),
    },
  )
  if (!res.ok) throw new Error(`WhatsApp API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data?.messages?.[0]?.id || null
}

// ── Main publisher: reads from DB ─────────────────────────────────────

interface PublishPostData {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  tags: string[]
  category_slug: string
}

export async function publishToAllPlatforms(post: PublishPostData): Promise<void> {
  const supabase = createClient()

  // 1. Fetch all active accounts with auto_publish enabled
  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('auto_publish', true)
    .eq('is_active', true)

  if (error || !accounts || accounts.length === 0) return

  const postUrl    = `${SITE}/${post.slug}`
  const shortUrl   = await shortenUrl(postUrl)

  for (const account of accounts) {
    const creds = account.credentials || {}
    const hasCreds = Object.values(creds).some(v => v && String(v).trim())
    if (!hasCreds) continue

    // Category filter
    if (account.category_filter && account.category_filter.length > 0) {
      if (!account.category_filter.includes(post.category_slug)) continue
    }

    // Post delay
    if (account.post_delay_minutes && account.post_delay_minutes > 0) {
      await new Promise(r => setTimeout(r, account.post_delay_minutes * 60 * 1000))
    }

    // Build content per platform — native caption format
    const hashtags = post.tags.slice(0, 3).map(t => '#' + t.replace(/\s+/g, '')).join(' ')

    const content = account.custom_template
      ? renderTemplate(account.custom_template, {
          title:        post.title,
          excerpt_50:   post.excerpt.slice(0, 47) + (post.excerpt.length > 47 ? '...' : ''),
          excerpt_100:  post.excerpt.slice(0, 97) + (post.excerpt.length > 97 ? '...' : ''),
          link:         shortUrl,
          hashtags,
          category:     post.category_slug.replace(/-/g, ' '),
          author:       'Techpivo',
          reading_time: '3 min',
        })
      : (() => {
          switch (account.platform) {
            case 'facebook':
              return facebookCaption(post.title, post.excerpt, shortUrl, hashtags)
            case 'instagram':
              return instagramCaption(post.title, post.excerpt, shortUrl, post.tags)
            case 'threads':
              return threadsCaption(post.title, post.excerpt, shortUrl, post.tags)
            case 'twitter':
              return twitterCaption(post.title, post.excerpt, shortUrl, post.tags)
            case 'telegram':
              return telegramCaption(post.title, post.excerpt, shortUrl, post.tags)
            case 'linkedin':
              return linkedinCaption(post.title, post.excerpt, shortUrl, hashtags)
            default:
              return `${post.title}\n\n${post.excerpt}\n\n${shortUrl}`
          }
        })()

    let platformPostId: string | null = null
    let status: 'sent' | 'failed' = 'failed'
    let errorMessage: string | null = null

    try {
      switch (account.platform) {
        case 'twitter':
          platformPostId = await postToTwitter(content, creds, post.featured_image) ?? null
          break
        case 'instagram':
          platformPostId = await postToInstagram(content, creds, post.featured_image) ?? null
          break
        case 'threads':
          platformPostId = await postToThreads(content, creds, post.featured_image) ?? null
          break
        case 'facebook':
          platformPostId = await postToFacebook(content, creds, post.featured_image) ?? null
          break
        case 'linkedin':
          platformPostId = await postToLinkedIn(content, creds) ?? null
          break
        case 'telegram':
          await postToTelegram(content, creds, post.featured_image)
          platformPostId = 'sent'
          break
        case 'reddit':
          await postToReddit(content, creds, post.category_slug)
          platformPostId = 'sent'
          break
        case 'medium':
          await postToMedium(content, creds, post.title, post.tags, postUrl)
          platformPostId = 'sent'
          break
        case 'devto':
          await postToDevTo(content, creds, post.title, post.tags, post.category_slug)
          platformPostId = 'sent'
          break
        case 'hashnode':
          await postToHashnode(content, creds, post.title, post.tags, postUrl)
          platformPostId = 'sent'
          break
        case 'whatsapp':
          platformPostId = await postToWhatsApp(content, creds) ?? null
          break
        default:
          continue
      }
      status = 'sent'
    } catch (e) {
      errorMessage = String(e).slice(0, 200)
      console.warn(`[${account.platform}]`, errorMessage)
    }

    // Log to social_posts (the queue table)
    await supabase.from('social_posts').insert({
      post_id:          post.id,
      platform:         account.platform,
      social_account_id: account.id,
      status,
      sent_at:          status === 'sent' ? new Date().toISOString() : null,
      platform_post_id: platformPostId,
      content_preview:  content.slice(0, 300),
      error_message:    errorMessage,
    } as Partial<SocialPost>)

    // Also log to social_posts_log for backward compat
    await supabase.from('social_posts_log').insert({
      post_id:  post.id,
      platform: account.platform,
      status,
      sent_at:  status === 'sent' ? new Date().toISOString() : null,
      error:    errorMessage,
    })

    // Update account stats
    if (status === 'sent') {
      await supabase
        .from('social_accounts')
        .update({
          total_posts_sent: (account.total_posts_sent || 0) + 1,
          last_posted_at:   new Date().toISOString(),
        })
        .eq('id', account.id)
    }
  }
}

// ── Scheduled post processor (called by cron) ─────────────────────────

export async function processScheduledPosts(): Promise<{ processed: number; results: Array<{ id: string; platform: string; status: string }> }> {
  const supabase = createClient()

  const { data: scheduledPosts, error } = await supabase
    .from('social_posts')
    .select('*, social_accounts!inner(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(20)

  if (error || !scheduledPosts || scheduledPosts.length === 0) {
    return { processed: 0, results: [] }
  }

  const results: Array<{ id: string; platform: string; status: string }> = []

  for (const sp of scheduledPosts as any[]) {
    // Fetch the actual post
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, slug, excerpt, content, featured_image, tags, category_id')
      .eq('id', sp.post_id)
      .single()

    if (!post) {
      await supabase
        .from('social_posts')
        .update({ status: 'failed', error_message: 'Post not found' })
        .eq('id', sp.id)
      results.push({ id: sp.id, platform: sp.platform, status: 'failed' })
      continue
    }

    // Get category slug
    const { data: cat } = await supabase
      .from('categories')
      .select('slug')
      .eq('id', post.category_id)
      .single()

    const categorySlug = cat?.slug || 'tech-news'
    const postUrl = `${SITE}/${post.slug}`
    const shortUrl = await shortenUrl(postUrl)

    const account = sp.social_accounts
    const hashtags = (post.tags || []).slice(0, 3).map((t: string) => '#' + t.replace(/\s+/g, '')).join(' ')

    const content = account.custom_template
      ? renderTemplate(account.custom_template, {
          title:        post.title,
          excerpt_50:   (post.excerpt || '').slice(0, 47) + ((post.excerpt || '').length > 47 ? '...' : ''),
          excerpt_100:  (post.excerpt || '').slice(0, 97) + ((post.excerpt || '').length > 97 ? '...' : ''),
          link:         shortUrl,
          hashtags,
          category:     categorySlug.replace(/-/g, ' '),
          author:       'Techpivo',
          reading_time: '3 min',
        })
      : (() => {
          switch (account.platform) {
            case 'facebook':
              return facebookCaption(post.title, post.excerpt || '', shortUrl, hashtags)
            case 'instagram':
              return instagramCaption(post.title, post.excerpt || '', shortUrl, post.tags || [])
            case 'threads':
              return threadsCaption(post.title, post.excerpt || '', shortUrl, post.tags || [])
            case 'twitter':
              return twitterCaption(post.title, post.excerpt || '', shortUrl, post.tags || [])
            case 'telegram':
              return telegramCaption(post.title, post.excerpt || '', shortUrl, post.tags || [])
            case 'linkedin':
              return linkedinCaption(post.title, post.excerpt || '', shortUrl, hashtags)
            default:
              return `${post.title}\n\n${post.excerpt || ''}\n\n${shortUrl}`
          }
        })()

    const creds = account.credentials || {}
    let platformPostId: string | null = null
    let status: 'sent' | 'failed' = 'failed'
    let errorMessage: string | null = null

    try {
      switch (account.platform) {
        case 'twitter':
          platformPostId = await postToTwitter(content, creds, post.featured_image) ?? null
          break
        case 'instagram':
          platformPostId = await postToInstagram(content, creds, post.featured_image) ?? null
          break
        case 'threads':
          platformPostId = await postToThreads(content, creds, post.featured_image) ?? null
          break
        case 'facebook':
          platformPostId = await postToFacebook(content, creds, post.featured_image) ?? null
          break
        case 'linkedin':
          platformPostId = await postToLinkedIn(content, creds) ?? null
          break
        case 'telegram':
          await postToTelegram(content, creds, post.featured_image)
          platformPostId = 'sent'
          break
        case 'reddit':
          await postToReddit(content, creds, categorySlug)
          platformPostId = 'sent'
          break
        case 'medium':
          await postToMedium(content, creds, post.title, post.tags || [], postUrl)
          platformPostId = 'sent'
          break
        case 'devto':
          await postToDevTo(content, creds, post.title, post.tags || [], categorySlug)
          platformPostId = 'sent'
          break
        case 'hashnode':
          await postToHashnode(content, creds, post.title, post.tags || [], postUrl)
          platformPostId = 'sent'
          break
        case 'whatsapp':
          platformPostId = await postToWhatsApp(content, creds) ?? null
          break
        default:
          continue
      }
      status = 'sent'
    } catch (e) {
      errorMessage = String(e).slice(0, 200)
    }

    await supabase
      .from('social_posts')
      .update({
        status,
        sent_at:         status === 'sent' ? new Date().toISOString() : null,
        platform_post_id: platformPostId,
        content_preview:  content.slice(0, 300),
        error_message:    errorMessage,
      })
      .eq('id', sp.id)

    if (status === 'sent') {
      await supabase
        .from('social_accounts')
        .update({
          total_posts_sent: (account.total_posts_sent || 0) + 1,
          last_posted_at:   new Date().toISOString(),
        })
        .eq('id', account.id)
    }

    results.push({ id: sp.id, platform: sp.platform, status })
  }

  return { processed: results.length, results }
}

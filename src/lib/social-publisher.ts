import crypto from 'crypto'
import { createClient } from '@/lib/supabase/admin'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com'

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

function twitterOAuth(method: string, url: string): string {
  const nonce     = crypto.randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const params: Record<string, string> = {
    oauth_consumer_key:     process.env.TWITTER_API_KEY!,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            process.env.TWITTER_ACCESS_TOKEN!,
    oauth_version:          '1.0',
  }
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const key  = `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&${encodeURIComponent(process.env.TWITTER_ACCESS_SECRET!)}`
  const sig  = crypto.createHmac('sha1', key).update(base).digest('base64')
  params['oauth_signature'] = sig
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')
}

export async function postToTwitter(post: {
  title: string; slug: string; tags: string[]
}): Promise<string | null> {
  if (!process.env.TWITTER_API_KEY) return null
  const url      = `${SITE}/${post.slug}`
  const hashtags = post.tags.slice(0, 3).map(t => '#' + t.replace(/\s+/g, '')).join(' ')
  const text     = `${post.title.slice(0, 200)}\n\n${hashtags}\n\n${url}`
  const endpoint = 'https://api.twitter.com/2/tweets'
  try {
    const res  = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': twitterOAuth('POST', endpoint) },
      body:    JSON.stringify({ text }),
    })
    const data = await res.json()
    return data?.data?.id || null
  } catch (e) { console.warn('[Twitter]', String(e).slice(0, 80)); return null }
}

export async function postToFacebook(post: {
  title: string; slug: string; excerpt: string
}): Promise<string | null> {
  if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) return null
  const url  = `${SITE}/${post.slug}`
  const body = `${post.title}\n\n${(post.excerpt || '').slice(0, 200)}\n\nRead more: ${url}`
  try {
    const res  = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: body, link: url, access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN }),
      }
    )
    const data = await res.json()
    return data?.id || null
  } catch (e) { console.warn('[Facebook]', String(e).slice(0, 80)); return null }
}

export async function postToLinkedIn(post: {
  title: string; slug: string; excerpt: string
}): Promise<string | null> {
  if (!process.env.LINKEDIN_ACCESS_TOKEN) return null
  const url  = `${SITE}/${post.slug}`
  const text = `${post.title}\n\n${(post.excerpt || '').slice(0, 250)}\n\nFull article: ${url}`
  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author:          process.env.LINKEDIN_PAGE_URN,
        lifecycleState:  'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary:    { text },
            shareMediaCategory: 'ARTICLE',
            media: [{
              status:      'READY',
              originalUrl: url,
              title:       { text: post.title.slice(0, 200) },
              description: { text: (post.excerpt || '').slice(0, 200) },
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    })
    const data = await res.json()
    return data?.id || null
  } catch (e) { console.warn('[LinkedIn]', String(e).slice(0, 80)); return null }
}

export async function postToTelegram(post: {
  title: string; slug: string; excerpt: string
}): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false
  const url  = `${SITE}/${post.slug}`
  const text = `*${post.title}*\n\n${(post.excerpt || '').slice(0, 280)}\n\n[Read full article](${url})`
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id:               process.env.TELEGRAM_CHANNEL_USERNAME,
          text,
          parse_mode:            'Markdown',
          disable_web_page_preview: false,
        }),
      }
    )
    return res.ok
  } catch (e) { console.warn('[Telegram]', String(e).slice(0, 80)); return false }
}

export async function postToReddit(post: {
  title: string; slug: string; category_slug: string
}): Promise<boolean> {
  if (!process.env.REDDIT_CLIENT_ID) return false
  const url       = `${SITE}/${post.slug}`
  const subreddit = SUBREDDIT_MAP[post.category_slug] || 'technology'
  try {
    const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type':  'application/x-www-form-urlencoded',
        'User-Agent':    `Techpivo/1.0 by u/${process.env.REDDIT_USERNAME}`,
      },
      body: `grant_type=password&username=${process.env.REDDIT_USERNAME}&password=${process.env.REDDIT_PASSWORD}`,
    })
    const { access_token } = await tokenRes.json()
    if (!access_token) return false

    const params = new URLSearchParams({
      api_type: 'json', kind: 'link', sr: subreddit,
      title: post.title.slice(0, 300), url, resubmit: 'true',
    })
    await fetch('https://oauth.reddit.com/api/submit', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent':    `Techpivo/1.0 by u/${process.env.REDDIT_USERNAME}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    return true
  } catch (e) { console.warn('[Reddit]', String(e).slice(0, 80)); return false }
}

export async function crosspostToMedium(post: {
  title: string; content: string; tags: string[]; slug: string
}): Promise<boolean> {
  if (!process.env.MEDIUM_INTEGRATION_TOKEN) return false
  const canonicalUrl = `${SITE}/${post.slug}`
  try {
    const userRes = await fetch('https://api.medium.com/v1/me', {
      headers: { 'Authorization': `Bearer ${process.env.MEDIUM_INTEGRATION_TOKEN}` },
    })
    const { data: user } = await userRes.json()
    if (!user?.id) return false

    await fetch(`https://api.medium.com/v1/users/${user.id}/posts`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MEDIUM_INTEGRATION_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        title: post.title, contentFormat: 'html',
        content: post.content, canonicalUrl,
        tags: post.tags.slice(0, 5), publishStatus: 'public',
      }),
    })
    return true
  } catch (e) { console.warn('[Medium]', String(e).slice(0, 80)); return false }
}

export async function crosspostToDevTo(post: {
  title: string; content: string; tags: string[];
  slug: string; category_slug: string
}): Promise<boolean> {
  if (!process.env.DEVTO_API_KEY) return false
  const devCats = ['programming', 'web-development', 'tutorials', 'ai-automation']
  if (!devCats.includes(post.category_slug)) return false
  const canonicalUrl = `${SITE}/${post.slug}`
  try {
    await fetch('https://dev.to/api/articles', {
      method:  'POST',
      headers: { 'api-key': process.env.DEVTO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article: {
          title:         post.title,
          body_markdown: post.content.replace(/<[^>]+>/g, ''),
          published:     true,
          canonical_url: canonicalUrl,
          tags:          post.tags.slice(0, 4).map((t: string) => t.toLowerCase().replace(/\s+/g, '')),
        },
      }),
    })
    return true
  } catch (e) { console.warn('[Dev.to]', String(e).slice(0, 80)); return false }
}

export async function crosspostToHashnode(post: {
  title: string; content: string; tags: string[];
  slug: string; category_slug: string
}): Promise<boolean> {
  if (!process.env.HASHNODE_ACCESS_TOKEN || !process.env.HASHNODE_PUBLICATION_ID) return false
  const canonicalUrl = `${SITE}/${post.slug}`
  try {
    await fetch('https://gql.hashnode.com', {
      method:  'POST',
      headers: {
        'Authorization': process.env.HASHNODE_ACCESS_TOKEN,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        query: `mutation PublishPost($input: PublishPostInput!) {
          publishPost(input: $input) { post { id url } }
        }`,
        variables: {
          input: {
            title:            post.title,
            contentMarkdown:  post.content.replace(/<[^>]+>/g, ''),
            publicationId:    process.env.HASHNODE_PUBLICATION_ID,
            tags:             post.tags.slice(0, 5).map((t: string) => ({ name: t, slug: t.toLowerCase().replace(/\s+/g, '-') })),
            originalArticleURL: canonicalUrl,
          },
        },
      }),
    })
    return true
  } catch (e) { console.warn('[Hashnode]', String(e).slice(0, 80)); return false }
}

export async function publishToAllPlatforms(post: {
  id: string; title: string; slug: string; excerpt: string;
  content: string; featured_image: string; tags: string[];
  category_slug: string
}): Promise<void> {
  const supabase = createClient()

  const platforms = [
    { name: 'twitter',  fn: () => postToTwitter(post) },
    { name: 'facebook', fn: () => postToFacebook(post) },
    { name: 'linkedin', fn: () => postToLinkedIn(post) },
    { name: 'telegram', fn: () => postToTelegram(post) },
    { name: 'medium',   fn: () => crosspostToMedium(post) },
    { name: 'devto',    fn: () => crosspostToDevTo(post) },
    { name: 'hashnode', fn: () => crosspostToHashnode(post) },
    {
      name: 'reddit',
      fn:   async () => {
        await new Promise(r => setTimeout(r, 10 * 60 * 1000))
        return postToReddit(post)
      },
    },
  ]

  for (const p of platforms) {
    try {
      const result = await p.fn()
      await supabase.from('social_posts_log').insert({
        post_id:  post.id,
        platform: p.name,
        status:   result ? 'sent' : 'failed',
        sent_at:  new Date().toISOString(),
      }).then()
    } catch (e) {
      await supabase.from('social_posts_log').insert({
        post_id:  post.id,
        platform: p.name,
        status:   'failed',
        error:    String(e).slice(0, 200),
      }).then()
    }
    await new Promise(r => setTimeout(r, 1200))
  }
}

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/admin'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com'

function ensureVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) throw new Error('VAPID keys are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)')
  webpush.setVapidDetails('mailto:hello@techpivo.com', pub, priv)
}

export function vapidConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

async function deliverToAllSubscribers(
  payload: string,
  onError?: (error: any, endpoint: string) => void,
  audience?: string
): Promise<{ total: number; delivered: number; expired: number }> {
  const supabase = createClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, device_type, browser')

  let filtered = subs || []
  if (audience && audience !== 'all') {
    const target = audience.toLowerCase()
    filtered = filtered.filter((s: any) => {
      const device = (s.device_type || '').toLowerCase()
      const browser = (s.browser || '').toLowerCase()
      switch (target) {
        case 'desktop': return device !== 'mobile'
        case 'mobile': return device === 'mobile' || device === 'tablet'
        case 'chrome': return browser.includes('chrome')
        case 'firefox': return browser.includes('firefox')
        default: return true
      }
    })
  }

  if (!filtered.length) return { total: 0, delivered: 0, expired: 0 }

  const expired: string[] = []
  let delivered = 0

  await Promise.allSettled(
    filtered.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        delivered++
      } catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          expired.push(sub.endpoint)
        } else {
          onError?.(e, sub.endpoint)
        }
      }
    })
  )

  if (expired.length) {
    try {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired)
    } catch {
      // best-effort cleanup
    }
  }

  return { total: filtered.length, delivered, expired: expired.length }
}

export async function sendPushNotification(post: {
  title: string; slug: string; excerpt: string; featured_image?: string
}): Promise<void> {
  ensureVapid()
  await deliverToAllSubscribers(
    JSON.stringify({
      title: post.title.slice(0, 80),
      body: (post.excerpt || '').slice(0, 100),
      url: `${SITE}/${post.slug}`,
      icon: `${SITE}/icon-192.png`,
      badge: `${SITE}/badge-72.png`,
      image: post.featured_image || undefined,
    })
  )
}

export async function sendRawPush(input: {
  title: string
  body: string
  url?: string
  image?: string
  audience?: string
}): Promise<{ total: number; delivered: number; expired: number }> {
  ensureVapid()
  return deliverToAllSubscribers(
    JSON.stringify({
      title: input.title.slice(0, 80),
      body: (input.body || '').slice(0, 120),
      url: input.url || SITE,
      icon: `${SITE}/icon-192.png`,
      badge: `${SITE}/badge-72.png`,
      image: input.image || undefined,
    }),
    undefined,
    input.audience
  )
}

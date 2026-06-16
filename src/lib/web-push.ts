import webpush       from 'web-push'
import { createClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  'mailto:hello@techpivo.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com'

export async function sendPushNotification(post: {
  title: string; slug: string; excerpt: string; featured_image?: string
}): Promise<void> {
  const supabase = createClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs?.length) return

  const payload = JSON.stringify({
    title:  post.title.slice(0, 80),
    body:   (post.excerpt || '').slice(0, 100),
    url:    `${SITE}/${post.slug}`,
    icon:   `${SITE}/icon-192.png`,
    badge:  `${SITE}/badge-72.png`,
    image:  post.featured_image || undefined,
  })

  const expired: string[] = []

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (e: any) {
        if (e?.statusCode === 410) expired.push(sub.endpoint)
      }
    })
  )

  if (expired.length) {
    Promise.resolve(
      supabase.from('push_subscriptions')
        .delete()
        .in('endpoint', expired)
    ).catch(() => {})
  }
}

import { createClient } from '@/lib/supabase/admin'
import { brandedEmail, BRAND_FROM, sendBrandedEmail } from '@/lib/email'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com'

async function getActiveSubscribers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('subscribers')
    .select('email, name, categories')
    .eq('status', 'active')
  return data || []
}

export async function sendNewsletterForPost(post: {
  id: string; title: string; slug: string;
  seo_description: string; featured_image: string;
  category_slug: string
}): Promise<void> {
  const subscribers = await getActiveSubscribers()
  if (!subscribers.length) return

  const postUrl = `${SITE}/${post.slug}`
  const targeted = subscribers.filter(
    (s: any) => !s.categories?.length || s.categories.includes(post.category_slug)
  )
  if (!targeted.length) return

  await sendNewsletterCampaign({
    subject: `📡 ${post.title}`,
    title: post.title,
    bodyHtml: `
      ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title.replace(/"/g, '&quot;')}" style="width:100%;height:auto;border-radius:12px;margin:0 0 16px;border:1px solid #1E2D42;">` : ''}
      <p style="margin:0;">${post.seo_description || 'New article on Techpivo — read the full story now.'}</p>`,
    cta: { label: 'Read Full Article', url: postUrl },
    subscribers: targeted.map((s: any) => s.email),
    unsubscribeUrl: (email: string) => `${SITE}/unsubscribe?email=${encodeURIComponent(email)}`,
  })
}

export async function sendNewsletterCampaign(input: {
  subject: string
  title?: string
  bodyHtml: string
  subscribers?: string[]
  cta?: { label: string; url: string }
  unsubscribeUrl?: string | ((email: string) => string)
}): Promise<{ total: number; delivered: number; failed: number; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { total: 0, delivered: 0, failed: 0, error: 'RESEND_API_KEY not configured' }
  }

  const subscribers = input.subscribers || (await getActiveSubscribers()).map((s: any) => s.email)
  if (!subscribers.length) return { total: 0, delivered: 0, failed: 0 }

  const title = input.title || input.subject
  const BATCH = 50
  let delivered = 0
  let failed = 0

  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map((email) =>
        sendBrandedEmail({
          to: email,
          subject: input.subject,
          title,
          bodyHtml: input.bodyHtml,
          cta: input.cta,
          unsubscribeUrl:
            typeof input.unsubscribeUrl === 'function'
              ? input.unsubscribeUrl(email)
              : input.unsubscribeUrl,
        })
      )
    )
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.ok) delivered++
      else failed++
    })
    if (i + BATCH < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return { total: subscribers.length, delivered, failed }
}

export { BRAND_FROM }

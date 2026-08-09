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

export async function sendWelcomeEmail(email: string, name?: string): Promise<{ ok: boolean; error?: string }> {
  const displayName = (name || '').trim() || email.split('@')[0]
  return sendBrandedEmail({
    to: email,
    subject: `Welcome to Techpivo, ${displayName}! 🚀`,
    title: `You're in, ${displayName}!`,
    bodyHtml: `<p style="margin:0 0 12px;">Thanks for subscribing to <strong>Techpivo</strong> — the home of fast, accurate tech journalism, tutorials, and tools.</p>
<p style="margin:0 0 12px;">Here's what lands in your inbox:</p>
<ul style="margin:0 0 12px;padding-left:20px;">
  <li>Breaking tech news the moment it happens</li>
  <li>Hands-on tutorials and how-to guides</li>
  <li>Reviews, comparisons, and buying guides</li>
  <li>Free developer, SEO, and security tools</li>
</ul>
<p style="margin:0;">No spam, ever. Unsubscribe anytime with one click.</p>`,
    cta: { label: 'Explore Techpivo', url: `${SITE}` },
    footerNote: 'You received this because you subscribed to the Techpivo newsletter.',
    unsubscribeUrl: `${SITE}/unsubscribe?email=${encodeURIComponent(email)}`,
  })
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

import { Resend }       from 'resend'
import { createClient } from '@/lib/supabase/admin'

const SITE    = process.env.NEXT_PUBLIC_SITE_URL || 'https://techpivo.com'
const FROM    = 'Techpivo <newsletter@techpivo.com>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendNewsletterForPost(post: {
  id: string; title: string; slug: string;
  seo_description: string; featured_image: string;
  category_slug: string
}): Promise<void> {
  const supabase  = createClient()
  const postUrl   = `${SITE}/${post.slug}`

  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('email, name')
    .eq('status', 'active')
    .or(`categories.cs.{${post.category_slug}},categories.eq.{}`)

  if (!subscribers?.length) return

  const html = (email: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0B1120;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
          <td style="padding:24px;background:#0F172A;border-radius:16px;border:1px solid #1E2D42;">
            <h1 style="color:#F0F4FF;font-size:24px;font-weight:700;margin:0 0 4px;letter-spacing:-0.5px;">TECH◈PIVO</h1>
            <p style="color:#64748B;font-size:12px;margin:0 0 24px;">LATEST ARTICLE</p>

            <h2 style="color:#F59E0B;font-size:20px;font-weight:600;margin:0 0 16px;">
              <a href="${postUrl}" style="color:#F59E0B;text-decoration:none;">${post.title}</a>
            </h2>

            ${post.featured_image ? `<img src="${post.featured_image}" alt="" style="width:100%;height:auto;border-radius:12px;margin-bottom:16px;">` : ''}

            <p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 24px;">${post.seo_description || ''}</p>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F59E0B;border-radius:8px;padding:12px 24px;">
                  <a href="${postUrl}" style="color:#0B1120;font-size:14px;font-weight:600;text-decoration:none;">Read Full Article →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;text-align:center;">
            <p style="color:#475569;font-size:11px;margin:0;">
              You subscribed to Techpivo.com ·
              <a href="${SITE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const BATCH = 50
  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH)
    await Promise.allSettled(
      batch.map(sub =>
        getResend().emails.send({
          from: FROM,
          to:      sub.email,
          subject: `📡 ${post.title}`,
          html:    html(sub.email),
        }).catch(() => {})
      )
    )
    if (i + BATCH < subscribers.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

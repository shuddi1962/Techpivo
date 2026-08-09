import { Resend } from "resend"

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"
export const BRAND_FROM = "Techpivo <newsletter@newsletter.techpivo.com>"

export interface BrandedEmailOptions {
  title: string
  preheader?: string
  bodyHtml: string
  cta?: { label: string; url: string }
  footerNote?: string
  unsubscribeUrl?: string
}

export function brandedEmail(opts: BrandedEmailOptions): string {
  const {
    title,
    preheader = "",
    bodyHtml,
    cta,
    footerNote = "You are receiving this because you are part of the Techpivo community.",
    unsubscribeUrl,
  } = opts

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B1120;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
        <tr>
          <td style="padding:24px;background:#0F172A;border-radius:16px;border:1px solid #1E2D42;">
            <h1 style="color:#F0F4FF;font-size:22px;font-weight:700;margin:0 0 4px;letter-spacing:-0.5px;">TECH<span style="color:#F59E0B;">◈</span>PIVO</h1>
            <p style="color:#64748B;font-size:11px;margin:0 0 24px;letter-spacing:1.5px;text-transform:uppercase;">Tech, decoded. Fast.</p>

            <h2 style="color:#F59E0B;font-size:19px;font-weight:600;margin:0 0 16px;line-height:1.35;">${title}</h2>

            <div style="color:#94A3B8;font-size:14px;line-height:1.65;">${bodyHtml}</div>

            ${cta ? `
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 0;">
              <tr>
                <td style="background:#F59E0B;border-radius:8px;padding:12px 24px;">
                  <a href="${cta.url}" style="color:#0B1120;font-size:14px;font-weight:600;text-decoration:none;">${cta.label} →</a>
                </td>
              </tr>
            </table>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;text-align:center;">
            <p style="color:#475569;font-size:11px;margin:0 0 4px;">${footerNote}</p>
            ${unsubscribeUrl ? `<p style="color:#475569;font-size:11px;margin:0;">Want to stop receiving these emails? <a href="${unsubscribeUrl}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a></p>` : ""}
            <p style="color:#334155;font-size:10px;margin:8px 0 0;">© ${new Date().getFullYear()} Techpivo · <a href="${SITE}" style="color:#475569;text-decoration:none;">${SITE.replace("https://", "")}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendBrandedEmail(input: {
  to: string
  subject: string
  title: string
  bodyHtml: string
  preheader?: string
  cta?: { label: string; url: string }
  footerNote?: string
  unsubscribeUrl?: string
  replyTo?: string
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: BRAND_FROM,
    to: input.to,
    subject: input.subject,
    replyTo: input.replyTo,
    html: brandedEmail(input),
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id }
}

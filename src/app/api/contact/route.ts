import { NextRequest, NextResponse } from 'next/server'
import { contactFormSchema, getFieldErrors } from '@/lib/validation'
import { sanitize, sanitizeEmail } from '@/lib/sanitize'
import { escapeHtml } from '@/lib/markdown'
import { sendBrandedEmail } from '@/lib/email'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const CONTACT_TO = process.env.CONTACT_TO_EMAIL || 'hello@techpivo.com'

const ALLOWED_ORIGINS = [
  'https://techpivo.com',
  'https://www.techpivo.com',
  'http://localhost:3000',
]

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || ''

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Contact form not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const validationResult = contactFormSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = getFieldErrors(validationResult.error)
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors },
        { status: 400, headers: origin ? { 'Access-Control-Allow-Origin': origin } : {} }
      )
    }

    const formData = {
      name: sanitize(validationResult.data.name),
      email: sanitizeEmail(validationResult.data.email),
      subject: sanitize(validationResult.data.subject || ''),
      message: sanitize(validationResult.data.message),
    }

    const safeName = escapeHtml(formData.name)
    const safeEmail = escapeHtml(formData.email)
    const safeSubject = escapeHtml(formData.subject)
    const safeMessage = escapeHtml(formData.message)

    const htmlBody = `<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Email:</strong> ${safeEmail}</p>
<p><strong>Subject:</strong> ${safeSubject || 'N/A'}</p>
<p><strong>Message:</strong></p>
<p style="margin:0;">${safeMessage}</p>`

    const result = await sendBrandedEmail({
      to: CONTACT_TO,
      subject: `Contact Form: ${formData.name}`,
      title: `New contact message from ${formData.name}`,
      bodyHtml: htmlBody,
      replyTo: formData.email,
    })

    if (!result.ok) {
      console.error('Resend error:', result.error)
      return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      { headers: origin ? { 'Access-Control-Allow-Origin': origin } : {} }
    )
  } catch (e) {
    console.error('Contact API error:', e)
    return NextResponse.json({ error: 'Failed to submit enquiry. Please try again.' }, { status: 500 })
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': allowedOrigin,
    },
  })
}

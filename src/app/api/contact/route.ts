import { NextRequest, NextResponse } from 'next/server'
import { contactFormSchema, getFieldErrors } from '@/lib/validation'
import { sanitize, sanitizeEmail } from '@/lib/sanitize'
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
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin)

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
        { status: 400, headers: isAllowedOrigin ? { 'Access-Control-Allow-Origin': origin } : {} }
      )
    }

    const formData = {
      name: sanitize(validationResult.data.name),
      email: sanitizeEmail(validationResult.data.email),
      subject: sanitize(validationResult.data.subject || ''),
      message: sanitize(validationResult.data.message),
    }

    const htmlBody = `<p><strong>Name:</strong> ${formData.name}</p>
<p><strong>Email:</strong> ${formData.email}</p>
<p><strong>Subject:</strong> ${formData.subject || 'N/A'}</p>
<p><strong>Message:</strong></p>
<p style="margin:0;">${formData.message}</p>`

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
      { headers: isAllowedOrigin ? { 'Access-Control-Allow-Origin': origin } : {} }
    )
  } catch (e) {
    console.error('Contact API error:', e)
    return NextResponse.json({ error: 'Failed to submit enquiry. Please try again.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

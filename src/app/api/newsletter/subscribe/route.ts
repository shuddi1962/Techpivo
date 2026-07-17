import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'
import { newsletterSchema } from '@/lib/validation'
import { sanitizeEmail } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validationResult = newsletterSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid email' },
        { status: 400 }
      )
    }

    const email = sanitizeEmail(validationResult.data.email)
    const supabase = createClient()
    const { error } = await supabase.from('newsletter_subscribers').upsert(
      { email, name: body.name || '', source: 'website' },
      { onConflict: 'email' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Subscribe API error:', e)
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const validationResult = newsletterSchema.safeParse({ email })
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const sanitizedEmail = sanitizeEmail(validationResult.data.email)
  const supabase = createClient()
  await supabase.from('newsletter_subscribers').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }).eq('email', sanitizedEmail)
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 })
  const supabase = createClient()
  await supabase.from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('email', email)
  return NextResponse.json({ ok: true })
}

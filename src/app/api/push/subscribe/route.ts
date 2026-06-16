import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const subscription = await req.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  const supabase = createClient()
  await supabase.from('push_subscriptions').upsert(
    {
      endpoint:      subscription.endpoint,
      p256dh:        subscription.keys?.p256dh,
      auth:          subscription.keys?.auth,
      subscribed_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json()
  const supabase     = createClient()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}

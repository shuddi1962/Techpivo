import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { email, name, categories } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = createClient()
    const { error } = await supabase.from('subscribers').upsert(
      { email, name: name || null, categories: categories || [], status: 'active', source: 'website' },
      { onConflict: 'email' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = createClient()
  await supabase.from('subscribers').update({ status: 'unsubscribed' }).eq('email', email)
  return NextResponse.json({ ok: true })
}

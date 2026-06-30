import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email, newPassword } = await req.json()

  if (!email || !newPassword) {
    return NextResponse.json({ error: 'Email and newPassword required' }, { status: 400 })
  }

  const supabase = createClient()

  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.find(u => u.email === email)

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Password updated for ${email}` })
}

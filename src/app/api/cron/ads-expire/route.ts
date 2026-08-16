import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isCronAuthorized } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    if (!(await isCronAuthorized(req, { required: true }))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date().toISOString().slice(0, 10)

    const { data: due, error } = await supabase
      .from('ad_campaigns')
      .select('id, end_date')
      .in('status', ['live', 'approved'])
      .eq('is_active', true)
      .lt('end_date', today)
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let expired = 0
    for (const campaign of due || []) {
      const { error: updateErr } = await supabase
        .from('ad_campaigns')
        .update({ status: 'expired', is_active: false })
        .eq('id', campaign.id)

      if (updateErr) {
        console.error(`[ads-expire] failed for ${campaign.id}:`, updateErr.message)
        continue
      }
      expired++
    }

    return NextResponse.json({ checked: due?.length || 0, expired })
  } catch (err: any) {
    console.error('ads-expire cron error:', err)
    return NextResponse.json({ error: err?.message || 'Cron failed' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchReportData, buildMarkdown, buildCsv, nextRun, REPORT_TYPES, type ReportId } from '@/lib/reports'

export const dynamic = 'force-dynamic'

const VALID_IDS = REPORT_TYPES.map(r => r.id)

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try { body = await req.json() } catch {}

    const sessionClient = createClient()
    const { data: authData, error: authErr } = await sessionClient.auth.getUser()
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { action, reportType } = body

    if (action === 'schedule') {
      if (!VALID_IDS.includes(reportType) || !['daily', 'weekly', 'monthly'].includes(body.frequency)) {
        return NextResponse.json({ error: 'Invalid schedule' }, { status: 400 })
      }
      const { data, error } = await supabase.from('report_schedules').insert({
        report_type: reportType,
        frequency: body.frequency,
        format: body.format === 'csv' ? 'csv' : 'md',
        email: body.email || null,
        enabled: true,
        next_run_at: nextRun(body.frequency),
      }).select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: data.id })
    }

    if (action === 'run-now') {
      if (!VALID_IDS.includes(reportType)) return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
      const { error } = await supabase.from('report_schedules')
        .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun(body.frequency || 'weekly') })
        .eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Default: generate a report
    if (!VALID_IDS.includes(reportType)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    const data = await fetchReportData(supabase, reportType as ReportId)
    return NextResponse.json({
      md: buildMarkdown(reportType as ReportId, data),
      csv: buildCsv(reportType as ReportId, data),
    })
  } catch (err: any) {
    console.error('reports api error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate report' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionClient = createClient()
    const { data: authData, error: authErr } = await sessionClient.auth.getUser()
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await supabase.from('report_schedules').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ schedules: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load schedules' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionClient = createClient()
    const { data: authData, error: authErr } = await sessionClient.auth.getUser()
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.from('report_schedules').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete schedule' }, { status: 500 })
  }
}

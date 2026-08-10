import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchReportData, buildMarkdown, buildCsv, nextRun, REPORT_TYPES, type ReportId } from '@/lib/reports'
import { sendBrandedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let expected = process.env.CRON_SECRET
    if (!expected) {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'cron_secret').maybeSingle()
        if (typeof data?.value === 'string') expected = data.value
      } catch {
        // fall back to env only
      }
    }

    const auth = req.headers.get('authorization')
    if (!expected || auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: schedules, error } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('enabled', true)
      .lte('next_run_at', new Date().toISOString())
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const results: { id: string; report: string; emailed: boolean; error?: string }[] = []
    for (const s of schedules || []) {
      try {
        const reportType = s.report_type as ReportId
        const data = await fetchReportData(supabase, reportType)
        const content = s.format === 'csv' ? buildCsv(reportType, data) : buildMarkdown(reportType, data)
        const name = REPORT_TYPES.find(r => r.id === reportType)?.name || 'Report'

        let emailed = false
        if (s.email) {
          const res = await sendBrandedEmail({
            to: s.email,
            subject: `${name} — ${data.period}`,
            title: name,
            bodyHtml: `<p style="margin:0 0 12px;">Your scheduled <strong>${name}</strong> is ready.</p><pre style="font-family:monospace;font-size:12px;line-height:1.5;background:#F8FAFC;padding:16px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;max-height:480px;">${content.replace(/</g, '&lt;')}</pre>`,
            footerNote: 'Scheduled report from Techpivo.',
          })
          emailed = res.ok
          if (!res.ok) results.push({ id: s.id, report: reportType, emailed, error: res.error })
        }

        await supabase.from('report_schedules').update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun(s.frequency),
        }).eq('id', s.id)

        results.push({ id: s.id, report: reportType, emailed })
      } catch (e: any) {
        results.push({ id: s.id, report: s.report_type, emailed: false, error: e?.message || 'Generation failed' })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (err: any) {
    console.error('report cron error:', err)
    return NextResponse.json({ error: err?.message || 'Cron failed' }, { status: 500 })
  }
}

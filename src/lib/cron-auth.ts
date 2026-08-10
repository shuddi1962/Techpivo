import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function getCronSecret(): Promise<string> {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'cron_secret').maybeSingle()
    if (typeof data?.value === 'string') return data.value
  } catch {
    // env fallback only
  }
  return ''
}

export async function isCronAuthorized(req: Request, opts?: { required?: boolean }): Promise<boolean> {
  const secret = await getCronSecret()
  if (!secret) return !opts?.required
  return req.headers.get('authorization') === `Bearer ${secret}`
}

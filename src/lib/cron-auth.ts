import { getSecret } from '@/lib/site-secrets'

/** The cron secret used by the request header. */
export async function getCronSecret(): Promise<string> {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET
  // Stored in the server-only secret store — the cron secret used to live in
  // the publicly-readable site_settings table, which let anyone trigger our
  // scheduled jobs.
  return (await getSecret('cron_secret')) || ''
}

/**
 * Every secret that may authorise a cron call.
 *
 * The database dispatchers (pg_cron -> /api/cron/...) read the secret from
 * `site_settings.cron_secret`, while the app prefers the environment
 * variable. If those two ever drift, the scheduled jobs would start
 * failing with 401 — so both are accepted.
 */
async function acceptedSecrets(): Promise<string[]> {
  const list = new Set<string>()
  if (process.env.CRON_SECRET) list.add(process.env.CRON_SECRET.trim())
  const stored = await getSecret('cron_secret')
  if (stored) list.add(stored.trim())
  try {
    const { createClient } = await import('@/lib/supabase/admin')
    const { data } = await createClient()
      .from('site_settings')
      .select('value')
      .eq('key', 'cron_secret')
      .maybeSingle()
    const raw = (data as { value?: unknown } | null)?.value
    const value = typeof raw === 'string' ? raw : ''
    if (value) list.add(value.replace(/^"|"$/g, '').trim())
  } catch {
    // the stored copy is optional
  }
  return [...list].filter(Boolean)
}

export async function isCronAuthorized(req: Request, opts?: { required?: boolean }): Promise<boolean> {
  const secrets = await acceptedSecrets()
  if (secrets.length === 0) return !opts?.required
  const header = (req.headers.get('authorization') || '').trim()
  if (!header.startsWith('Bearer ')) return false
  const provided = header.slice(7).trim()
  return secrets.some((s) => s.length > 0 && s === provided)
}

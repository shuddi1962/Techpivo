import { getSecret } from '@/lib/site-secrets'

export async function getCronSecret(): Promise<string> {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET
  // Stored in the server-only secret store — the cron secret used to live in
  // the publicly-readable site_settings table, which let anyone trigger our
  // scheduled jobs.
  return (await getSecret('cron_secret')) || ''
}

export async function isCronAuthorized(req: Request, opts?: { required?: boolean }): Promise<boolean> {
  const secret = await getCronSecret()
  if (!secret) return !opts?.required
  return req.headers.get('authorization') === `Bearer ${secret}`
}

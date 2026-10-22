// Server-only credential store (never import in client components).
//
// Every gateway/supplier key lives in `site_secrets`, a table with RLS
// enabled and NO public policies — only the service role can read it.
//
// Why not `site_settings`? That table has a PUBLIC read policy (the store
// needs public settings like `adsense_publisher_id`), so anything written
// there is readable by anyone with the anon key. Storing the Flutterwave
// secret, the CJ supplier key or the cron secret there is a critical leak:
// with the Flutterwave secret an attacker can forge a "paid" webhook for an
// order and have the store place a real supplier order for free.
//
// Resolution order for every key: env var → site_secrets → site_settings
// (legacy rows, service-role readable) → null.

import { createClient } from "@/lib/supabase/admin"

const SECRET_KEYS = [
  "flutterwave_secret_key",
  "flutterwave_encryption_key",
  "flutterwave_secret_hash",
  "flutterwave_public_key",
  "cj_api_key",
  "korapay_secret_key",
  "korapay_encryption_key",
  "korapay_public_key",
  "dataforseo_api_key",
  "cron_secret",
  "openrouter_api_key",
  "resend_api_key",
  "vapid_private_key",
  "vapid_public_key",
  "gemini_api_key",
] as const

export type SecretKey = (typeof SECRET_KEYS)[number]

/** Read one secret (server-side only). */
export async function getSecret(key: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.from("site_secrets").select("value").eq("key", key).maybeSingle()
    const v = (data as { value?: unknown } | null)?.value
    if (typeof v === "string" && v.trim()) return v.trim()
  } catch {
    // table missing (migration not applied yet) — fall through to legacy
  }
  // Legacy fallback: rows still sitting in the (service-readable) settings
  // table before the secret-store migration ran.
  try {
    const supabase = createClient()
    const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle()
    const v = (data as { value?: unknown } | null)?.value
    if (typeof v === "string" && v.trim()) return v.trim()
  } catch {
    // ignore
  }
  return null
}

/** Write one secret (server-side only). */
export async function setSecret(key: string, value: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("site_secrets")
    .upsert({ key, value: value.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) throw new Error(error.message)
}

/** Which secrets are currently set (values are never returned). */
export async function getSecretStatus(): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {}
  try {
    const supabase = createClient()
    const { data } = await supabase.from("site_secrets").select("key")
    for (const row of (data || []) as Array<{ key: string }>) out[row.key] = true
  } catch {
    // ignore
  }
  return out
}

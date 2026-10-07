// Korapay helpers (server-side only — never import in client components)
// Keys: KORAPAY_SECRET_KEY env -> site_settings.korapay_secret_key
// Public key: NEXT_PUBLIC_KORAPAY_PUBLIC_KEY env -> site_settings.korapay_public_key
// Encryption key (only needed for direct card-charge API, kept for completeness):
//   KORAPAY_ENCRYPTION_KEY env -> site_settings.korapay_encryption_key

import { createClient } from "@/lib/supabase/admin"
import { createHmac } from "crypto"

const KORAPAY_BASE = "https://api.korapay.com/merchant/api/v1"

async function setting(key: string): Promise<string | null> {
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

export async function resolveKorapaySecret(): Promise<string | null> {
  if (process.env.KORAPAY_SECRET_KEY?.trim()) return process.env.KORAPAY_SECRET_KEY.trim()
  return setting("korapay_secret_key")
}

export async function resolveKorapayPublic(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY?.trim()) return process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY.trim()
  return setting("korapay_public_key")
}

export async function resolveKorapayEncryption(): Promise<string | null> {
  if (process.env.KORAPAY_ENCRYPTION_KEY?.trim()) return process.env.KORAPAY_ENCRYPTION_KEY.trim()
  return setting("korapay_encryption_key")
}

export function isKorapayConfigured(secret: string | null | undefined) {
  return !!secret && secret.startsWith("sk_")
}

export interface KorapayInit {
  checkout_url: string
  reference: string
}

interface KorapayInitArgs {
  email: string
  name?: string
  /** Amount in NGN units (NOT kobo — Korapay charges naira directly). */
  amountNgn: number
  reference: string
  redirectUrl: string
  notificationUrl?: string
  narration?: string
  metadata?: Record<string, string>
}

export async function korapayInit(args: KorapayInitArgs): Promise<KorapayInit> {
  const secret = await resolveKorapaySecret()
  if (!isKorapayConfigured(secret)) throw new Error("Card payments are not configured yet.")
  const amount = Math.round(args.amountNgn)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid payment amount.")
  const res = await fetch(`${KORAPAY_BASE}/charges/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      currency: "NGN",
      reference: args.reference,
      customer: { email: args.email, ...(args.name ? { name: args.name.slice(0, 120) } : {}) },
      redirect_url: args.redirectUrl,
      ...(args.notificationUrl ? { notification_url: args.notificationUrl } : {}),
      ...(args.narration ? { narration: args.narration.slice(0, 200) } : {}),
      ...(args.metadata && Object.keys(args.metadata).length > 0 ? { metadata: args.metadata } : {}),
    }),
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json().catch(() => null)) as {
    status?: boolean
    message?: string
    data?: { checkout_url?: string; reference?: string }
  } | null
  const checkoutUrl = json?.data?.checkout_url
  if (!json?.status || !checkoutUrl) {
    throw new Error(`Payment could not start: ${json?.message || `Korapay rejected the charge (${res.status})`}`)
  }
  return { checkout_url: checkoutUrl, reference: json.data?.reference || args.reference }
}

export interface KorapayVerify {
  status: string
  reference: string
  amount: number
  currency: string
}

export async function korapayVerify(reference: string): Promise<KorapayVerify> {
  const secret = await resolveKorapaySecret()
  if (!isKorapayConfigured(secret)) throw new Error("Card payments are not configured yet.")
  const res = await fetch(`${KORAPAY_BASE}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json().catch(() => null)) as {
    status?: boolean
    message?: string
    data?: { status?: string; reference?: string; amount?: number | string; currency?: string }
  } | null
  if (!json?.status || !json?.data) throw new Error(`Verification failed: ${json?.message || "unknown error"}`)
  const amount = Number(json.data.amount)
  return {
    status: String(json.data.status || "unknown"),
    reference: String(json.data.reference || reference),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: String(json.data.currency || "NGN"),
  }
}

/** Verify Korapay webhook authenticity: HMAC-SHA256 of JSON.stringify(data) with the secret key. */
export function verifyKorapaySignature(data: unknown, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  try {
    const hash = createHmac("sha256", secret).update(JSON.stringify(data)).digest("hex")
    if (hash.length !== signature.length) return false
    let diff = 0
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ signature.charCodeAt(i)
    return diff === 0
  } catch {
    return false
  }
}

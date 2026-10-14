// Payment gateway helpers (server-side only — never import in client components)
// Keys: FLUTTERWAVE_SECRET_KEY env -> site_settings.flutterwave_secret_key
// Public key: NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY env -> site_settings.flutterwave_public_key
// Encryption key: FLUTTERWAVE_ENCRYPTION_KEY env -> site_settings.flutterwave_encryption_key
// Webhook secret hash: FLUTTERWAVE_SECRET_HASH env -> site_settings.flutterwave_secret_hash
// Test keys contain _TEST; live keys do not.

import { createClient } from "@/lib/supabase/admin"

const FLW_BASE = "https://api.flutterwave.com/v3"

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

export async function resolveFlutterwaveSecret(): Promise<string | null> {
  if (process.env.FLUTTERWAVE_SECRET_KEY?.trim()) return process.env.FLUTTERWAVE_SECRET_KEY.trim()
  return setting("flutterwave_secret_key")
}

export async function resolveFlutterwavePublic(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY?.trim()) return process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY.trim()
  return setting("flutterwave_public_key")
}

export async function resolveFlutterwaveEncryption(): Promise<string | null> {
  if (process.env.FLUTTERWAVE_ENCRYPTION_KEY?.trim()) return process.env.FLUTTERWAVE_ENCRYPTION_KEY.trim()
  return setting("flutterwave_encryption_key")
}

export async function resolveFlutterwaveWebhookHash(): Promise<string | null> {
  if (process.env.FLUTTERWAVE_SECRET_HASH?.trim()) return process.env.FLUTTERWAVE_SECRET_HASH.trim()
  const stored = await setting("flutterwave_secret_hash")
  // Fall back to the secret key — some setups reuse it as the hash.
  if (stored) return stored
  return resolveFlutterwaveSecret()
}

export function isFlutterwaveConfigured(secret: string | null | undefined) {
  return !!secret && secret.startsWith("FLWSECK")
}

export function isFlutterwaveTestMode(secret: string | null | undefined) {
  return !!secret && secret.includes("_TEST")
}

export interface FlutterwaveInit {
  checkout_url: string
  reference: string
}

interface FlutterwaveInitArgs {
  email: string
  name?: string
  phone?: string
  /** Amount in NGN units (Flutterwave charges naira directly). */
  amountNgn: number
  /** Our order reference (tx_ref). */
  reference: string
  redirectUrl: string
  title?: string
  description?: string
  metadata?: Record<string, string>
}

export async function flutterwaveInit(args: FlutterwaveInitArgs): Promise<FlutterwaveInit> {
  const secret = await resolveFlutterwaveSecret()
  if (!isFlutterwaveConfigured(secret)) throw new Error("Card payments are not configured yet.")
  const amount = Math.round(args.amountNgn)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid payment amount.")
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: args.reference,
      amount,
      currency: "NGN",
      redirect_url: args.redirectUrl,
      customer: {
        email: args.email,
        ...(args.name ? { name: args.name.slice(0, 120) } : {}),
        ...(args.phone ? { phonenumber: args.phone.slice(0, 40) } : {}),
      },
      customizations: {
        title: (args.title || "TechPivo Market").slice(0, 60),
        description: (args.description || `Order ${args.reference}`).slice(0, 200),
      },
      ...(args.metadata && Object.keys(args.metadata).length > 0 ? { meta: args.metadata } : {}),
    }),
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json().catch(() => null)) as {
    status?: string
    message?: string
    data?: { link?: string }
  } | null
  const link = json?.data?.link
  if (json?.status !== "success" || !link) {
    throw new Error(`Payment could not start: ${json?.message || `gateway rejected the charge (${res.status})`}`)
  }
  return { checkout_url: link, reference: args.reference }
}

export interface FlutterwaveVerify {
  status: string
  tx_ref: string
  transaction_id: number
  amount: number
  currency: string
}

/** Verify by Flutterwave transaction id (the `transaction_id` appended to
    our redirect URL). The tx_ref must match our order reference. */
export async function flutterwaveVerify(transactionId: string | number): Promise<FlutterwaveVerify> {
  const secret = await resolveFlutterwaveSecret()
  if (!isFlutterwaveConfigured(secret)) throw new Error("Card payments are not configured yet.")
  const res = await fetch(`${FLW_BASE}/transactions/${encodeURIComponent(String(transactionId))}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json().catch(() => null)) as {
    status?: string
    message?: string
    data?: { status?: string; tx_ref?: string; id?: number; amount?: number | string; currency?: string }
  } | null
  if (json?.status !== "success" || !json?.data) {
    throw new Error(`Verification failed: ${json?.message || "unknown error"}`)
  }
  const amount = Number(json.data.amount)
  return {
    status: String(json.data.status || "unknown"),
    tx_ref: String(json.data.tx_ref || ""),
    transaction_id: Number(json.data.id) || 0,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: String(json.data.currency || "NGN"),
  }
}

/** Verify webhook authenticity: the `verif-hash` header must equal the
    secret hash configured in the provider dashboard. */
export function verifyFlutterwaveSignature(signature: string | null, secretHash: string): boolean {
  if (!signature || !secretHash) return false
  const a = signature.trim()
  const b = secretHash.trim()
  if (a.length !== b.length || a.length === 0) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

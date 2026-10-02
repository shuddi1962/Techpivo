// Paystack helpers (server-side only — never import in client components)
// Keys: PAYSTACK_SECRET_KEY env -> site_settings.paystack_secret_key
// Public key: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY env -> site_settings.paystack_public_key

import { createClient } from "@/lib/supabase/admin"

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

export async function resolvePaystackSecret(): Promise<string | null> {
  if (process.env.PAYSTACK_SECRET_KEY?.trim()) return process.env.PAYSTACK_SECRET_KEY.trim()
  return setting("paystack_secret_key")
}

export async function resolvePaystackPublic(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim()) return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.trim()
  return setting("paystack_public_key")
}

export function isPaystackConfigured(secret: string | null | undefined) {
  return !!secret && secret.startsWith("sk_")
}

interface PaystackInit {
  authorization_url: string
  access_code: string
  reference: string
}

export async function paystackInit(email: string, amountKobo: number, reference: string, metadata?: Record<string, unknown>, callbackUrl?: string): Promise<PaystackInit> {
  const secret = await resolvePaystackSecret()
  if (!isPaystackConfigured(secret)) throw new Error("Card payments are not configured yet.")
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount: Math.round(amountKobo), reference, currency: "NGN", callback_url: callbackUrl, metadata: metadata || {} }),
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json()) as { status?: boolean; message?: string; data?: PaystackInit }
  if (!json?.status || !json?.data?.authorization_url) {
    throw new Error(`Payment could not start: ${json?.message || "unknown error"}`)
  }
  return json.data
}

interface PaystackVerify {
  status: string
  reference: string
  amount: number
  currency: string
  customer?: { email?: string }
}

export async function paystackVerify(reference: string): Promise<PaystackVerify> {
  const secret = await resolvePaystackSecret()
  if (!isPaystackConfigured(secret)) throw new Error("Card payments are not configured yet.")
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(20000),
  })
  const json = (await res.json()) as { status?: boolean; message?: string; data?: PaystackVerify }
  if (!json?.status || !json?.data) throw new Error(`Verification failed: ${json?.message || "unknown error"}`)
  return json.data
}

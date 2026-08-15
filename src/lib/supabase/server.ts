import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Missing Supabase environment variables")
  const cookieStore = cookies()
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          try {
            return cookieStore.getAll()
          } catch {
            return []
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // cookies() may be readonly in certain contexts
          }
        },
      },
    }
  )
}

/**
 * Cookie-free client for PUBLIC READ-ONLY server components.
 * Because it never touches cookies(), pages using it can be statically
 * rendered / ISR-cached (revalidate) instead of dynamic SSR on every
 * request — this is the fix for slow page loads.
 * RLS: all public read policies are granted to anon, so reads work identically.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Missing Supabase environment variables")
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // read-only client — never writes cookies
      },
    },
  })
}

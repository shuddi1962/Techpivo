/**
 * CSRF defense for cookie-based sessions.
 *
 * Same-origin JSON requests are protected by CORS preflight, but form-encoded
 * and multipart POSTs (login, upload) send cookies without preflight. Browsers
 * attach an Origin header to all cross-origin POSTs, so we reject state-changing
 * requests whose Origin is present but not in the allowlist. Requests without an
 * Origin header (curl, cron, server-to-server) are allowed.
 */
const ALLOWED_ORIGINS = new Set<string>([
  'https://techpivo.com',
  'https://www.techpivo.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : []),
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
])

/** Returns true when the request Origin is absent or matches the allowlist. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  return ALLOWED_ORIGINS.has(origin)
}

/** Returns a 403 JSON response when the request is a cross-origin state change. */
export function assertSameOrigin(request: Request): boolean {
  if (isSameOrigin(request)) return true
  console.warn('[csrf] blocked cross-origin request from', request.headers.get('origin'))
  return false
}

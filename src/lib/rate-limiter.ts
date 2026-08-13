type Attempt = { count: number; resetAt: number }

const store = new Map<string, Attempt>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 60 * 1000

export interface RateLimitOptions {
  /** max events allowed inside the window */
  limit: number
  /** window duration ms */
  windowMs?: number
}

/**
 * In-memory fixed-window rate limiter. Suitable for single-instance deployments
 * (Vercel functions may run multiple instances — counts are per-instance).
 * For strict distributed enforcement, move to a shared store (e.g. Redis).
 */
export function checkRateLimit(
  key: string,
  opts: RateLimitOptions = { limit: MAX_ATTEMPTS, windowMs: WINDOW_MS }
): { allowed: boolean; remaining: number; cooldown: number } {
  const { limit, windowMs = WINDOW_MS } = opts
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, cooldown: 0 }
  }

  if (entry.count >= limit) {
    const cooldown = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, cooldown }
  }

  entry.count++
  store.set(key, entry)
  return { allowed: true, remaining: limit - entry.count, cooldown: 0 }
}

export function resetRateLimit(key: string) {
  store.delete(key)
}

/** Shared limit presets for community write endpoints */
export const RATE_LIMITS = {
  postCreate: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 posts/hour
  replyCreate: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 replies/hour
  vote: { limit: 120, windowMs: 60 * 60 * 1000 }, // 120 votes/hour
  pollVote: { limit: 30, windowMs: 60 * 60 * 1000 },
  quizAttempt: { limit: 15, windowMs: 60 * 60 * 1000 },
  report: { limit: 10, windowMs: 60 * 60 * 1000 },
  follow: { limit: 60, windowMs: 60 * 60 * 1000 },
  search: { limit: 120, windowMs: 60 * 1000 },
  xp: { limit: 60, windowMs: 60 * 1000 },
  upload: { limit: 30, windowMs: 60 * 60 * 1000 },
  eventRsvp: { limit: 30, windowMs: 60 * 60 * 1000 },
  bookmark: { limit: 60, windowMs: 60 * 60 * 1000 },
} as const

/** Extract client IP from request headers (x-forwarded-for from proxies). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

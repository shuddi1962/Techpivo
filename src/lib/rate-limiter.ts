type Attempt = { count: number; resetAt: number }

const store = new Map<string, Attempt>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 60 * 1000

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; cooldown: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, cooldown: 0 }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const cooldown = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, cooldown }
  }

  entry.count++
  store.set(key, entry)
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, cooldown: 0 }
}

export function resetRateLimit(key: string) {
  store.delete(key)
}

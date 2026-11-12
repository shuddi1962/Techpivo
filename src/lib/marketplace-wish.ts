// TechPivo Market wishlist persistence helpers.
const WISH_KEY = "tp_market_wish_v1"

export function readWish(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(WISH_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Object.fromEntries(
      (Array.isArray(arr) ? arr : []).map((id) => [id, true])
    )
  } catch {
    return {}
  }
}

export function writeWish(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(WISH_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

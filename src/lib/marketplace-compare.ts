// TechPivo Market — compare-list helpers (localStorage, client-safe).
// Compare state is visual-only shortlisting; the key is shared by every
// storefront card so a product compared in one section shows everywhere.

export const COMPARE_KEY = "tp_market_compare_v1"

export function readCompare(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Object.fromEntries((Array.isArray(arr) ? arr : []).map((id) => [id, true]))
  } catch {
    return {}
  }
}

/** Flip the stored compare flag for a product; returns the new state. */
export function toggleCompareStored(id: string): boolean {
  const cur = readCompare()
  const next = !cur[id]
  try {
    if (next) cur[id] = true
    else delete cur[id]
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(Object.keys(cur)))
  } catch {
    // storage blocked — caller still toggles its visual state
  }
  return next
}

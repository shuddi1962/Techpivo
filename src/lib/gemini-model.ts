// Gemini model resolution — flippable in realtime from Admin → Settings:
// site_settings.gemini_model (DB) wins over the GEMINI_MODEL env var, which
// wins over the default. When Google's free-tier daily quota on one model is
// exhausted (429s), switching the model string on the same key bypasses it —
// no code change or redeploy needed.
//
// IMPORTANT: The GEMINI_MODEL env var is validated against ALLOWED_MODELS.
// If it contains a discontinued model (e.g. gemini-2.0-flash), it is rejected
// and the system falls back to the DB setting or default — never a 404.

export const GEMINI_MODEL_DEFAULT = 'gemini-3.6-flash'

// Order matters: it is the automatic fallback chain. Free-tier daily quotas are
// per model, so when one model returns 429 (quota exhausted) or 404 (not
// available to the key), callers rotate to the next entry instead of failing.
// 2.x models (gemini-2.0-flash, gemini-2.5-flash) are REMOVED — Google
// discontinued them for new keys and they return 404 on 2026+ API keys.
export const GEMINI_MODEL_OPTIONS = [
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (default)' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
] as const

export function geminiModelOrder(primary: string): string[] {
  const seen = new Set<string>()
  return [primary, ...GEMINI_MODEL_OPTIONS.map((o) => o.value)]
    .map((m) => normalizeGeminiModel(m))
    .filter((m): m is string => !!m)
    .filter((m) => !seen.has(m) && seen.add(m))
}

// Google model ids are [a-z0-9][a-z0-9._-]{0,63} — anything else (URLs, paths,
// whitespace tricks) is rejected so a tampered setting can never inject into
// the API URL.
const SAFE_MODEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/

export function normalizeGeminiModel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 64) return null
  if (!SAFE_MODEL_RE.test(trimmed)) return null
  return trimmed
}

export function getGeminiModel(env: Record<string, string | undefined> = {}): string {
  return normalizeGeminiModel(env.GEMINI_MODEL) || GEMINI_MODEL_DEFAULT
}

// Only allow models we know are available — reject anything else (e.g. the
// removed gemini-2.5-pro) so a stale DB setting can never cause 404s.
const ALLOWED_MODELS: Set<string> = new Set(GEMINI_MODEL_OPTIONS.map((o) => o.value))

export function isAllowedGeminiModel(model: string): boolean {
  return ALLOWED_MODELS.has(model)
}
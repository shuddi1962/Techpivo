// Gemini model resolution — flippable in realtime from Admin → Settings:
// site_settings.gemini_model (DB) wins over the GEMINI_MODEL env var, which
// wins over the default. When Google's free-tier daily quota on one model is
// exhausted (429s), switching the model string on the same key bypasses it —
// no code change or redeploy needed.

export const GEMINI_MODEL_DEFAULT = 'gemini-2.5-flash'

// Order matters: it is the automatic fallback chain. Free-tier daily quotas are
// per model, so when one model returns 429 (quota exhausted) or 404 (not
// available to the key), callers rotate to the next entry instead of failing.
// gemini-2.5-pro is NOT available to new API keys (returns 404 "no longer
// available to new users") — kept last so it can never be the primary.
export const GEMINI_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (default)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (not available on new keys)' },
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
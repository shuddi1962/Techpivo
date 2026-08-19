// Gemini model resolution — flippable in realtime from Admin → Settings:
// site_settings.gemini_model (DB) wins over the GEMINI_MODEL env var, which
// wins over the default. When Google's free-tier daily quota on one model is
// exhausted (429s), switching the model string on the same key bypasses it —
// no code change or redeploy needed.

export const GEMINI_MODEL_DEFAULT = 'gemini-2.5-flash'

export const GEMINI_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (default)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
] as const

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
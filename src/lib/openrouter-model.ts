// OpenRouter model resolution — flippable in realtime from Admin → Settings:
// site_settings.openrouter_model (DB) wins over the OPENROUTER_MODEL env var,
// which wins over the default. When the key is funded, paid models (GPT-4o,
// Claude, Gemini) are available alongside free models.
//
// The Settings page fetches the LIVE model list from OpenRouter's API so new
// models appear automatically. This file provides the curated fallback list
// and the resolver used by all AI call sites.

import { createClient } from "@/lib/supabase/admin"

// ── Curated fallback list (used when live API fetch fails) ────────────────
// Descriptions help admins choose the right model. Order = priority.

export interface OpenRouterModelOption {
  id: string
  name: string
  description: string
  contextLength: number
  isFree: boolean
  promptPrice?: string    // $/token display
  completionPrice?: string
  costPerArticle?: string // estimated ~2k prompt + ~4k completion
  tier: "best" | "great" | "good" | "free"
}

export const OPENROUTER_MODEL_OPTIONS: OpenRouterModelOption[] = [
  // ── PAID — Best quality ──────────────────────────────────────────────
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google's fastest model. Excellent value — strong reasoning, huge 1M context, ~$0.001/article. Best starting point when you fund the key.",
    contextLength: 1_048_576,
    isFree: false,
    promptPrice: "$0.30/M tokens",
    completionPrice: "$2.50/M tokens",
    costPerArticle: "~$0.001",
    tier: "best",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Anthropic's best writing model. Exceptional article quality, natural tone, 1M context. ~$0.06/article. Premium choice for editorial content.",
    contextLength: 1_000_000,
    isFree: false,
    promptPrice: "$3.00/M tokens",
    completionPrice: "$15.00/M tokens",
    costPerArticle: "~$0.06",
    tier: "great",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's flagship omni model. Great all-around writing, 128K context. ~$0.04/article. Reliable JSON output.",
    contextLength: 128_000,
    isFree: false,
    promptPrice: "$2.50/M tokens",
    completionPrice: "$10.00/M tokens",
    costPerArticle: "~$0.04",
    tier: "great",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google's most capable model. Advanced reasoning, 1M context. ~$0.004/article. Best for complex technical articles.",
    contextLength: 1_048_576,
    isFree: false,
    promptPrice: "$1.25/M tokens",
    completionPrice: "$10.00/M tokens",
    costPerArticle: "~$0.004",
    tier: "great",
  },
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    description: "OpenAI's frontier model. Best for complex professional workloads, 1M+ context. Premium pricing.",
    contextLength: 1_050_000,
    isFree: false,
    promptPrice: "$5.00/M tokens",
    completionPrice: "$30.00/M tokens",
    costPerArticle: "~$0.13",
    tier: "good",
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    description: "Anthropic's strongest model. Long-running professional tasks, exceptional quality. Highest cost.",
    contextLength: 1_000_000,
    isFree: false,
    promptPrice: "$5.00/M tokens",
    completionPrice: "$25.00/M tokens",
    costPerArticle: "~$0.11",
    tier: "good",
  },
  // ── FREE — No cost ──────────────────────────────────────────────────
  {
    id: "minimax/minimax-m3:free",
    name: "MiniMax M3 (free)",
    description: "Best free model. Multimodal, 1M context, strong for articles. Non-reasoning — produces visible JSON reliably. Recommended free option.",
    contextLength: 1_048_576,
    isFree: true,
    costPerArticle: "Free",
    tier: "free",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning (free)",
    description: "NVIDIA's fast free model. 3B active params, high throughput. Good for quick drafts.",
    contextLength: 1_000_000,
    isFree: true,
    costPerArticle: "Free",
    tier: "free",
  },
  {
    id: "thinkingmachines/inkling:free",
    name: "Inkling (free)",
    description: "Thinking Machines' open model. 41B active params, general-purpose reasoning. Solid free option.",
    contextLength: 1_048_576,
    isFree: true,
    costPerArticle: "Free",
    tier: "free",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B (free)",
    description: "Google's open model. 30.7B params, multimodal, configurable thinking. Good free option.",
    contextLength: 262_144,
    isFree: true,
    costPerArticle: "Free",
    tier: "free",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra (free)",
    description: "NVIDIA's frontier-reasoning model. 55B active/550B total. WARNING: reasoning model — may consume tokens on internal thinking, leaving empty output. Use as last fallback only.",
    contextLength: 1_000_000,
    isFree: true,
    costPerArticle: "Free",
    tier: "free",
  },
]

export const OPENROUTER_MODEL_DEFAULT = "minimax/minimax-m3:free"

// ── Resolver — DB → env → default ────────────────────────────────────────
// Cached for 30s to avoid hammering the DB on every AI call.

let _cachedModel: string | null = null
let _cacheExpiry = 0
const CACHE_MS = 30_000

export async function resolveOpenRouterModel(): Promise<string> {
  const now = Date.now()
  if (_cachedModel && now < _cacheExpiry) return _cachedModel

  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "openrouter_model")
      .maybeSingle()
    const model = typeof data?.value === "string" ? data.value.trim() : ""
    if (model && model.includes("/")) {
      _cachedModel = model
      _cacheExpiry = now + CACHE_MS
      return model
    }
  } catch { /* fall through */ }

  // Env fallback
  const envModel = process.env.OPENROUTER_MODEL?.trim()
  if (envModel && envModel.includes("/")) {
    _cachedModel = envModel
    _cacheExpiry = now + CACHE_MS
    return envModel
  }

  _cachedModel = OPENROUTER_MODEL_DEFAULT
  _cacheExpiry = now + CACHE_MS
  return OPENROUTER_MODEL_DEFAULT
}

// Synchronous version for edge functions that read DB at startup
export function getOpenRouterModelSync(dbValue?: string): string {
  if (dbValue && dbValue.includes("/")) return dbValue
  const envModel = process.env.OPENROUTER_MODEL?.trim()
  if (envModel && envModel.includes("/")) return envModel
  return OPENROUTER_MODEL_DEFAULT
}

// Build ordered model list: primary first, then fallbacks
export function openRouterModelOrder(primary: string): string[] {
  const seen = new Set<string>()
  return [
    primary,
    ...OPENROUTER_MODEL_OPTIONS.map((o) => o.id),
  ]
    .filter((m): m is string => !!m)
    .filter((m) => !seen.has(m) && seen.add(m))
}

// Validate model ID format (provider/model or provider/model:variant)
const SAFE_MODEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}(\/[a-z0-9][a-z0-9._-]{0,63}){1,2}(:[a-z0-9_-]+)?$/i

export function isValidOpenRouterModel(model: string): boolean {
  return SAFE_MODEL_RE.test(model)
}

// ── API Key resolver — DB → env → null ────────────────────────────────────
// Cached for 30s so the key is not re-read on every AI call.

let _cachedKey: string | null = undefined as unknown as string | null
let _keyExpiry = 0

export async function resolveOpenRouterKey(): Promise<string | null> {
  const now = Date.now()
  if (_cachedKey !== undefined && now < _keyExpiry) return _cachedKey

  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "openrouter_api_key")
      .maybeSingle()
    const key = typeof data?.value === "string" ? data.value.trim() : ""
    if (key && key.startsWith("sk-or-")) {
      _cachedKey = key
      _keyExpiry = now + CACHE_MS
      return key
    }
  } catch { /* fall through */ }

  const envKey = process.env.OPENROUTER_API_KEY?.trim()
  if (envKey) {
    _cachedKey = envKey
    _keyExpiry = now + CACHE_MS
    return envKey
  }

  _cachedKey = null
  _keyExpiry = now + CACHE_MS
  return null
}

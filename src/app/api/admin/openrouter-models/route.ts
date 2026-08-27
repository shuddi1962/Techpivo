import { NextRequest, NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/admin-auth"

// In-memory cache — 6 hours. Models rarely change.
let _cache: { models: unknown; ts: number } | null = null
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export async function GET(req: NextRequest) {
  const guard = await requireAdminRole(["admin", "editor"], req)
  if (!guard.ok) return guard.response

  const now = Date.now()
  if (_cache && now - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ models: _cache.models, cached: true })
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter API returned ${res.status}`, models: [] },
        { status: 200 } // return 200 so the page can fall back to curated list
      )
    }

    const data = await res.json()
    const raw: unknown[] = data?.data ?? []

    // Extract useful fields and sort: free first, then by context length desc
    const models = raw
      .filter((m: any) => m?.id && m?.name)
      .map((m: any) => {
        const promptCost = parseFloat(m.pricing?.prompt ?? "0")
        const completionCost = parseFloat(m.pricing?.completion ?? "0")
        const isFree = promptCost === 0 && completionCost === 0
        const ctx = m.context_length ?? 0
        const modality = m.architecture?.modality ?? "text"
        const inputMods = m.architecture?.input_modalities ?? []
        const isReasoning = !!m.reasoning?.mandatory || !!m.reasoning?.default_enabled
        const maxCompletion = m.top_provider?.max_completion_tokens ?? ctx

        return {
          id: m.id,
          name: m.name,
          description: (m.description || "").slice(0, 300),
          contextLength: ctx,
          maxCompletion,
          isFree,
          promptCost,
          completionCost,
          modality,
          inputModalities: inputMods,
          isReasoning,
          topProvider: m.top_provider?.context_length ?? ctx,
        }
      })
      .sort((a: any, b: any) => {
        // Free first, then by context length desc
        if (a.isFree !== b.isFree) return a.isFree ? -1 : 1
        return b.contextLength - a.contextLength
      })

    _cache = { models, ts: now }
    return NextResponse.json({ models, count: models.length, cached: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[openrouter-models] fetch failed:", msg)
    return NextResponse.json(
      { error: msg, models: [] },
      { status: 200 } // soft fail so the page uses curated fallback
    )
  }
}

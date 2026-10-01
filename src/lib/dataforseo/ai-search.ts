import { dfsPost, type DfsCallResult } from "./client";
import { logDataForSeoUsage } from "./usage";

/**
 * TechPivo Intelligence — DataForSEO AI Optimization endpoints (SERVER-ONLY).
 * Verified live 2026-09-26 against official docs + real account probes:
 * - POST /v3/ai_optimization/ai_keyword_data/keywords_search_volume/live (~$0.01)
 * - POST /v3/ai_optimization/llm_mentions/target_metrics/live (~$0.10; target
 *   is an array of {domain}|{keyword} objects; chat_gpt = US/en only)
 */

export interface AiKeywordVolume {
  keyword: string;
  aiSearchVolume: number | null;
  aiMonthly: Array<{ year: number; month: number; aiSearchVolume: number }>;
}

interface AiVolumeRaw {
  keyword?: string;
  ai_search_volume?: number | null;
  ai_monthly_searches?: Array<{ year?: number; month?: number; ai_search_volume?: number }> | null;
}

/** Estimated AI-tool search volume per keyword (conversational demand). */
export async function fetchAiKeywordVolume(opts: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
}): Promise<DfsCallResult<AiKeywordVolume[]>> {
  const keywords = [...new Set(opts.keywords.map((k) => k.trim().slice(0, 80)).filter(Boolean))].slice(0, 10);
  if (keywords.length === 0) return { data: [], cost: { endpoint: "ai_keyword_volume", cost: 0, statusCode: null } };
  const { data, cost } = await dfsPost<AiVolumeRaw[]>(
    "/ai_optimization/ai_keyword_data/keywords_search_volume/live",
    [{ keywords, location_code: opts.locationCode, language_code: opts.languageCode }]
  );
  const out: AiKeywordVolume[] = (data ?? []).map((r) => ({
    keyword: (r.keyword ?? "").slice(0, 80),
    aiSearchVolume: r.ai_search_volume ?? null,
    aiMonthly: (r.ai_monthly_searches ?? [])
      .filter((s) => (s.year ?? 0) >= 2000 && (s.month ?? 0) >= 1 && (s.month ?? 0) <= 12)
      .map((s) => ({ year: s.year as number, month: s.month as number, aiSearchVolume: s.ai_search_volume ?? 0 }))
      .slice(0, 12),
  })).filter((r) => r.keyword.length > 0);
  logDataForSeoUsage("ai_keyword_volume", cost, { keywords: keywords.length, locationCode: opts.locationCode });
  return { data: out, cost };
}

export interface LlmMentionTotals {
  mentions: number;
  aiSearchVolume: number;
  byPlatform: Array<{ platform: string; mentions: number }>;
  topSourceDomains: Array<{ domain: string; mentions: number }>;
}

interface LlmTargetRaw {
  aggregated_metrics?: {
    total?: { mentions?: number; ai_search_volume?: number } | null;
    platform?: Array<{ key?: string; mentions?: number }> | null;
    sources_domain?: Array<{ key?: string; mentions?: number }> | null;
  } | null;
}

/**
 * LLM mention metrics for a domain (brand visibility in AI answers).
 * ~$0.10/call — routes must call this on-demand only, never in bulk loops.
 * Empty totals = no measurable mentions (honest, not an error).
 */
export async function fetchLlmTargetMetrics(opts: {
  domain: string;
  locationCode?: number;
  languageCode?: string;
}): Promise<DfsCallResult<LlmMentionTotals>> {
  const { data, cost } = await dfsPost<LlmTargetRaw[]>(
    "/ai_optimization/llm_mentions/target_metrics/live",
    [{
      target: [{ domain: opts.domain, search_filter: "include" }],
      location_code: opts.locationCode ?? 2840,
      language_code: opts.languageCode ?? "en",
    }],
    { timeoutMs: 120000 }
  );
  const agg = data?.[0]?.aggregated_metrics;
  const out: LlmMentionTotals = {
    mentions: agg?.total?.mentions ?? 0,
    aiSearchVolume: agg?.total?.ai_search_volume ?? 0,
    byPlatform: (agg?.platform ?? []).map((p) => ({ platform: p.key ?? "unknown", mentions: p.mentions ?? 0 })),
    topSourceDomains: (agg?.sources_domain ?? []).slice(0, 10).map((d) => ({ domain: d.key ?? "", mentions: d.mentions ?? 0 })),
  };
  logDataForSeoUsage("llm_target_metrics", cost, { domain: opts.domain });
  return { data: out, cost };
}

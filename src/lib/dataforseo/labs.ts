import { dfsPost, type DfsCallResult } from "./client";
import { logDataForSeoUsage } from "./usage";

/**
 * TechPivo Intelligence — DataForSEO Labs competitor endpoints (SERVER-ONLY).
 * Verified live 2026-09-26 against official docs + real account probes:
 * - POST /v3/dataforseo_labs/google/ranked_keywords/live (~$0.013/call)
 * - POST /v3/dataforseo_labs/google/competitors_domain/live (~$0.013/call)
 * Costs are returned with every call so routes can log real spend.
 */

export interface RankedKeywordItem {
  keyword: string;
  searchVolume: number | null;
  competition: number | null;
  cpc: number | null;
  rankGroup: number | null;
  rankAbsolute: number | null;
  etv: number | null;
}

interface LabsRankedRaw {
  keyword_data?: {
    keyword?: string;
    keyword_info?: {
      search_volume?: number | null;
      competition?: number | null;
      cpc?: number | null;
    } | null;
  } | null;
  ranked_serp_element?: {
    serp_item?: { rank_group?: number | null; rank_absolute?: number | null; etv?: number | null } | null;
  } | null;
}

/** Keywords a domain ranks for (weekly-updated Labs data). */
export async function fetchRankedKeywords(opts: {
  domain: string;
  locationCode: number;
  languageCode: string;
  limit?: number;
}): Promise<DfsCallResult<RankedKeywordItem[]>> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const { data, cost } = await dfsPost<Array<{ items?: LabsRankedRaw[] }>>(
    "/dataforseo_labs/google/ranked_keywords/live",
    [{ target: opts.domain, location_code: opts.locationCode, language_code: opts.languageCode, limit, include_clickstream_data: false }]
  );
  const items = data?.[0]?.items ?? [];
  const out: RankedKeywordItem[] = items.map((it) => ({
    keyword: (it.keyword_data?.keyword ?? "").slice(0, 80),
    searchVolume: it.keyword_data?.keyword_info?.search_volume ?? null,
    competition: it.keyword_data?.keyword_info?.competition ?? null,
    cpc: it.keyword_data?.keyword_info?.cpc ?? null,
    rankGroup: it.ranked_serp_element?.serp_item?.rank_group ?? null,
    rankAbsolute: it.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    etv: it.ranked_serp_element?.serp_item?.etv ?? null,
  })).filter((k) => k.keyword.length > 0);
  logDataForSeoUsage("labs_ranked_keywords", cost, { domain: opts.domain, limit });
  return { data: out, cost };
}

export interface DomainCompetitor {
  domain: string;
  avgPosition: number | null;
  intersections: number | null;
}

interface LabsCompetitorRaw {
  domain?: string;
  avg_position?: number | null;
  intersections?: number | null;
}

/** Domains competing with the target in the same SERP space. */
export async function fetchDomainCompetitors(opts: {
  domain: string;
  locationCode: number;
  languageCode: string;
  limit?: number;
}): Promise<DfsCallResult<DomainCompetitor[]>> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const { data, cost } = await dfsPost<Array<{ items?: LabsCompetitorRaw[] }>>(
    "/dataforseo_labs/google/competitors_domain/live",
    [{ target: opts.domain, location_code: opts.locationCode, language_code: opts.languageCode, limit }]
  );
  const out: DomainCompetitor[] = (data?.[0]?.items ?? []).map((c) => ({
    domain: (c.domain ?? "").slice(0, 120),
    avgPosition: c.avg_position ?? null,
    intersections: c.intersections ?? null,
  })).filter((c) => c.domain.length > 0);
  logDataForSeoUsage("labs_domain_competitors", cost, { domain: opts.domain, limit });
  return { data: out, cost };
}

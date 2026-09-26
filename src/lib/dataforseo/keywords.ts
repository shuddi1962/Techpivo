import { dfsPost, type DfsCallResult } from "./client";
import type { DataForSeoCost, KeywordMetric, KeywordSuggestion } from "./types";
import { DFS_DEFAULT_LANGUAGE_CODE, DFS_DEFAULT_LOCATION_CODE } from "./locations";

export interface KeywordQuery {
  keywords: string[];
  locationCode?: number;
  locationName?: string;
  languageCode?: string;
}

export interface SuggestionQuery extends KeywordQuery {
  seed: string;
  limit?: number;
  includeSerpInfo?: boolean;
}

interface LabsKeywordInfo {
  search_volume?: number | null;
  cpc?: number | null;
  competition?: number | null;
  competition_level?: string | null;
  monthly_searches?: Array<{ year?: number; month?: number; search_volume?: number }>;
  last_updated_time?: string | null;
  search_volume_trend?: { monthly?: number | null; quarterly?: number | null; yearly?: number | null };
}

interface LabsOverviewItem {
  keyword?: string;
  location_code?: number;
  language_code?: string;
  keyword_info?: LabsKeywordInfo;
  keyword_properties?: { keyword_difficulty?: number | null };
}

interface SuggestionItem extends LabsOverviewItem {
  serp_info?: { serp_item_types?: string[]; se_results_count?: number | null } | null;
}

const nowIso = () => new Date().toISOString();

function toMetric(
  keyword: string,
  item: LabsOverviewItem,
  locationCode: number,
  locationName: string,
  languageCode: string
): KeywordMetric {
  const info = item.keyword_info ?? {};
  const trend = info.search_volume_trend ?? {};
  const monthly = Array.isArray(info.monthly_searches)
    ? info.monthly_searches
        .filter((m) => typeof m?.year === "number" && typeof m?.month === "number")
        .map((m) => ({ year: m.year as number, month: m.month as number, searchVolume: m.search_volume ?? 0 }))
    : [];
  return {
    keyword,
    locationCode,
    locationName,
    languageCode,
    searchVolume: info.search_volume ?? null,
    cpc: info.cpc ?? null,
    competition: typeof info.competition === "number" ? info.competition : null,
    competitionLevel: info.competition_level ?? null,
    keywordDifficulty: item.keyword_properties?.keyword_difficulty ?? null,
    monthlySearches: monthly,
    trendMonthly: trend.monthly ?? null,
    trendQuarterly: trend.quarterly ?? null,
    trendYearly: trend.yearly ?? null,
    lastUpdated: info.last_updated_time ?? null,
    source: "dataforseo",
    fetchedAt: nowIso(),
  };
}

/**
 * Keyword overview (volume, CPC, competition, difficulty, trends) for up to
 * 700 explicit keywords. Endpoint verified in current DataForSEO v3 docs:
 * POST /v3/dataforseo_labs/google/keyword_overview/live
 */
export async function fetchKeywordOverview(
  q: KeywordQuery
): Promise<{ metrics: KeywordMetric[]; cost: DataForSeoCost }> {
  const locationCode = q.locationCode ?? DFS_DEFAULT_LOCATION_CODE;
  const languageCode = q.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE;
  const { data, cost } = await dfsPost<Array<{ items?: LabsOverviewItem[] }>>(
    "/dataforseo_labs/google/keyword_overview/live",
    [
      {
        keywords: q.keywords.slice(0, 100),
        location_code: locationCode,
        language_code: languageCode,
        include_serp_info: false,
        include_clickstream_data: false,
      },
    ]
  );
  const items = data?.[0]?.items ?? [];
  const locationName = q.locationName ?? String(locationCode);
  return {
    metrics: items.map((it) =>
      toMetric(it.keyword ?? "", it, it.location_code ?? locationCode, locationName, it.language_code ?? languageCode)
    ),
    cost,
  };
}

/**
 * Keyword suggestions for a seed keyword. Endpoint verified in current
 * DataForSEO v3 docs: POST /v3/dataforseo_labs/google/keyword_suggestions/live
 */
export async function fetchKeywordSuggestions(
  q: SuggestionQuery
): Promise<{ suggestions: KeywordSuggestion[]; seedData: KeywordMetric | null; totalCount: number; cost: DataForSeoCost }> {
  const locationCode = q.locationCode ?? DFS_DEFAULT_LOCATION_CODE;
  const languageCode = q.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE;
  const { data, cost } = await dfsPost<
    Array<{
      items?: SuggestionItem[];
      seed_keyword_data?: LabsOverviewItem | null;
      total_count?: number;
    }>
  >("/dataforseo_labs/google/keyword_suggestions/live", [
    {
      keyword: q.seed,
      location_code: locationCode,
      language_code: languageCode,
      include_serp_info: q.includeSerpInfo ?? true,
      include_seed_keyword: true,
      limit: Math.min(Math.max(q.limit ?? 20, 1), 100),
      order_by: ["keyword_info.search_volume,desc"],
    },
  ]);
  const block = data?.[0];
  const locationName = q.locationName ?? String(locationCode);
  const suggestions: KeywordSuggestion[] = (block?.items ?? []).map((it) => ({
    ...toMetric(it.keyword ?? "", it, it.location_code ?? locationCode, locationName, it.language_code ?? languageCode),
    serpFeatures: it.serp_info?.serp_item_types ?? [],
    seResultsCount: it.serp_info?.se_results_count ?? null,
  }));
  const seed = block?.seed_keyword_data
    ? toMetric(q.seed, block.seed_keyword_data, locationCode, locationName, languageCode)
    : null;
  return { suggestions, seedData: seed, totalCount: block?.total_count ?? suggestions.length, cost };
}

export type { DfsCallResult };

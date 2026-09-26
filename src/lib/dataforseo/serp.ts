import { dfsPost } from "./client";
import type { DataForSeoCost, SerpSummary } from "./types";
import { DFS_DEFAULT_LANGUAGE_CODE, DFS_DEFAULT_LOCATION_CODE } from "./locations";

export interface SerpQuery {
  keyword: string;
  locationCode?: number;
  languageCode?: string;
  depth?: number;
}

interface SerpApiItem {
  type?: string;
  rank_group?: number;
  title?: string;
  url?: string;
  domain?: string;
  description?: string;
}

/**
 * Live Google organic SERP. Endpoint: POST /v3/serp/google/organic/live/advanced
 * Returns the normalized summary TechPivo stores — never raw HTML.
 * Depth capped at 20 to control spend.
 */
export async function fetchLiveSerp(
  q: SerpQuery
): Promise<{ serp: SerpSummary; cost: DataForSeoCost }> {
  const locationCode = q.locationCode ?? DFS_DEFAULT_LOCATION_CODE;
  const languageCode = q.languageCode ?? DFS_DEFAULT_LANGUAGE_CODE;
  const depth = Math.min(Math.max(q.depth ?? 10, 1), 20);
  const { data, cost } = await dfsPost<
    Array<{
      se_results_count?: number | null;
      items?: SerpApiItem[];
    }>
  >("/serp/google/organic/live/advanced", [
    {
      keyword: q.keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth,
    },
  ]);
  const block = data?.[0];
  const items = Array.isArray(block?.items) ? block!.items! : [];
  const organic = items
    .filter((it) => it.type === "organic")
    .slice(0, depth)
    .map((it, i) => ({
      position: it.rank_group ?? i + 1,
      title: it.title ?? "",
      url: it.url ?? "",
      domain: it.domain ?? safeDomain(it.url ?? ""),
      description: it.description ?? null,
      isFeaturedSnippet: false,
    }));
  const featured = items.some((it) => it.type === "featured_snippet");
  if (featured && organic.length > 0) organic[0].isFeaturedSnippet = true;
  const itemTypes = [...new Set(items.map((it) => it.type ?? "unknown"))];
  return {
    serp: {
      keyword: q.keyword,
      locationCode,
      languageCode,
      seResultsCount: block?.se_results_count ?? null,
      itemTypes,
      organic,
      fetchedAt: new Date().toISOString(),
    },
    cost,
  };
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

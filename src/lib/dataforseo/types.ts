/**
 * TechPivo Intelligence — DataForSEO typed contracts.
 *
 * Server-only. These types describe the normalized shape TechPivo stores
 * and renders. Raw DataForSEO payloads are never sent to the browser.
 */

export type DataForSeoStatus =
  | "ok"
  | "not_configured"
  | "auth_failed"
  | "rate_limited"
  | "insufficient_credits"
  | "bad_request"
  | "unavailable"
  | "timeout"
  | "unknown";

export interface KeywordMetric {
  keyword: string;
  locationCode: number;
  locationName: string;
  languageCode: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null; // 0..1 (Google Ads paid competition)
  competitionLevel: string | null; // LOW | MEDIUM | HIGH
  keywordDifficulty: number | null; // 0..100 where available
  monthlySearches: Array<{ year: number; month: number; searchVolume: number }>;
  trendMonthly: number | null; // % vs previous month where available
  trendQuarterly: number | null;
  trendYearly: number | null;
  lastUpdated: string | null;
  source: "dataforseo";
  fetchedAt: string;
}

export interface KeywordSuggestion extends KeywordMetric {
  serpFeatures: string[];
  seResultsCount: number | null;
}

export interface SerpOrganicItem {
  position: number;
  title: string;
  url: string;
  domain: string;
  description: string | null;
  isFeaturedSnippet: boolean;
}

export interface SerpSummary {
  keyword: string;
  locationCode: number;
  languageCode: string;
  seResultsCount: number | null;
  itemTypes: string[];
  organic: SerpOrganicItem[];
  fetchedAt: string;
}

export interface DataForSeoCost {
  endpoint: string;
  cost: number | null;
  statusCode: number | null;
}

export interface MarketLocation {
  code: number;
  name: string;
  countryIso: string;
  scope: "global" | "country" | "region" | "city";
}

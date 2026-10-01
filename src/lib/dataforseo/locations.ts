import { dfsGet } from "./client";
import type { MarketLocation } from "./types";

/**
 * Market list. Only location codes verified against the LIVE DataForSEO
 * locations database (GET /v3/dataforseo_labs/locations_and_languages) are
 * hardcoded. Every other market resolves through the live lookup so codes
 * are never fabricated.
 *
 * Verified 2026-09-26: US 2840, UK 2826, Nigeria 2566, Canada 2124,
 * India 2356, South Africa 2710, Australia 2036, Germany 2276, Ghana 2288,
 * Kenya 2404.
 */
export const DFS_VERIFIED_LOCATIONS: MarketLocation[] = [
  { code: 2840, name: "United States", countryIso: "US", scope: "country" },
  { code: 2826, name: "United Kingdom", countryIso: "GB", scope: "country" },
  { code: 2566, name: "Nigeria", countryIso: "NG", scope: "country" },
  { code: 2124, name: "Canada", countryIso: "CA", scope: "country" },
  { code: 2356, name: "India", countryIso: "IN", scope: "country" },
  { code: 2710, name: "South Africa", countryIso: "ZA", scope: "country" },
  { code: 2036, name: "Australia", countryIso: "AU", scope: "country" },
  { code: 2276, name: "Germany", countryIso: "DE", scope: "country" },
  { code: 2288, name: "Ghana", countryIso: "GH", scope: "country" },
  { code: 2404, name: "Kenya", countryIso: "KE", scope: "country" },
];

export const DFS_GLOBAL_SCOPE: MarketLocation = {
  code: 0,
  name: "Global",
  countryIso: "",
  scope: "global",
};

export const DFS_DEFAULT_LOCATION_CODE = 2840;
export const DFS_DEFAULT_LANGUAGE_CODE = "en";

export function resolveLocation(
  code: number | undefined | null,
  known: MarketLocation[] = DFS_VERIFIED_LOCATIONS
): MarketLocation {
  if (!code) return DFS_GLOBAL_SCOPE;
  return (
    known.find((l) => l.code === code) ?? {
      code,
      name: `Location ${code}`,
      countryIso: "",
      scope: "country" as const,
    }
  );
}

export interface DfsLocationRow {
  location_code?: number;
  location_name?: string;
  location_code_parent?: number | null;
  country_iso_code?: string;
  location_type?: string;
}

/**
 * Live location lookup via DataForSEO Labs locations endpoint.
 * Throws DataForSeoError with a safe message when unavailable —
 * callers must render "Data unavailable / reason" instead of fake data.
 */
export async function lookupLocations(query: string): Promise<MarketLocation[]> {
  const rows = await dfsGet<DfsLocationRow[]>(
    `/dataforseo_labs/locations?limit=20&offset=0`
  );
  const q = query.trim().toLowerCase();
  return (rows ?? [])
    .filter((r) => (r.location_name ?? "").toLowerCase().includes(q))
    .slice(0, 20)
    .map((r) => ({
      code: r.location_code ?? 0,
      name: r.location_name ?? `Location ${r.location_code}`,
      countryIso: r.country_iso_code ?? "",
      scope: "country" as const,
    }))
    .filter((l) => l.code > 0);
}

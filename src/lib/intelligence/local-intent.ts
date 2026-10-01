/**
 * TechPivo Intelligence — local-intent classifier (wording heuristic).
 * Explicitly a heuristic: it detects geographic SIGNALS in the query, it does
 * not prove local search behavior. Results render as "heuristic" in admin.
 */

export type LocalScope = "global" | "country" | "regional" | "city" | "non_local";

export interface LocalIntent {
  scope: LocalScope;
  signals: string[];
  heuristic: true;
}

const COUNTRY_WORDS = ["nigeria", "nigerian", "ghana", "kenya", "canada", "india", "australia", "germany", "south africa", "united states", "united kingdom", "uk", "usa", "us ", "lagos", "abuja", "nairobi", "accra", "london", "toronto", "delhi", "mumbai", "johannesburg", "cape town", "sydney", "berlin"];
const CITY_WORDS = ["lagos", "abuja", "port harcourt", "ibadan", "kano", "nairobi", "accra", "kumasi", "london", "manchester", "toronto", "vancouver", "delhi", "mumbai", "bangalore", "johannesburg", "cape town", "sydney", "melbourne", "berlin", "new york"];
const LOCAL_MODIFIERS = ["near me", "in ", "companies", "services", "repair", "bootcamp", "jobs", "hire", "price in", "cost in", "where to buy", "stores", "dealers"];

/** Pure + deterministic (unit-tested). */
export function classifyLocalIntent(keyword: string): LocalIntent {
  const kw = ` ${keyword.toLowerCase()} `;
  const signals: string[] = [];
  for (const c of CITY_WORDS) if (kw.includes(c)) signals.push(`city signal: "${c.trim()}"`);
  if (signals.length > 0) return { scope: "city", signals, heuristic: true };
  for (const c of COUNTRY_WORDS) if (kw.includes(c)) signals.push(`country signal: "${c.trim()}"`);
  if (signals.length > 0) return { scope: "country", signals, heuristic: true };
  for (const m of LOCAL_MODIFIERS) if (kw.includes(m)) signals.push(`local modifier: "${m.trim()}"`);
  if (signals.length > 0) return { scope: "regional", signals, heuristic: true };
  return { scope: "non_local", signals: ["no geographic signal in query wording"], heuristic: true };
}

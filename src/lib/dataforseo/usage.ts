import { createClient } from "@/lib/supabase/admin";
import type { DataForSeoCost } from "./types";

/**
 * Best-effort API spend logging. Never throws — logging must never break
 * the request flow (same pattern as src/lib/audit-log.ts).
 */
export function logDataForSeoUsage(
  feature: string,
  cost: DataForSeoCost,
  meta?: Record<string, unknown>
): void {
  void (async () => {
    try {
      const supabase = createClient();
      await supabase.from("api_usage_logs").insert({
        provider: "dataforseo",
        endpoint: cost.endpoint,
        feature,
        cost_usd: cost.cost ?? 0,
        status_code: cost.statusCode,
        meta: meta ?? {},
      });
    } catch {
      // intentionally silent
    }
  })();
}

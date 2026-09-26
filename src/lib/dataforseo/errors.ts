import type { DataForSeoStatus } from "./types";

/**
 * Server-only DataForSEO error taxonomy.
 * Never includes credentials. Safe to surface `publicMessage` in admin UI.
 */
export class DataForSeoError extends Error {
  readonly status: DataForSeoStatus;
  readonly httpStatus?: number;
  readonly dfsStatusCode?: number;
  readonly retryable: boolean;

  constructor(
    status: DataForSeoStatus,
    publicMessage: string,
    opts?: { httpStatus?: number; dfsStatusCode?: number; retryable?: boolean }
  ) {
    super(publicMessage);
    this.name = "DataForSeoError";
    this.status = status;
    this.httpStatus = opts?.httpStatus;
    this.dfsStatusCode = opts?.dfsStatusCode;
    this.retryable = opts?.retryable ?? false;
  }
}

/** Map a DataForSEO task status_code to our taxonomy. */
export function statusFromDfsCode(code: number | undefined): DataForSeoStatus {
  switch (code) {
    case 20000:
      return "ok";
    case 40101:
    case 40102:
      return "auth_failed";
    case 40200:
    case 40201:
      return "insufficient_credits";
    case 40000:
    case 40400:
      return "bad_request";
    case 42900:
      return "rate_limited";
    case 50000:
    case 50200:
    case 50300:
      return "unavailable";
    default:
      return "unknown";
  }
}

/** Map fetch-level failures (no DFS body) to our taxonomy. */
export function statusFromHttp(httpStatus: number | undefined, timedOut: boolean): DataForSeoStatus {
  if (timedOut) return "timeout";
  if (httpStatus === 401 || httpStatus === 403) return "auth_failed";
  if (httpStatus === 402) return "insufficient_credits";
  if (httpStatus === 429) return "rate_limited";
  if (httpStatus === 400 || httpStatus === 404 || httpStatus === 422) return "bad_request";
  if (typeof httpStatus === "number" && httpStatus >= 500) return "unavailable";
  return "unknown";
}

export function publicMessageFor(status: DataForSeoStatus, detail?: string): string {
  const d = detail ? ` ${detail}`.slice(0, 160) : "";
  switch (status) {
    case "not_configured":
      return "DataForSEO is not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the server environment.";
    case "auth_failed":
      return "DataForSEO authentication failed. Verify DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD.";
    case "rate_limited":
      return "DataForSEO rate limit reached. Wait, then use Refresh Data.";
    case "insufficient_credits":
      return "DataForSEO balance insufficient for this request. Top up, then retry.";
    case "bad_request":
      return `DataForSEO rejected the request.${d}`;
    case "timeout":
      return "DataForSEO request timed out. Retry is available.";
    case "unavailable":
      return "DataForSEO is temporarily unavailable. Cached data (with timestamp) remains visible.";
    default:
      return `DataForSEO request failed.${d}`;
  }
}

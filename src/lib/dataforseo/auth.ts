import { DataForSeoError } from "./errors";

/**
 * Server-only credential access.
 * Reads DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD from the server environment.
 * Never import this module (or anything importing it) from a client component.
 */
export function isDataForSeoConfigured(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

export function assertDataForSeoConfigured(): void {
  if (!isDataForSeoConfigured()) {
    throw new DataForSeoError("not_configured", "DataForSEO is not configured.");
  }
}

/** Build the Basic Authorization header value. Callers must never log it. */
export function dataForSeoAuthHeader(): string {
  assertDataForSeoConfigured();
  const raw = `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

import { dataForSeoAuthHeader, assertDataForSeoConfigured } from "./auth";
import {
  DataForSeoError,
  statusFromDfsCode,
  statusFromHttp,
  publicMessageFor,
} from "./errors";
import type { DataForSeoCost } from "./types";

const BASE_URL = "https://api.dataforseo.com/v3";
const DEFAULT_TIMEOUT_MS = 45000;

export interface DfsTask<T = unknown> {
  id?: string;
  status_code?: number;
  status_message?: string;
  cost?: number;
  result?: T;
  result_count?: number;
  data?: Record<string, unknown>;
}

export interface DfsEnvelope<T = unknown> {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: DfsTask<T>[];
}

export interface DfsCallResult<T> {
  data: T | null;
  cost: DataForSeoCost;
}

/**
 * Central typed DataForSEO caller. Server-only.
 * - Basic auth from env (never logged)
 * - Timeout via AbortController
 * - Maps DFS status codes to taxonomy; throws DataForSeoError (safe message)
 * - Returns cost metadata so routes can log spend without extra calls
 */
export async function dfsPost<T>(
  endpoint: string,
  body: unknown[],
  opts?: { timeoutMs?: number }
): Promise<DfsCallResult<T>> {
  assertDataForSeoConfigured();
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let httpStatus: number | undefined;
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: dataForSeoAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    httpStatus = res.status;
    let envelope: DfsEnvelope<T> | null = null;
    try {
      envelope = (await res.json()) as DfsEnvelope<T>;
    } catch {
      throw new DataForSeoError("unavailable", publicMessageFor("unavailable"), {
        httpStatus,
        retryable: true,
      });
    }
    const task = envelope?.tasks?.[0];
    const dfsCode = task?.status_code ?? envelope?.status_code;
    const cost: DataForSeoCost = {
      endpoint,
      cost: task?.cost ?? envelope?.cost ?? null,
      statusCode: dfsCode ?? null,
    };
    if (dfsCode !== 20000 || !task) {
      const status = statusFromDfsCode(dfsCode);
      throw new DataForSeoError(
        status,
        publicMessageFor(status, task?.status_message ?? envelope?.status_message),
        {
          httpStatus,
          dfsStatusCode: dfsCode,
          retryable: status === "rate_limited" || status === "timeout" || status === "unavailable",
        }
      );
    }
    return { data: (task.result ?? null) as T | null, cost };
  } catch (err) {
    if (err instanceof DataForSeoError) throw err;
    const timedOut =
      err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    const status = statusFromHttp(httpStatus, timedOut);
    throw new DataForSeoError(status, publicMessageFor(status), {
      httpStatus,
      retryable: status === "rate_limited" || status === "timeout" || status === "unavailable",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Lightweight GET helper for metadata endpoints (locations, languages). */
export async function dfsGet<T>(endpoint: string, opts?: { timeoutMs?: number }): Promise<T | null> {
  assertDataForSeoConfigured();
  const timeoutMs = opts?.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: dataForSeoAuthHeader() },
      signal: controller.signal,
    });
    const envelope = (await res.json()) as DfsEnvelope<T>;
    const task = envelope?.tasks?.[0];
    const code = task?.status_code ?? envelope?.status_code;
    if (code !== 20000) {
      const status = statusFromDfsCode(code);
      throw new DataForSeoError(status, publicMessageFor(status, task?.status_message), {
        httpStatus: res.status,
        dfsStatusCode: code,
        retryable: status === "rate_limited" || status === "timeout" || status === "unavailable",
      });
    }
    // Some metadata endpoints return the array directly on the task result,
    // others nest it. Accept both shapes.
    const result = task?.result as T | Array<{ result?: T }> | null;
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object" && result[0] !== null && "result" in (result[0] as object)) {
      return ((result[0] as { result?: T }).result ?? null) as T | null;
    }
    return (result ?? null) as T | null;
  } catch (err) {
    if (err instanceof DataForSeoError) throw err;
    const timedOut = err instanceof Error && err.name === "AbortError";
    const status = statusFromHttp(undefined, timedOut);
    throw new DataForSeoError(status, publicMessageFor(status), { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

/** Lightweight auth/balance probe (GET appendix/user_data). */
export async function dfsUserData(): Promise<{ login: string; money: unknown }> {
  assertDataForSeoConfigured();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${BASE_URL}/appendix/user_data`, {
      headers: { Authorization: dataForSeoAuthHeader() },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      throw new DataForSeoError("auth_failed", publicMessageFor("auth_failed"), {
        httpStatus: res.status,
      });
    }
    const envelope = (await res.json()) as DfsEnvelope<Array<{ login?: string; money?: unknown }>>;
    const task = envelope?.tasks?.[0];
    const code = task?.status_code ?? envelope?.status_code;
    if (code !== 20000) {
      const status = statusFromDfsCode(code);
      throw new DataForSeoError(status, publicMessageFor(status, task?.status_message), {
        httpStatus: res.status,
        dfsStatusCode: code,
      });
    }
    const row = task?.result?.[0] ?? (task?.result as unknown as { login?: string; money?: unknown });
    return { login: String((row as { login?: string })?.login ?? ""), money: (row as { money?: unknown })?.money ?? null };
  } catch (err) {
    if (err instanceof DataForSeoError) throw err;
    const timedOut = err instanceof Error && err.name === "AbortError";
    const status = statusFromHttp(undefined, timedOut);
    throw new DataForSeoError(status, publicMessageFor(status), { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

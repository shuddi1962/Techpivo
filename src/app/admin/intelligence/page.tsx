"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

/**
 * Admin → Intelligence (Phase 1): connection status + live keyword/SERP
 * probes. Renders real API data only — never fake metrics. Every value
 * shows source + timestamp, or "Data unavailable / reason".
 */

type ConnState =
  | { kind: "loading" }
  | { kind: "not_configured"; message: string }
  | { kind: "pass"; login: string; money: unknown }
  | { kind: "fail"; reason: string; message: string; retryable: boolean };

interface Suggestion {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competitionLevel: string | null;
  keywordDifficulty: number | null;
  fetchedAt: string;
}

export default function IntelligencePage() {
  const [conn, setConn] = useState<ConnState>({ kind: "loading" });
  const [seed, setSeed] = useState("AI coding tools");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [kwMeta, setKwMeta] = useState<string | null>(null);
  const [kwError, setKwError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setConn({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/intelligence/dataforseo/test");
      const data = await res.json();
      if (data.status === "PASS") setConn({ kind: "pass", login: data.login, money: data.money });
      else if (data.status === "NOT_CONFIGURED")
        setConn({ kind: "not_configured", message: data.message });
      else setConn({ kind: "fail", reason: data.reason ?? "unknown", message: data.message ?? "Probe failed.", retryable: data.retryable ?? false });
    } catch {
      setConn({ kind: "fail", reason: "unknown", message: "Probe request failed.", retryable: true });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  async function runKeywords() {
    setBusy(true);
    setKwError(null);
    setSuggestions(null);
    setKwMeta(null);
    try {
      const res = await fetch("/api/admin/intelligence/dataforseo/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: seed.trim(), locationCode: 2840, languageCode: "en", limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKwError(data.error ?? "Keyword lookup failed.");
        return;
      }
      setSuggestions(data.suggestions ?? []);
      const first = (data.suggestions ?? [])[0] as Suggestion | undefined;
      setKwMeta(
        `${data.totalCount ?? 0} ideas · ${data.location?.name ?? ""} · source: dataforseo · ${first?.fetchedAt ? new Date(first.fetchedAt).toLocaleString() : "just now"}`
      );
    } catch {
      setKwError("Keyword lookup failed (network).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">TechPivo Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Data-driven demand → SERP → gap → research. Live DataForSEO data only.
          </p>
        </div>
        <button
          onClick={() => void check()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" /> Refresh status
        </button>
      </div>

      {conn.kind === "loading" && <p className="text-sm">Checking DataForSEO connection…</p>}

      {conn.kind === "not_configured" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
          <div>
            <p className="font-semibold">DataForSEO: NOT CONFIGURED</p>
            <p className="text-muted-foreground">{conn.message}</p>
            <p className="mt-1 text-muted-foreground">
              Vercel → Project → Settings → Environment Variables (Production): DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD. Local: .env.local (gitignored).
            </p>
          </div>
        </div>
      )}

      {conn.kind === "pass" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
          <div>
            <p className="font-semibold">DataForSEO: CONNECTED (live)</p>
            <p className="text-muted-foreground">Account: {conn.login}</p>
          </div>
        </div>
      )}

      {conn.kind === "fail" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
          <div>
            <p className="font-semibold">DataForSEO: FAILED ({conn.reason})</p>
            <p className="text-muted-foreground">{conn.message}</p>
            {conn.retryable && (
              <button onClick={() => void check()} className="mt-2 rounded-lg border px-3 py-1.5">
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Keyword discovery (live)</h2>
        <p className="text-sm text-muted-foreground">Seed + United States / English. Real suggestions with volume, CPC, difficulty.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Seed keyword, e.g. AI coding tools"
          />
          <button
            onClick={() => void runKeywords()}
            disabled={busy || seed.trim().length < 2}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Run"}
          </button>
        </div>
        {kwError && <p className="mt-3 text-sm text-red-600">Data unavailable: {kwError}</p>}
        {kwMeta && <p className="mt-3 text-xs text-muted-foreground">{kwMeta}</p>}
        {suggestions && suggestions.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No suggestions returned for this seed/market.</p>
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Keyword</th>
                  <th className="py-2 pr-3">Volume</th>
                  <th className="py-2 pr-3">CPC</th>
                  <th className="py-2 pr-3">Competition</th>
                  <th className="py-2">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s.keyword} className="border-t">
                    <td className="py-2 pr-3">{s.keyword}</td>
                    <td className="py-2 pr-3">{s.searchVolume ?? "—"}</td>
                    <td className="py-2 pr-3">{s.cpc ?? "—"}</td>
                    <td className="py-2 pr-3">{s.competitionLevel ?? "—"}</td>
                    <td className="py-2">{s.keywordDifficulty ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

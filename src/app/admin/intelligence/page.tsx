"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ORIGINALITY_EVIDENCE_TYPES } from "@/lib/intelligence/originality";

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

interface Opportunity {
  id: string;
  primary_keyword: string;
  category: string | null;
  intent: string | null;
  search_volume: number | null;
  score: number;
  existing_coverage: string;
  status: string;
  created_at: string;
}

const MARKETS = [
  { code: 2840, name: "United States" },
  { code: 2826, name: "United Kingdom" },
];

const OPP_STATUSES = ["discovered", "ready_for_research", "researching", "published", "rejected"];

export default function IntelligencePage() {
  const [conn, setConn] = useState<ConnState>({ kind: "loading" });
  const [seed, setSeed] = useState("AI coding tools");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [kwMeta, setKwMeta] = useState<string | null>(null);
  const [kwError, setKwError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oppKeyword, setOppKeyword] = useState("best AI coding tools");
  const [oppMarket, setOppMarket] = useState(2840);
  const [analyzing, setAnalyzing] = useState(false);
  const [oppWhy, setOppWhy] = useState<string[] | null>(null);
  const [oppError, setOppError] = useState<string | null>(null);
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [oppFilter, setOppFilter] = useState("");
  // Growth modules (trends / gaps / competitors / originality+briefs)
  const [trendKw, setTrendKw] = useState("AI coding tools");
  const [trend, setTrend] = useState<{ direction: string; changePct: number | null; evidence: string[]; points: number } | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Array<{ keyword: string; latest_volume: number | null; snapshots: number; last_measured: string }> | null>(null);
  const [gapOppId, setGapOppId] = useState("");
  const [gapMsg, setGapMsg] = useState<string | null>(null);
  const [gaps, setGaps] = useState<Array<{ id: string; keyword: string; gap_type: string; observation: string; inference: string | null; priority: number; status: string }> | null>(null);
  const [compDomain, setCompDomain] = useState("");
  const [competitors, setCompetitors] = useState<Array<{ id: string; domain: string; name: string | null; is_active: boolean; last_checked: string | null; observation: { checks?: Array<{ topic: string; coverage: string; conclusion: string }> } | null }> | null>(null);
  const [compTopic, setCompTopic] = useState<{ [id: string]: string }>({});
  const [compMsg, setCompMsg] = useState<string | null>(null);
  const [origOppId, setOrigOppId] = useState("");
  const [origEvidence, setOrigEvidence] = useState<string[]>([]);
  const [origResult, setOrigResult] = useState<{ verdict: string; score: number; recommendations: string[] } | null>(null);
  const [briefMsg, setBriefMsg] = useState<string | null>(null);

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

  const loadOpps = useCallback(async (status: string) => {
    try {
      const res = await fetch(
        `/api/admin/intelligence/opportunities?limit=20${status ? `&status=${status}` : ""}`
      );
      const data = await res.json();
      if (res.ok) setOpps(data.opportunities ?? []);
    } catch {
      /* table stays empty with note below */
    }
  }, []);

  useEffect(() => {
    void loadOpps(oppFilter);
  }, [loadOpps, oppFilter]);

  async function runAnalyze() {
    setAnalyzing(true);
    setOppError(null);
    setOppWhy(null);
    try {
      const res = await fetch("/api/admin/intelligence/opportunities/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: oppKeyword.trim(), locationCode: oppMarket, languageCode: "en" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOppError(data.error ?? "Analysis failed.");
        return;
      }
      setOppWhy([`Priority ${data.score ?? 0}/100 (internal, not a ranking claim)`, ...(data.why ?? [])]);
      void loadOpps(oppFilter);
    } catch {
      setOppError("Analysis failed (network).");
    } finally {
      setAnalyzing(false);
    }
  }

  async function setOppStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/intelligence/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) void loadOpps(oppFilter);
    } catch {
      /* silent */
    }
  }

  async function loadTracked() {
    try {
      const res = await fetch("/api/admin/intelligence/trends");
      const data = await res.json();
      if (res.ok) setTracked(data.tracked ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { void loadTracked(); }, []);

  async function runTrend() {
    setTrendError(null);
    setTrend(null);
    try {
      const res = await fetch(`/api/admin/intelligence/trends?keyword=${encodeURIComponent(trendKw.trim())}&locationCode=2840&languageCode=en`);
      const data = await res.json();
      if (!res.ok) { setTrendError(data.error ?? "Trend lookup failed."); return; }
      setTrend(data);
      void loadTracked();
    } catch { setTrendError("Trend lookup failed (network)."); }
  }

  async function loadGaps() {
    try {
      const res = await fetch("/api/admin/intelligence/gaps?limit=20");
      const data = await res.json();
      if (res.ok) setGaps(data.gaps ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { void loadGaps(); }, []);

  async function runGapAnalyze() {
    setGapMsg(null);
    if (!gapOppId) { setGapMsg("Pick an opportunity from the queue first."); return; }
    try {
      const res = await fetch("/api/admin/intelligence/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: gapOppId }),
      });
      const data = await res.json();
      if (!res.ok) { setGapMsg(data.error ?? "Gap analysis failed."); return; }
      setGapMsg(`Stored ${(data.findings ?? []).length} gap finding(s) — observations separated from inferences.`);
      void loadGaps();
    } catch { setGapMsg("Gap analysis failed (network)."); }
  }

  async function loadCompetitors() {
    try {
      const res = await fetch("/api/admin/intelligence/competitors");
      const data = await res.json();
      if (res.ok) setCompetitors(data.competitors ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { void loadCompetitors(); }, []);

  async function addCompetitor() {
    setCompMsg(null);
    try {
      const res = await fetch("/api/admin/intelligence/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: compDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCompMsg(data.error ?? "Add failed."); return; }
      setCompDomain("");
      void loadCompetitors();
    } catch { setCompMsg("Add failed (network)."); }
  }

  async function toggleCompetitor(id: string, is_active: boolean) {
    try {
      const res = await fetch("/api/admin/intelligence/competitors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active }),
      });
      if (res.ok) void loadCompetitors();
    } catch { /* silent */ }
  }

  async function runCompCheck(id: string) {
    setCompMsg(null);
    const topic = (compTopic[id] ?? "").trim();
    if (topic.length < 2) { setCompMsg("Type a topic the competitor covers first."); return; }
    try {
      const res = await fetch("/api/admin/intelligence/competitors/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, topic }),
      });
      const data = await res.json();
      if (!res.ok) { setCompMsg(data.error ?? "Check failed."); return; }
      setCompMsg(data.check?.conclusion ?? "Checked.");
      void loadCompetitors();
    } catch { setCompMsg("Check failed (network)."); }
  }

  async function runOriginality() {
    setOrigResult(null);
    setBriefMsg(null);
    if (!origOppId) { setBriefMsg("Pick an opportunity from the queue first."); return; }
    try {
      const res = await fetch("/api/admin/intelligence/opportunities/originality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: origOppId, evidence: origEvidence }),
      });
      const data = await res.json();
      if (!res.ok) { setBriefMsg(data.error ?? "Assessment failed."); return; }
      setOrigResult({ verdict: data.assessment.verdict, score: data.assessment.score, recommendations: data.assessment.recommendations });
    } catch { setBriefMsg("Assessment failed (network)."); }
  }

  async function runBrief(overrideOriginality: boolean) {
    setBriefMsg(null);
    if (!origOppId) { setBriefMsg("Pick an opportunity from the queue first."); return; }
    try {
      const res = await fetch("/api/admin/intelligence/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: origOppId, overrideOriginality }),
      });
      const data = await res.json();
      if (!res.ok) { setBriefMsg(data.error ?? "Brief generation failed."); return; }
      setBriefMsg(`Brief ${data.brief?.id?.slice(0, 8)}… saved (evidence-only, editor review mandatory). Opportunity → brief_ready.`);
      void loadOpps(oppFilter);
    } catch { setBriefMsg("Brief generation failed (network)."); }
  }
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

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Opportunity engine</h2>
        <p className="text-sm text-muted-foreground">
          Demand → live SERP → TechPivo coverage → explainable internal priority (not a ranking claim).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={oppKeyword}
            onChange={(e) => setOppKeyword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Keyword to analyze"
          />
          <select
            value={oppMarket}
            onChange={(e) => setOppMarket(Number(e.target.value))}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {MARKETS.map((m) => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={() => void runAnalyze()}
            disabled={analyzing || oppKeyword.trim().length < 2}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        {oppError && <p className="mt-3 text-sm text-red-600">Data unavailable: {oppError}</p>}
        {oppWhy && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {oppWhy.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Queue</h3>
          <select
            value={oppFilter}
            onChange={(e) => setOppFilter(e.target.value)}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            {OPP_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {opps && opps.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No opportunities yet — analyze a keyword above.</p>
        )}
        {opps && opps.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Keyword</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Coverage</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Move to</th>
                </tr>
              </thead>
              <tbody>
                {opps.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="py-2 pr-3">{o.primary_keyword}</td>
                    <td className="py-2 pr-3 font-semibold">{o.score}/100</td>
                    <td className="py-2 pr-3">{o.existing_coverage}</td>
                    <td className="py-2 pr-3">{o.status}</td>
                    <td className="py-2">
                      <select
                        value=""
                        onChange={(e) => e.target.value && void setOppStatus(o.id, e.target.value)}
                        className="rounded-lg border px-2 py-1 text-xs"
                      >
                        <option value="">Select…</option>
                        {OPP_STATUSES.filter((s) => s !== o.status).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Trend detection (measured movement)</h2>
        <p className="text-sm text-muted-foreground">Trending = movement between stored snapshots (≥2 measurements). Never a single high volume.</p>
        <div className="mt-3 flex gap-2">
          <input value={trendKw} onChange={(e) => setTrendKw(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Keyword" />
          <button onClick={() => void runTrend()} disabled={trendKw.trim().length < 2} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50">Check trend</button>
        </div>
        {trendError && <p className="mt-3 text-sm text-red-600">Data unavailable: {trendError}</p>}
        {trend && (
          <div className="mt-3 text-sm">
            <p className="font-semibold">Direction: {trend.direction}{trend.changePct !== null ? ` (${trend.changePct >= 0 ? "+" : ""}${trend.changePct}%)` : ""} · {trend.points} snapshot(s)</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{trend.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        {tracked && tracked.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Tracked keyword</th><th className="py-2 pr-3">Latest vol</th><th className="py-2 pr-3">Snapshots</th><th className="py-2">Last measured</th></tr></thead>
              <tbody>{tracked.slice(0, 10).map((t) => (
                <tr key={`${t.keyword}`} className="border-t">
                  <td className="py-2 pr-3"><button className="underline" onClick={() => { setTrendKw(t.keyword); }}>{t.keyword}</button></td>
                  <td className="py-2 pr-3">{t.latest_volume ?? "—"}</td>
                  <td className="py-2 pr-3">{t.snapshots}</td>
                  <td className="py-2">{new Date(t.last_measured).toLocaleString()}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">SERP gap analyzer</h2>
        <p className="text-sm text-muted-foreground">Runs over the opportunity&apos;s stored SERP (no new API spend). Observations are data; inferences are labeled hypotheses.</p>
        <div className="mt-3 flex gap-2">
          <select value={gapOppId} onChange={(e) => setGapOppId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Select opportunity…</option>{(opps ?? []).map((o) => <option key={o.id} value={o.id}>{o.primary_keyword} ({o.score})</option>)}
          </select>
          <button onClick={() => void runGapAnalyze()} disabled={!gapOppId} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50">Analyze gaps</button>
        </div>
        {gapMsg && <p className="mt-3 text-sm text-muted-foreground">{gapMsg}</p>}
        {gaps && gaps.length > 0 && (
          <div className="mt-3 space-y-2">{gaps.slice(0, 8).map((g) => (
            <div key={g.id} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{g.keyword} · {g.gap_type} · priority {g.priority}/10 · {g.status}</p>
              <p className="mt-1"><span className="font-medium">Observed:</span> {g.observation}</p>
              {g.inference && <p className="mt-1 text-muted-foreground"><span className="font-medium">Hypothesis:</span> {g.inference}</p>}
            </div>))}</div>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Competitor gaps</h2>
        <p className="text-sm text-muted-foreground">You configure the domains. Gap checks compare a topic against TechPivo&apos;s own coverage — DataForSEO domain-keyword endpoints are not integrated.</p>
        <div className="mt-3 flex gap-2">
          <input value={compDomain} onChange={(e) => setCompDomain(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="example.com" />
          <button onClick={() => void addCompetitor()} disabled={compDomain.trim().length < 4} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50">Track</button>
        </div>
        {compMsg && <p className="mt-3 text-sm text-muted-foreground">{compMsg}</p>}
        {competitors && competitors.length > 0 && (
          <div className="mt-3 space-y-2">{competitors.map((c) => (
            <div key={c.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{c.domain}</p>
                <span className="text-xs text-muted-foreground">{c.is_active ? "active" : "paused"}{c.last_checked ? ` · checked ${new Date(c.last_checked).toLocaleString()}` : ""}</span>
                <button onClick={() => void toggleCompetitor(c.id, !c.is_active)} className="ml-auto rounded-lg border px-2 py-1 text-xs">{c.is_active ? "Pause" : "Activate"}</button>
              </div>
              <div className="mt-2 flex gap-2">
                <input value={compTopic[c.id] ?? ""} onChange={(e) => setCompTopic((p) => ({ ...p, [c.id]: e.target.value }))} className="w-full rounded-lg border px-3 py-1.5 text-sm" placeholder="Topic they cover, e.g. best budget laptops" />
                <button onClick={() => void runCompCheck(c.id)} className="rounded-lg border px-3 py-1.5 text-sm">Gap-check</button>
              </div>
              {c.observation?.checks?.[0] && <p className="mt-2 text-muted-foreground">{c.observation.checks[0].conclusion}</p>}
            </div>))}</div>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Originality gate + editorial brief</h2>
        <p className="text-sm text-muted-foreground">Rewrite-only plans are rejected. The brief assembles stored evidence only — every number cites its source.</p>
        <div className="mt-3 flex gap-2">
          <select value={origOppId} onChange={(e) => setOrigOppId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Select opportunity…</option>{(opps ?? []).map((o) => <option key={o.id} value={o.id}>{o.primary_keyword} ({o.score})</option>)}
          </select>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ORIGINALITY_EVIDENCE_TYPES.map((e) => (
            <label key={e.type} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={origEvidence.includes(e.type)} onChange={() => setOrigEvidence((p) => p.includes(e.type) ? p.filter((x) => x !== e.type) : [...p, e.type])} />
              {e.label}
            </label>))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void runOriginality()} disabled={!origOppId} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50">Assess originality</button>
          <button onClick={() => void runBrief(false)} disabled={!origOppId} className="rounded-lg border px-4 py-2 text-sm">Generate brief</button>
          <button onClick={() => void runBrief(true)} disabled={!origOppId} className="rounded-lg border px-4 py-2 text-sm text-amber-700">Generate with override (logged)</button>
        </div>
        {origResult && (
          <div className="mt-3 text-sm">
            <p className="font-semibold">Verdict: {origResult.verdict} ({origResult.score}/100)</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{origResult.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        )}
        {briefMsg && <p className="mt-3 text-sm text-muted-foreground">{briefMsg}</p>}
      </div>
    </div>
  );
}

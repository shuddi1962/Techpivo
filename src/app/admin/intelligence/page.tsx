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
  { code: 2566, name: "Nigeria" },
  { code: 2124, name: "Canada" },
  { code: 2356, name: "India" },
  { code: 2710, name: "South Africa" },
  { code: 2036, name: "Australia" },
  { code: 2276, name: "Germany" },
  { code: 2288, name: "Ghana" },
  { code: 2404, name: "Kenya" },
];

const OPP_STATUSES = ["discovered", "analyzing", "ready_for_research", "researching", "brief_ready", "drafting", "editor_review", "ready_to_publish", "published", "update_required", "rejected", "archived"];

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
  // Command-center modules
  const [daily, setDaily] = useState<Array<{ rank: number; title: string; why: string; sources: string[]; action: string }> | null>(null);
  const [dailyNote, setDailyNote] = useState<string | null>(null);
  const [discCategory, setDiscCategory] = useState("AI & Automation");
  const [discMarkets, setDiscMarkets] = useState<number[]>([2840, 2566]);
  const [discDepth, setDiscDepth] = useState("standard");
  const [discMsg, setDiscMsg] = useState<string | null>(null);
  const [discBusy, setDiscBusy] = useState(false);
  const [discRuns, setDiscRuns] = useState<Array<{ id: string; category: string; markets: number[]; depth: string; stats: { keywords_found?: number; opportunities_created?: number }; status: string; cost_usd: number; created_at: string }> | null>(null);
  const [cmpKeyword, setCmpKeyword] = useState("AI coding tools");
  const [cmpMarkets, setCmpMarkets] = useState<number[]>([2840, 2826, 2566]);
  const [cmpRows, setCmpRows] = useState<Array<{ market: number; market_name: string; search_volume: number | null; trend_monthly: number | null; trend_yearly: number | null; cpc: number | null; competition: number | null; difficulty: number | null; error?: string }> | null>(null);
  const [cmpMsg, setCmpMsg] = useState<string | null>(null);
  const [detailId, setDetailId] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [aiKw, setAiKw] = useState("AI coding tools");
  const [aiVols, setAiVols] = useState<Array<{ keyword: string; aiSearchVolume: number | null }> | null>(null);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [llm, setLlm] = useState<{ mentions: number; ai_search_volume: number; by_platform: Array<{ platform: string; mentions: number }>; top_source_domains: Array<{ domain: string; mentions: number }> } | null>(null);
  const [commSignals, setCommSignals] = useState<Array<{ kind: string; topic: string; count: number; evidence: string }> | null>(null);
  const [cann, setCann] = useState<Array<{ titles: string[]; slugs: string[]; recommendation: string }> | null>(null);
  const [scStatus, setScStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [briefs, setBriefs] = useState<Array<{ id: string; topic: string; status: string; opportunity_score: number }> | null>(null);
  const [wsBriefId, setWsBriefId] = useState("");
  const [wsQuestion, setWsQuestion] = useState("");
  const [wsMethod, setWsMethod] = useState("");
  const [wsMsg, setWsMsg] = useState<string | null>(null);

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
      void loadBriefs();
    } catch { setBriefMsg("Brief generation failed (network)."); }
  }

  async function loadDaily() {
    try {
      const res = await fetch("/api/admin/intelligence/daily");
      const data = await res.json();
      if (res.ok) { setDaily(data.recommendations ?? []); setDailyNote(data.note ?? null); }
    } catch { /* silent */ }
  }

  useEffect(() => { void loadDaily(); }, []);

  async function loadDiscRuns() {
    try {
      const res = await fetch("/api/admin/intelligence/discovery?limit=10");
      const data = await res.json();
      if (res.ok) setDiscRuns(data.runs ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { void loadDiscRuns(); }, []);

  async function runDiscovery() {
    setDiscMsg(null);
    setDiscBusy(true);
    try {
      const res = await fetch("/api/admin/intelligence/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: discCategory.trim(), markets: discMarkets, languageCode: "en", depth: discDepth }),
      });
      const data = await res.json();
      if (!res.ok) { setDiscMsg(data.error ?? "Discovery failed."); return; }
      setDiscMsg(`Run complete: ${data.stats.keywords_found} keywords, ${data.stats.opportunities_created} new opportunities (${data.stats.opportunities_skipped} already tracked). Cost $${data.cost_usd}.`);
      void loadDiscRuns();
      void loadOpps(oppFilter);
      void loadTracked();
    } catch { setDiscMsg("Discovery failed (network)."); }
    finally { setDiscBusy(false); }
  }

  async function runCompare() {
    setCmpMsg(null);
    setCmpRows(null);
    try {
      const res = await fetch("/api/admin/intelligence/markets/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: cmpKeyword.trim(), markets: cmpMarkets, languageCode: "en" }),
      });
      const data = await res.json();
      if (!res.ok) { setCmpMsg(data.error ?? "Comparison failed."); return; }
      setCmpRows(data.markets ?? []);
      setCmpMsg(`Compared across ${data.markets?.length ?? 0} markets · total API cost $${data.total_cost_usd ?? 0} · snapshots stored for trend history.`);
    } catch { setCmpMsg("Comparison failed (network)."); }
  }

  async function loadDetail(id: string) {
    setDetail(null);
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/intelligence/opportunities/${id}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch { /* silent */ }
  }

  async function runAiVolume() {
    setAiMsg(null);
    setAiVols(null);
    try {
      const kws = aiKw.split(",").map((k) => k.trim()).filter((k) => k.length >= 2).slice(0, 5);
      const res = await fetch("/api/admin/intelligence/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: kws, locationCode: 2840 }),
      });
      const data = await res.json();
      if (!res.ok) { setAiMsg(data.error ?? "AI volume lookup failed."); return; }
      setAiVols(data.volumes ?? []);
      setAiMsg(`AI demand measured · cost $${data.cost_usd ?? 0} · merged into snapshot history.`);
    } catch { setAiMsg("AI volume lookup failed (network)."); }
  }

  async function runLlmCheck() {
    setAiMsg(null);
    try {
      const res = await fetch("/api/admin/intelligence/ai-search?domain=techpivo.com");
      const data = await res.json();
      if (!res.ok) { setAiMsg(data.error ?? "LLM check failed."); return; }
      setLlm(data);
      setAiMsg(`LLM visibility checked (~$${data.cost_usd ?? 0.1}).`);
    } catch { setAiMsg("LLM check failed (network)."); }
  }

  async function loadCommunity() {
    try {
      const res = await fetch("/api/admin/intelligence/community");
      const data = await res.json();
      if (res.ok) setCommSignals(data.signals ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { void loadCommunity(); }, []);

  async function loadCannibalization() {
    try {
      const res = await fetch("/api/admin/intelligence/cannibalization");
      const data = await res.json();
      if (res.ok) setCann(data.clusters ?? []);
    } catch { /* silent */ }
  }

  async function loadSearchConsole() {
    try {
      const res = await fetch("/api/admin/intelligence/search-console");
      const data = await res.json();
      if (res.ok) setScStatus({ connected: data.connected, message: data.message });
    } catch { /* silent */ }
  }

  useEffect(() => { void loadSearchConsole(); }, []);

  async function loadBriefs() {
    try {
      const res = await fetch("/api/admin/intelligence/briefs?limit=10");
      const data = await res.json();
      if (res.ok) setBriefs(data.briefs ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { void loadBriefs(); }, []);

  async function runCompRefresh(id: string) {
    setCompMsg(null);
    try {
      const res = await fetch("/api/admin/intelligence/competitors/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, locationCode: 2840, limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) { setCompMsg(data.error ?? "Refresh failed."); return; }
      setCompMsg(`${data.refresh.gaps.length} competitor gap(s) from ${data.refresh.keywords_checked} ranked keywords · cost $${data.refresh.cost_usd}. Gaps stored in Content Gaps.`);
      void loadCompetitors();
      void loadGaps();
    } catch { setCompMsg("Refresh failed (network)."); }
  }

  async function saveWorkspace() {
    setWsMsg(null);
    if (!wsBriefId) { setWsMsg("Pick a brief first."); return; }
    try {
      const res = await fetch("/api/admin/intelligence/briefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wsBriefId, workspace: { research_question: wsQuestion, methodology: wsMethod } }),
      });
      const data = await res.json();
      if (!res.ok) { setWsMsg(data.error ?? "Save failed."); return; }
      setWsMsg("Research workspace saved on the brief.");
    } catch { setWsMsg("Save failed (network)."); }
  }

  async function genSocial() {
    setWsMsg(null);
    if (!wsBriefId) { setWsMsg("Pick a brief first."); return; }
    try {
      const res = await fetch("/api/admin/intelligence/briefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wsBriefId, generate_social: true }),
      });
      const data = await res.json();
      if (!res.ok) { setWsMsg(data.error ?? "Draft generation failed."); return; }
      const d = data.social_drafts;
      setWsMsg(d ? `Drafts ready — hook: "${String(d.hook).slice(0, 90)}…" (drafts only, never auto-posted)` : "Drafts saved.");
    } catch { setWsMsg("Draft generation failed (network)."); }
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

      <nav className="flex flex-wrap gap-2 text-xs">
        {[["daily", "Today"], ["discover", "Discover"], ["opps", "Opportunities"], ["detail", "Detail"], ["trends", "Trends"], ["markets", "Markets"], ["gaps", "SERP Gaps"], ["competitors", "Competitors"], ["aisearch", "AI Search"], ["community", "Community"], ["health", "Health"], ["research", "Research"]].map(([id, label]) => (
          <a key={id} href={`#intel-${id}`} className="rounded-full border px-3 py-1 text-muted-foreground hover:text-foreground">{label}</a>
        ))}
      </nav>

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

      <div id="intel-daily" className="rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">What should TechPivo do today?</h2>
          <button onClick={() => void loadDaily()} className="ml-auto rounded-lg border px-2 py-1 text-xs">Refresh</button>
        </div>
        <p className="text-sm text-muted-foreground">Ranked recommendations from stored signals only — each shows why + data sources.</p>
        {dailyNote && <p className="mt-2 text-sm text-muted-foreground">{dailyNote}</p>}
        {daily && daily.length > 0 && (
          <ol className="mt-3 space-y-2">{daily.map((d) => (
            <li key={d.rank} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{d.rank}. {d.title}</p>
              <p className="mt-1 text-muted-foreground">{d.why}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sources: {d.sources.join(", ")} · Next: {d.action}</p>
            </li>))}</ol>
        )}
      </div>

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

      <div id="intel-discover" className="rounded-xl border p-4">
        <h2 className="font-semibold">Category discovery engine</h2>
        <p className="text-sm text-muted-foreground">Seeds come from TechPivo&apos;s own posts, tools, community and tracked keywords — then fan out to DataForSEO suggestions across markets (capped spend, recorded per run).</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={discCategory} onChange={(e) => setDiscCategory(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Category, e.g. AI & Automation" />
          <select value={discDepth} onChange={(e) => setDiscDepth(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="broad">Broad (4 seeds × 2 markets)</option>
            <option value="standard">Standard (6 × 3)</option>
            <option value="deep">Deep (10 × 4)</option>
          </select>
          <button onClick={() => void runDiscovery()} disabled={discBusy || discCategory.trim().length < 2 || discMarkets.length === 0} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50">{discBusy ? "Discovering…" : "Run discovery"}</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {MARKETS.map((m) => (
            <label key={m.code} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
              <input type="checkbox" checked={discMarkets.includes(m.code)} onChange={() => setDiscMarkets((p) => p.includes(m.code) ? p.filter((x) => x !== m.code) : [...p, m.code].slice(0, 4))} />
              {m.name}
            </label>))}
        </div>
        {discMsg && <p className="mt-3 text-sm text-muted-foreground">{discMsg}</p>}
        {discRuns && discRuns.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Run</th><th className="py-2 pr-3">Keywords</th><th className="py-2 pr-3">New opps</th><th className="py-2 pr-3">Cost</th><th className="py-2">When</th></tr></thead>
              <tbody>{discRuns.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">{r.category} · {r.depth} · {r.status}</td>
                  <td className="py-2 pr-3">{r.stats?.keywords_found ?? "—"}</td>
                  <td className="py-2 pr-3">{r.stats?.opportunities_created ?? "—"}</td>
                  <td className="py-2 pr-3">${r.cost_usd ?? 0}</td>
                  <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div id="intel-opps" className="rounded-xl border p-4">
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
      <div id="intel-detail" className="rounded-xl border p-4">
        <h2 className="font-semibold">Opportunity detail report</h2>
        <p className="text-sm text-muted-foreground">Demand + snapshots + SERP + gaps + coverage + community + tools + originality + briefs — assembled from stored rows, zero API spend.</p>
        <div className="mt-3 flex gap-2">
          <select value={detailId} onChange={(e) => { setDetailId(e.target.value); void loadDetail(e.target.value); }} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Select opportunity…</option>{(opps ?? []).map((o) => <option key={o.id} value={o.id}>{o.primary_keyword} ({o.score})</option>)}
          </select>
        </div>
        {detail && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-semibold">{detail.opportunity.keyword} · Priority {detail.opportunity.score}/100 · {detail.opportunity.status}</p>
              <p className="text-muted-foreground">Intent: {detail.opportunity.intent ?? "—"} · Types: {(detail.opportunity.types ?? []).join(", ") || "—"} · Market: {detail.opportunity.location_code}</p>
              <p className="mt-1 text-muted-foreground">Volume: {detail.demand.search_volume ?? "—"} · Difficulty: {detail.demand.difficulty ?? "—"} · Snapshots: {(detail.demand.snapshots ?? []).length} (source: {detail.demand.metrics_source})</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">SERP ({(detail.serp.top_results ?? []).length} stored results{(detail.serp.serp_fetched_at ? `, captured ${new Date(detail.serp.serp_fetched_at).toLocaleString()}` : "")})</p>
              {(detail.serp.top_results ?? []).slice(0, 5).map((r: any, i: number) => (
                <p key={i} className="mt-1 text-muted-foreground">#{r.position} {r.domain} — {(r.title ?? "").slice(0, 80)}</p>))}
              <p className="mt-1 text-muted-foreground">Features: {((detail.serp.features ?? []) as string[]).join(", ") || "—"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">TechPivo coverage: {detail.coverage.level}</p>
              {((detail.coverage.matches ?? []) as Array<{ title: string; ref: string }>).slice(0, 3).map((m, i: number) => (
                <p key={i} className="text-muted-foreground">{m.title} ({m.ref})</p>))}
              <p className="mt-1 font-semibold">Gaps ({(detail.gaps ?? []).length})</p>
              {(detail.gaps ?? []).slice(0, 3).map((g: any, i: number) => (
                <p key={i} className="text-muted-foreground">[{g.gap_type}] {g.observation}</p>))}
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Community matches ({(detail.community.matches ?? []).length}) · Tool matches ({(detail.tools.matches ?? []).length})</p>
              {detail.community.note && <p className="text-muted-foreground">{detail.community.note}</p>}
              {((detail.community.matches ?? []) as Array<{ title: string; votes: number }>).slice(0, 3).map((c, i: number) => (
                <p key={i} className="text-muted-foreground">{c.title} ({c.votes} votes)</p>))}
              {((detail.tools.matches ?? []) as Array<{ name: string; slug: string }>).map((t) => (
                <p key={t.slug} className="text-muted-foreground">Tool: {t.name} (/tools/{t.slug})</p>))}
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Originality: {(detail.originality as any)?.verdict ?? "not_assessed"} · Briefs: {(detail.briefs ?? []).length}</p>
              <p className="text-muted-foreground">Score components: {Object.entries((detail.score_breakdown ?? {}) as Record<string, unknown>).filter(([k]) => k !== "why").map(([k, v]) => `${k}=${typeof v === "object" ? "…" : String(v)}`).join(" · ")}</p>
            </div>
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

      <div id="intel-markets" className="rounded-xl border p-4">
        <h2 className="font-semibold">Global market comparison</h2>
        <p className="text-sm text-muted-foreground">One live overview call per market (paid, max 6). Each measurement is stored as a snapshot for trend history.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={cmpKeyword} onChange={(e) => setCmpKeyword(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Keyword to compare" />
          <button onClick={() => void runCompare()} disabled={cmpKeyword.trim().length < 2 || cmpMarkets.length < 2} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50">Compare</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {MARKETS.map((m) => (
            <label key={m.code} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
              <input type="checkbox" checked={cmpMarkets.includes(m.code)} onChange={() => setCmpMarkets((p) => p.includes(m.code) ? p.filter((x) => x !== m.code) : [...p, m.code].slice(0, 6))} />
              {m.name}
            </label>))}
        </div>
        {cmpMsg && <p className="mt-3 text-sm text-muted-foreground">{cmpMsg}</p>}
        {cmpRows && cmpRows.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Market</th><th className="py-2 pr-3">Volume</th><th className="py-2 pr-3">MoM</th><th className="py-2 pr-3">YoY</th><th className="py-2 pr-3">CPC</th><th className="py-2 pr-3">Difficulty</th><th className="py-2">Note</th></tr></thead>
              <tbody>{cmpRows.map((r) => (
                <tr key={r.market} className="border-t">
                  <td className="py-2 pr-3">{r.market_name}</td>
                  <td className="py-2 pr-3">{r.search_volume ?? "—"}</td>
                  <td className="py-2 pr-3">{r.trend_monthly ?? "—"}</td>
                  <td className="py-2 pr-3">{r.trend_yearly ?? "—"}</td>
                  <td className="py-2 pr-3">{r.cpc ?? "—"}</td>
                  <td className="py-2 pr-3">{r.difficulty ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{r.error ?? "source: dataforseo"}</td>
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

      <div id="intel-competitors" className="rounded-xl border p-4">
        <h2 className="font-semibold">Competitor gaps</h2>
        <p className="text-sm text-muted-foreground">Refresh pulls real ranked keywords via DataForSEO Labs (~$0.013) and stores genuine competitor gaps. Gap-check compares a topic against TechPivo&apos;s own coverage.</p>
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
                <button onClick={() => void runCompRefresh(c.id)} className="rounded-lg border px-2 py-1 text-xs" title="Pull ranked keywords via DataForSEO Labs (~$0.013)">Refresh gaps</button>
              </div>
              <div className="mt-2 flex gap-2">
                <input value={compTopic[c.id] ?? ""} onChange={(e) => setCompTopic((p) => ({ ...p, [c.id]: e.target.value }))} className="w-full rounded-lg border px-3 py-1.5 text-sm" placeholder="Topic they cover, e.g. best budget laptops" />
                <button onClick={() => void runCompCheck(c.id)} className="rounded-lg border px-3 py-1.5 text-sm">Gap-check</button>
              </div>
              {c.observation?.checks?.[0] && <p className="mt-2 text-muted-foreground">{c.observation.checks[0].conclusion}</p>}
            </div>))}</div>
        )}
      </div>

      <div id="intel-aisearch" className="rounded-xl border p-4">
        <h2 className="font-semibold">AI search intelligence</h2>
        <p className="text-sm text-muted-foreground">Real AI-tool demand per keyword (~$0.01, merged into snapshot history) + on-demand LLM brand visibility (~$0.10, never bulk).</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={aiKw} onChange={(e) => setAiKw(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Keywords, comma-separated (max 5)" />
          <button onClick={() => void runAiVolume()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">AI volume</button>
          <button onClick={() => void runLlmCheck()} className="rounded-lg border px-4 py-2 text-sm" title="~$0.10 per check">LLM mentions: techpivo.com</button>
        </div>
        {aiMsg && <p className="mt-3 text-sm text-muted-foreground">{aiMsg}</p>}
        {aiVols && aiVols.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Keyword</th><th className="py-2">AI search volume</th></tr></thead>
              <tbody>{aiVols.map((v) => <tr key={v.keyword} className="border-t"><td className="py-2 pr-3">{v.keyword}</td><td className="py-2">{v.aiSearchVolume ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        {llm && (
          <div className="mt-3 rounded-lg border p-3 text-sm">
            <p className="font-semibold">techpivo.com — {llm.mentions} LLM mentions · {llm.ai_search_volume} AI search volume</p>
            {llm.mentions === 0 && <p className="text-muted-foreground">No measurable mentions in the current window (honest zero, not an error).</p>}
            {llm.by_platform.map((p) => <p key={p.platform} className="text-muted-foreground">{p.platform}: {p.mentions}</p>)}
            {llm.top_source_domains.slice(0, 5).map((d) => <p key={d.domain} className="text-muted-foreground">cited alongside: {d.domain} ({d.mentions})</p>)}
          </div>
        )}
      </div>

      <div id="intel-community" className="rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Community intelligence</h2>
          <button onClick={() => void loadCommunity()} className="ml-auto rounded-lg border px-2 py-1 text-xs">Refresh</button>
        </div>
        <p className="text-sm text-muted-foreground">Repeated questions, top-voted discussions, unanswered demand and poll engagement — from real community rows only.</p>
        {commSignals && commSignals.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No community signals right now.</p>}
        {commSignals && commSignals.length > 0 && (
          <div className="mt-3 space-y-2">{commSignals.map((s, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">[{s.kind}] {s.topic}</p>
              <p className="text-muted-foreground">{s.evidence}</p>
            </div>))}</div>
        )}
      </div>

      <div id="intel-health" className="rounded-xl border p-4">
        <h2 className="font-semibold">Content health: cannibalization + Search Console</h2>
        <div className="mt-2 flex gap-2">
          <button onClick={() => void loadCannibalization()} className="rounded-lg border px-3 py-1.5 text-sm">Scan overlapping titles</button>
        </div>
        {cann && cann.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No overlapping title clusters found.</p>}
        {cann && cann.length > 0 && (
          <div className="mt-3 space-y-2">{cann.slice(0, 8).map((c, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{c.titles.join("  ↔  ")}</p>
              <p className="mt-1 text-muted-foreground">{c.recommendation}</p>
            </div>))}</div>
        )}
        <p className="mt-3 text-sm">Search Console: {scStatus ? (scStatus.connected ? "CONNECTED" : `NOT CONNECTED — ${scStatus.message}`) : "checking…"}</p>
        {scStatus && !scStatus.connected && <p className="text-xs text-muted-foreground">Performance metrics (impressions/clicks/CTR/position) stay NOT AVAILABLE until OAuth credentials are configured. See /api/admin/intelligence/search-console for the setup path.</p>}
      </div>

      <div id="intel-research" className="rounded-xl border p-4">
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
        <h3 className="mt-4 text-sm font-semibold">Briefs + research workspace + social drafts</h3>
        <div className="mt-2 flex gap-2">
          <select value={wsBriefId} onChange={(e) => setWsBriefId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Select brief…</option>{(briefs ?? []).map((b) => <option key={b.id} value={b.id}>{(b.topic ?? "").slice(0, 60)} ({b.status})</option>)}
          </select>
          <button onClick={() => void loadBriefs()} className="rounded-lg border px-3 py-2 text-sm">Reload</button>
        </div>
        <div className="mt-2 grid gap-2">
          <input value={wsQuestion} onChange={(e) => setWsQuestion(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Research question" />
          <input value={wsMethod} onChange={(e) => setWsMethod(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Methodology (test setup, dataset, procedure…)" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => void saveWorkspace()} disabled={!wsBriefId} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Save workspace</button>
          <button onClick={() => void genSocial()} disabled={!wsBriefId} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Generate social drafts</button>
        </div>
        {wsMsg && <p className="mt-2 text-sm text-muted-foreground">{wsMsg}</p>}
      </div>
    </div>
  );
}

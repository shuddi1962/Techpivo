"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Globe,
  Search,
  Video,
  Code,
  Rss,
  Briefcase,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
  AlertTriangle,
  Loader2,
  Flame,
  Hash,
  TrendingUp,
  Activity,
} from "lucide-react";

type TabKey = "overview" | "web" | "search" | "youtube" | "github" | "rss" | "linkedin";

const TABS: { key: TabKey; label: string; icon: typeof Globe }[] = [
  { key: "overview", label: "Overview", icon: Globe },
  { key: "web", label: "Web Research", icon: Search },
  { key: "search", label: "Search", icon: Search },
  { key: "youtube", label: "YouTube", icon: Video },
  { key: "github", label: "GitHub", icon: Code },
  { key: "rss", label: "RSS Feeds", icon: Rss },
  { key: "linkedin", label: "LinkedIn", icon: Briefcase },
];

type HealthKey = "web" | "search" | "youtube" | "github" | "rss" | "linkedin";

type HealthState = Record<HealthKey, "loading" | "ok" | "down">;

interface HealthDetails {
  [key: string]: string;
}

interface PublishInfo {
  headline: string;
  qualityScore: number;
  postId?: string;
}

interface TrendingItem {
  title: string;
  url: string;
  source: string;
}

interface TrendingBundle {
  hackerNews: TrendingItem[];
  github: TrendingItem[];
  trends: TrendingItem[];
  keywords: string[];
  updatedAt: string;
}

const HEALTH_KEYS: HealthKey[] = ["web", "search", "youtube", "github", "rss", "linkedin"];

const EMPTY_HEALTH: HealthState = {
  web: "loading",
  search: "loading",
  youtube: "loading",
  github: "loading",
  rss: "loading",
  linkedin: "loading",
};

const ENGINE_NAMES: Record<string, string> = {
  jina: "Jina AI",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
};

export default function AgentReachPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [health, setHealth] = useState<HealthState>(EMPTY_HEALTH);
  const [healthDetails, setHealthDetails] = useState<HealthDetails>({});
  const [healthCheckedAt, setHealthCheckedAt] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMeta, setSearchMeta] = useState<{ engine: string; query: string } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [webQuery, setWebQuery] = useState("");
  const [webContent, setWebContent] = useState<string>("");
  const [webSourceUrl, setWebSourceUrl] = useState<string>("");
  const [webVia, setWebVia] = useState<string>("");
  const [webTitle, setWebTitle] = useState<string>("");
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<any[]>([]);
  const [ghQuery, setGhQuery] = useState("");
  const [ghResults, setGhResults] = useState<any[]>([]);
  const [rssUrl, setRssUrl] = useState("");
  const [rssResults, setRssResults] = useState<any[]>([]);
  const [liUrl, setLiUrl] = useState("");
  const [liProfile, setLiProfile] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [writing, setWriting] = useState(false);
  const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null);
  const [trendingData, setTrendingData] = useState<TrendingBundle | null>(null);
  const [trendingBusy, setTrendingBusy] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const mountedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const runChannel = useCallback(
    async (channel: string, body: any): Promise<any | null> => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/admin/agent-reach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, ...body }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");
        return data;
      } catch (e: any) {
        setError(e.message || "Request failed");
        return null;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const loadTrending = useCallback(async () => {
    setTrendingBusy(true);
    try {
      const res = await fetch("/api/admin/agent-reach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "trending" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trending fetch failed");
      setTrendingData(data.result);
    } catch (e: any) {
      setError(e.message || "Trending fetch failed");
    } finally {
      setTrendingBusy(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
    const timer = setInterval(loadTrending, 60 * 1000);
    return () => clearInterval(timer);
  }, [loadTrending]);

  const checkHealth = useCallback(async () => {
    setHealth(EMPTY_HEALTH);
    try {
      const res = await fetch("/api/admin/agent-reach");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health check failed");
      const h = data.health || data;
      const next = { ...EMPTY_HEALTH };
      const details: HealthDetails = {};
      for (const c of HEALTH_KEYS) {
        next[c] = h[c]?.status === "ok" ? "ok" : "down";
        if (h[c]?.detail && h[c].detail !== "Connected") details[c] = h[c].detail;
      }
      setHealth(next);
      setHealthDetails(details);
      setHealthCheckedAt(new Date().toISOString());
    } catch (e: any) {
      setError(e.message || "Health check failed");
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    checkHealth();
    const timer = setInterval(checkHealth, 60 * 1000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  const runSearch = useCallback(
    async (q?: string) => {
      const query = (q ?? searchQuery).trim();
      if (!query) return;
      setSuggestions([]);
      setSearchResults([]);
      const data = await runChannel("search", { q: query });
      if (!data) return;
      setSearchResults(data.result.results || []);
      setSearchMeta({ engine: data.result.engine || "jina", query });
    },
    [searchQuery, runChannel]
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (activeTab !== "search" || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSuggestBusy(true);
      try {
        const res = await fetch("/api/admin/agent-reach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: "suggest", q }),
        });
        const data = await res.json();
        if (res.ok) setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestBusy(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const extractTitleFromContent = useCallback((content: string): string => {
    const m = content.match(/^Title:\s*(.+)$/m);
    if (m && m[1].trim()) return m[1].trim().slice(0, 120);
    const firstLine = content.split("\n").find((l) => l.trim().length > 10);
    return (firstLine || "").trim().slice(0, 120);
  }, []);

  const runWeb = useCallback(async () => {
    const url = webQuery.trim();
    if (!url) return;
    setWebContent("");
    setWebVia("");
    const data = await runChannel("web", { url });
    if (!data) return;
    setWebSourceUrl(url);
    setWebVia(data.result.via || "");
    setWebContent((data.result.content || "").slice(0, 6000));
    setWebTitle(extractTitleFromContent(data.result.content || ""));
  }, [webQuery, runChannel, extractTitleFromContent]);

  const runYoutube = useCallback(async () => {
    const q = ytQuery.trim();
    if (!q) return;
    const data = await runChannel("youtube", { q });
    if (!data) return;
    setYtResults([data.result]);
  }, [ytQuery, runChannel]);

  const runGithub = useCallback(async () => {
    const q = ghQuery.trim();
    if (!q) return;
    const data = await runChannel("github", { q });
    if (!data) return;
    setGhResults(data.result.items || []);
  }, [ghQuery, runChannel]);

  const runRss = useCallback(async () => {
    const url = rssUrl.trim();
    if (!url) return;
    const data = await runChannel("rss", { url });
    if (!data) return;
    setRssResults(data.result.items || []);
  }, [rssUrl, runChannel]);

  const runLinkedin = useCallback(async () => {
    const url = liUrl.trim();
    if (!url) return;
    const data = await runChannel("linkedin", { url });
    if (!data) return;
    setLiProfile((data.result.content || "").slice(0, 4000));
  }, [liUrl, runChannel]);

  const writeArticle = useCallback(
    async (topic: string) => {
      setWriting(true);
      setError("");
      setPublishInfo(null);
      try {
        const res = await fetch("/api/admin/research-keyword", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: topic }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Article generation failed");
        setPublishInfo({
          headline: data.post?.title || data.headline || topic,
          qualityScore: data.qualityScore ?? 0,
          postId: data.post?.id,
        });
      } catch (e: any) {
        setError(e.message || "Article generation failed");
      } finally {
        setWriting(false);
      }
    },
    []
  );

  const searchFromChip = useCallback(
    (term: string) => {
      setSearchQuery(term);
      setActiveTab("search");
      runSearch(term);
    },
    [runSearch]
  );

  const healthSummary = useCallback(() => {
    const ok = HEALTH_KEYS.filter((k) => health[k] === "ok").length;
    const down = HEALTH_KEYS.filter((k) => health[k] === "down").length;
    if (down === 0 && ok > 0) return `${ok}/${HEALTH_KEYS.length} channels live`;
    if (down > 0) return `${down} channel${down > 1 ? "s" : ""} down`;
    return "Checking…";
  }, [health]);

  const ago = (iso: string) => {
    const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    return `${Math.round(seconds / 3600)}h ago`;
  };

  const trendingCountdown = trendingData
    ? Math.max(0, 60 - Math.round((now - new Date(trendingData.updatedAt).getTime()) / 1000))
    : 60;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Reach — Research Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live, real-time research channels. Everything you see here is fetched live — no
            mock data. Writing is handled by Gemini like a human expert reporter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${
              healthSummary().includes("down")
                ? "border-red-500/30 bg-red-500/10 text-red-600"
                : healthSummary().includes("Checking")
                ? "border-muted text-muted-foreground"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            {healthSummary()}
            {healthCheckedAt && <span className="opacity-70">· {ago(healthCheckedAt)}</span>}
          </span>
          <button
            onClick={checkHealth}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${health.web === "loading" ? "animate-spin" : ""}`} />
            Check Now
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="mt-0.5 text-xs text-red-500/80">
              Try again — the research engine retries automatically when Gemini rate-limits or the daily quota resets.
            </p>
          </div>
        </div>
      )}

      {publishInfo && (
        <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="text-sm">
            <p className="font-medium text-emerald-700">
              Article published: {publishInfo.headline}
            </p>
            <p className="text-emerald-600/80">
              Quality score: {Math.round(publishInfo.qualityScore)}/100
            </p>
            <div className="mt-2 flex gap-3">
              {publishInfo.postId && (
                <Link
                  href={`/admin/posts/${publishInfo.postId}/edit`}
                  className="font-medium text-emerald-700 underline"
                >
                  Edit article
                </Link>
              )}
              <Link href="/admin/posts" className="font-medium text-emerald-700 underline">
                View all posts
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["web", "Web Reader", "Jina Reader + direct fetch fallback — any URL as clean text", health.web],
                ["search", "Web Search", "Live search with auto-failover (Jina → Bing → DuckDuckGo)", health.search],
                ["youtube", "YouTube", "Video metadata via oEmbed", health.youtube],
                ["github", "GitHub", "Repositories, code and issues via REST API", health.github],
                ["rss", "RSS Feeds", "Any feed URL parsed with rss-parser", health.rss],
                ["linkedin", "LinkedIn", "Public profile pages via Jina Reader", health.linkedin],
              ] as const
            ).map(([key, name, desc, status]) => (
              <div key={key} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{name}</p>
                  {status === "ok" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Live
                    </span>
                  ) : status === "down" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <XCircle className="h-3.5 w-3.5" /> Down
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                {healthDetails[key] && (
                  <p className="mt-1.5 text-xs text-red-500/80" title={healthDetails[key]}>
                    {healthDetails[key].slice(0, 80)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h2 className="font-semibold">Trending Right Now</h2>
                {trendingData && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {trendingData
                    ? `Updated ${ago(trendingData.updatedAt)} · auto-refreshes in ${trendingCountdown}s`
                    : "Fetching live trends…"}
                </span>
              </div>
              <button
                onClick={loadTrending}
                disabled={trendingBusy}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {trendingBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh
              </button>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <TrendingList
                title="Hacker News"
                items={trendingData?.hackerNews || []}
                onWrite={writeArticle}
                writing={writing}
                onSearch={searchFromChip}
              />
              <TrendingList
                title="GitHub Trending"
                items={trendingData?.github || []}
                onWrite={writeArticle}
                writing={writing}
                onSearch={searchFromChip}
              />
              <TrendingList
                title="Google & Bing Trends"
                items={trendingData?.trends || []}
                onWrite={writeArticle}
                writing={writing}
                onSearch={searchFromChip}
              />
            </div>
            {trendingData && trendingData.keywords.length > 0 && (
              <div className="border-t px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <Hash className="h-3.5 w-3.5" />
                  Trending searches on Google &amp; Bing — click to explore
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingData.keywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => searchFromChip(kw)}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Channel health auto-checks every 60 seconds; trending auto-refreshes every minute.
            Use any tab to research a topic, then hit &quot;Write article with Gemini&quot; to
            publish a fully researched, SEO-ready article.
          </p>
        </div>
      )}

      {activeTab === "web" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={webQuery}
              onChange={(e) => setWebQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runWeb();
              }}
              placeholder="https://example.com/article"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={runWeb}
              disabled={busy || !webQuery.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Fetch
            </button>
          </div>
          {webSourceUrl && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                Source:{" "}
                <a
                  href={webSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {webSourceUrl}
                </a>
              </span>
              {webVia && (
                <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-medium text-sky-600">
                  via {webVia}
                </span>
              )}
            </div>
          )}
          {busy && !webContent && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading page live…
            </p>
          )}
          {webContent ? (
            <>
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {webContent}
              </pre>
              <WriteBar
                topic={webTitle || webSourceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                onWrite={() => writeArticle(webTitle || webSourceUrl)}
                writing={writing}
              />
            </>
          ) : (
            !busy && (
              <p className="text-sm text-muted-foreground">
                Enter a URL to read it live as clean markdown. Works with most pages, news
                articles, and documentation — falls back to direct fetching automatically.
              </p>
            )
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="Search the web — suggestions appear as you type…"
                className="w-full rounded-md border bg-background px-3 py-2 pr-8 text-sm"
              />
              {suggestBusy && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {suggestions.length > 0 && searchQuery.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSearchQuery(s);
                        runSearch(s);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => runSearch()}
              disabled={busy || !searchQuery.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
          {busy && searchResults.length === 0 && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching live across providers…
            </p>
          )}
          {searchMeta && (
            <p className="text-xs text-muted-foreground">
              {searchResults.length} results from{" "}
              {ENGINE_NAMES[searchMeta.engine] || searchMeta.engine} for &quot;{searchMeta.query}&quot;
            </p>
          )}
          <div className="space-y-3">
            {searchResults.map((r: any, i: number) => (
              <div key={i} className="rounded-lg border p-4">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {r.title || r.url}
                </a>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {r.snippet || r.description || ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{r.url}</p>
                <div className="mt-3">
                  <WriteBar
                    topic={(r.title || "").replace(/\s*[-–—|].*$/, "").trim() || r.url}
                    onWrite={() => writeArticle(r.title || r.url)}
                    writing={writing}
                  />
                </div>
              </div>
            ))}
            {!busy && searchMeta && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No results returned. Try a different query.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === "youtube" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runYoutube();
              }}
              placeholder="YouTube video URL"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={runYoutube}
              disabled={busy || !ytQuery.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Lookup
            </button>
          </div>
          <div className="space-y-3">
            {ytResults.map((r: any, i: number) => (
              <div key={i} className="rounded-lg border p-4">
                {r.thumbnail_url && (
                  <img
                    src={r.thumbnail_url}
                    alt={r.title || "YouTube thumbnail"}
                    className="mb-3 max-h-56 w-full rounded-md object-cover"
                  />
                )}
                <p className="font-medium">{r.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.author_name}</p>
                <div className="mt-3">
                  <WriteBar
                    topic={r.title || ytQuery}
                    onWrite={() => writeArticle(r.title || ytQuery)}
                    writing={writing}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "github" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={ghQuery}
              onChange={(e) => setGhQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runGithub();
              }}
              placeholder="Search GitHub repositories"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={runGithub}
              disabled={busy || !ghQuery.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code className="h-4 w-4" />}
              Search
            </button>
          </div>
          <div className="space-y-3">
            {ghResults.map((r: any, i: number) => (
              <div key={i} className="rounded-lg border p-4">
                <a
                  href={r.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {r.full_name}
                </a>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {r.description || "No description"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.language} · {r.stargazers_count} stars · {r.forks_count} forks · Updated{" "}
                  {r.updated_at}
                </p>
                <div className="mt-3">
                  <WriteBar
                    topic={r.full_name || r.html_url}
                    onWrite={() => writeArticle(r.full_name || r.html_url)}
                    writing={writing}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "rss" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runRss();
              }}
              placeholder="https://hnrss.org/frontpage"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={runRss}
              disabled={busy || !rssUrl.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rss className="h-4 w-4" />}
              Fetch
            </button>
          </div>
          <div className="space-y-3">
            {rssResults.map((r: any, i: number) => (
              <div key={i} className="rounded-lg border p-4">
                <a href={r.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {r.title}
                </a>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {(r.contentSnippet || r.summary || "").slice(0, 300)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.pubDate ? new Date(r.pubDate).toLocaleString() : ""} · {r.link}
                </p>
                <div className="mt-3">
                  <WriteBar
                    topic={r.title || r.link}
                    onWrite={() => writeArticle(r.title || r.link)}
                    writing={writing}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "linkedin" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={liUrl}
              onChange={(e) => setLiUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runLinkedin();
              }}
              placeholder="https://www.linkedin.com/in/username"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={runLinkedin}
              disabled={busy || !liUrl.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
              Fetch
            </button>
          </div>
          {liProfile ? (
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {liProfile}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Fetch a public LinkedIn profile to research a person&apos;s background, role, and
              company before writing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TrendingList({
  title,
  items,
  onWrite,
  onSearch,
  writing,
}: {
  title: string;
  items: TrendingItem[];
  onWrite: (topic: string) => void;
  onSearch: (term: string) => void;
  writing: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length} stories</span>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live trends…
        </div>
      ) : (
        <ol className="space-y-2">
          {items.slice(0, 10).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium leading-snug hover:underline"
                >
                  {item.title}
                </a>
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                  <button
                    onClick={() => onSearch(item.title)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                  >
                    <Search className="h-3 w-3" />
                    Search
                  </button>
                  <button
                    onClick={() => onWrite(item.title)}
                    disabled={writing}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    Write article
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function WriteBar({
  topic,
  onWrite,
  writing,
}: {
  topic: string;
  onWrite: () => void;
  writing: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{topic}</span>
      <button
        onClick={onWrite}
        disabled={writing}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {writing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {writing ? "Researching & writing…" : "Write article with Gemini"}
      </button>
    </div>
  );
}

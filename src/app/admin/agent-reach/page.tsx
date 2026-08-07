"use client";

import { useState, useCallback } from "react";
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
  Clock,
  AlertTriangle,
  Loader2,
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

interface HealthState {
  web: "loading" | "ok" | "down";
  search: "loading" | "ok" | "down";
  youtube: "loading" | "ok" | "down";
  github: "loading" | "ok" | "down";
  rss: "loading" | "ok" | "down";
  linkedin: "loading" | "ok" | "down";
}

interface PublishInfo {
  headline: string;
  qualityScore: number;
  postId?: string;
}

const EMPTY_HEALTH: HealthState = {
  web: "loading",
  search: "loading",
  youtube: "loading",
  github: "loading",
  rss: "loading",
  linkedin: "loading",
};

export default function AgentReachPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [health, setHealth] = useState<HealthState>(EMPTY_HEALTH);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [webQuery, setWebQuery] = useState("");
  const [webContent, setWebContent] = useState<string>("");
  const [webSourceUrl, setWebSourceUrl] = useState<string>("");
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

  const runChannel = useCallback(
    async (channel: string, body: any): Promise<any> => {
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
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const checkHealth = useCallback(async () => {
    setHealth(EMPTY_HEALTH);
    try {
      const res = await fetch("/api/admin/agent-reach");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health check failed");
      const next = { ...EMPTY_HEALTH };
      for (const c of ["web", "search", "youtube", "github", "rss", "linkedin"] as const) {
        next[c] = data[c] ? "ok" : "down";
      }
      setHealth(next);
    } catch (e: any) {
      setError(e.message || "Health check failed");
    }
  }, []);

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const data = await runChannel("search", { q });
    setSearchResults(data.results || []);
  }, [searchQuery, runChannel]);

  const runWeb = useCallback(async () => {
    const url = webQuery.trim();
    if (!url) return;
    const data = await runChannel("web", { url });
    setWebSourceUrl(url);
    setWebContent((data.content || "").slice(0, 6000));
  }, [webQuery, runChannel]);

  const runYoutube = useCallback(async () => {
    const q = ytQuery.trim();
    if (!q) return;
    const data = await runChannel("youtube", { q });
    setYtResults(data.results || []);
  }, [ytQuery, runChannel]);

  const runGithub = useCallback(async () => {
    const q = ghQuery.trim();
    if (!q) return;
    const data = await runChannel("github", { q });
    setGhResults(data.results || []);
  }, [ghQuery, runChannel]);

  const runRss = useCallback(async () => {
    const url = rssUrl.trim();
    if (!url) return;
    const data = await runChannel("rss", { url });
    setRssResults(data.results || []);
  }, [rssUrl, runChannel]);

  const runLinkedin = useCallback(async () => {
    const url = liUrl.trim();
    if (!url) return;
    const data = await runChannel("linkedin", { url });
    setLiProfile((data.content || "").slice(0, 4000));
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
          headline: data.post?.title || data.title || topic,
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
        <button
          onClick={checkHealth}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Channel Health
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
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

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
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
                ["web", "Web Reader", "Jina Reader — fetch any URL as clean markdown", health.web],
                ["search", "Web Search", "Live search (Jina Search or DuckDuckGo)", health.search],
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
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Click &quot;Channel Health&quot; to test all channels. Then use any tab to research a topic,
            and hit &quot;Write article with Gemini&quot; to publish a fully researched, SEO-ready article.
          </p>
        </div>
      )}

      {activeTab === "web" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={webQuery}
              onChange={(e) => setWebQuery(e.target.value)}
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
            <p className="text-xs text-muted-foreground">
              Source:{" "}
              <a
                href={webSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {webSourceUrl}
              </a>
            </p>
          )}
          {webContent ? (
            <>
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {webContent}
              </pre>
              <WriteBar
                topic={webSourceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                onWrite={() => writeArticle(webSourceUrl)}
                writing={writing}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter a URL to read it as clean markdown. Works with most pages, news articles,
              and documentation.
            </p>
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Latest AI model release 2026"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={runSearch}
              disabled={busy || !searchQuery.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
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
          </div>
        </div>
      )}

      {activeTab === "youtube" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
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
                <p className="font-medium">{r.title}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.channel} · {r.views} · {r.published}
                </p>
                <div className="mt-3">
                  <WriteBar
                    topic={r.title || r.url}
                    onWrite={() => writeArticle(r.title || r.url)}
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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
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

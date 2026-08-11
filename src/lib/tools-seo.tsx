"use client";

import React, { useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { s, CopyButton, DownloadButton, Field, ToolCard, ErrorBox, OkBox, downloadText } from "./tools-ui";

export function MetaTagTool() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [siteName, setSiteName] = useState("Techpivo");
  const [image, setImage] = useState("");
  const [twitter, setTwitter] = useState("@techpivo");
  const output = useMemo(() => {
    const tags = [
      `<title>${title}</title>`,
      `<meta name="description" content="${desc}" />`,
      `<meta name="robots" content="index, follow" />`,
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:site_name" content="${siteName}" />`,
    ];
    if (image) tags.push(`<meta property="og:image" content="${image}" />`);
    tags.push(
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
      `<meta name="twitter:site" content="${twitter}" />`
    );
    return tags.join("\n");
  }, [title, desc, url, siteName, image, twitter]);
  const titleOver = title.length > 60;
  const descOver = desc.length > 160;
  return (
    <>
      {titleOver || descOver ? (
        <ErrorBox>
          {titleOver && <div>• Title is {title.length - 60} chars over the 60-char limit.</div>}
          {descOver && <div>• Description is {desc.length - 160} chars over the 160-char limit.</div>}
        </ErrorBox>
      ) : (
        <OkBox>
          {title.length > 0 && `Title ${title.length}/60 · `}
          {desc.length > 0 && `Description ${desc.length}/160 · `}
          {title.length > 0 || desc.length > 0 ? "within recommended limits" : "Fill in the fields to generate tags"}
        </OkBox>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <ToolCard title="Page details">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label={`Page title (${title.length}/60)`}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={s.inp} />
              </Field>
              <Field label={`Meta description (${desc.length}/160)`}>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...s.ta(80), fontFamily: "inherit" }} />
              </Field>
              <Field label="Canonical URL">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://techpivo.com/…" style={s.inp} />
              </Field>
              <Field label="Site name">
                <input value={siteName} onChange={(e) => setSiteName(e.target.value)} style={s.inp} />
              </Field>
              <Field label="Social image URL (optional)">
                <input value={image} onChange={(e) => setImage(e.target.value)} style={s.inp} />
              </Field>
              <Field label="Twitter handle (optional)">
                <input value={twitter} onChange={(e) => setTwitter(e.target.value)} style={s.inp} />
              </Field>
            </div>
          </ToolCard>
        </div>
        <div>
          <ToolCard title="Generated HTML">
            <textarea readOnly value={output} style={{ ...s.ta(340), whiteSpace: "pre" }} />
            <div style={{ marginTop: 8 }}>
              <CopyButton text={output} label="Copy all tags" size="md" />
            </div>
          </ToolCard>
        </div>
      </div>
    </>
  );
}

const SCHEMA_TYPES = ["Article", "FAQPage", "Product", "Organization", "Event"] as const;

export function SchemaTool() {
  const [stype, setStype] = useState<(typeof SCHEMA_TYPES)[number]>("Article");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [datePub, setDatePub] = useState("");
  const [image, setImage] = useState("");
  const [faqPairs, setFaqPairs] = useState([{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");

  const output = useMemo(() => {
    const base = {
      "@context": "https://schema.org",
      "@type": stype,
    };
    let body: Record<string, unknown> = { ...base };
    if (stype === "Article") {
      body = {
        ...body,
        headline: name,
        description: desc || undefined,
        url: url || undefined,
        image: image || undefined,
        author: author ? { "@type": "Person", name: author } : undefined,
        datePublished: datePub || undefined,
        publisher: { "@type": "Organization", name: "Techpivo" },
      };
    } else if (stype === "FAQPage") {
      body = {
        ...body,
        mainEntity: faqPairs
          .filter((f) => f.q.trim() || f.a.trim())
          .map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
      };
    } else if (stype === "Product") {
      body = {
        ...body,
        name,
        description: desc || undefined,
        image: image || undefined,
        url: url || undefined,
        offers: price
          ? {
              "@type": "Offer",
              price,
              priceCurrency: currency,
              availability: "https://schema.org/InStock",
            }
          : undefined,
      };
    } else if (stype === "Organization") {
      body = {
        ...body,
        name: name || "Techpivo",
        url: url || undefined,
        description: desc || undefined,
        logo: image || undefined,
      };
    } else {
      body = {
        ...body,
        name,
        description: desc || undefined,
        startDate: eventDate || undefined,
        location: location ? { "@type": "Place", name: location } : undefined,
        url: url || undefined,
      };
    }
    return JSON.stringify(body, null, 2);
  }, [stype, name, desc, url, author, datePub, image, faqPairs, price, currency, eventDate, location]);

  return (
    <>
      <ToolCard title="Schema type">
        <select value={stype} onChange={(e) => setStype(e.target.value as (typeof SCHEMA_TYPES)[number])} style={{ ...s.sel, width: "100%" }}>
          {SCHEMA_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <ToolCard title="Fields">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stype !== "FAQPage" && (
                <Field label={stype === "Organization" ? "Organization name" : stype === "Event" ? "Event name" : "Headline / name"}>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={s.inp} />
                </Field>
              )}
              <Field label="Description">
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...s.ta(70), fontFamily: "inherit" }} />
              </Field>
              <Field label="URL">
                <input value={url} onChange={(e) => setUrl(e.target.value)} style={s.inp} />
              </Field>
              <Field label="Image URL (optional)">
                <input value={image} onChange={(e) => setImage(e.target.value)} style={s.inp} />
              </Field>
              {stype === "Article" && (
                <>
                  <Field label="Author">
                    <input value={author} onChange={(e) => setAuthor(e.target.value)} style={s.inp} />
                  </Field>
                  <Field label="Published date">
                    <input type="date" value={datePub} onChange={(e) => setDatePub(e.target.value)} style={{ ...s.inp, fontFamily: "inherit" }} />
                  </Field>
                </>
              )}
              {stype === "Product" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Field label="Price" style={{ flexGrow: 1 }}>
                    <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={s.inp} />
                  </Field>
                  <Field label="Currency">
                    <input value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...s.inp, width: 90 }} />
                  </Field>
                </div>
              )}
              {stype === "Event" && (
                <>
                  <Field label="Start date">
                    <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ ...s.inp, fontFamily: "inherit" }} />
                  </Field>
                  <Field label="Location">
                    <input value={location} onChange={(e) => setLocation(e.target.value)} style={s.inp} />
                  </Field>
                </>
              )}
            </div>
          </ToolCard>
          {stype === "FAQPage" && (
            <ToolCard title="Questions">
              {faqPairs.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder={`Question ${i + 1}`}
                    value={f.q}
                    onChange={(e) => {
                      const next = [...faqPairs];
                      next[i] = { ...next[i], q: e.target.value };
                      setFaqPairs(next);
                    }}
                    style={s.inp}
                  />
                  <input
                    placeholder="Answer"
                    value={f.a}
                    onChange={(e) => {
                      const next = [...faqPairs];
                      next[i] = { ...next[i], a: e.target.value };
                      setFaqPairs(next);
                    }}
                    style={s.inp}
                  />
                  <button
                    style={{ ...s.btn2, padding: "8px 10px" }}
                    onClick={() => setFaqPairs(faqPairs.filter((_, j) => j !== i))}
                    disabled={faqPairs.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button style={s.btn2} onClick={() => setFaqPairs([...faqPairs, { q: "", a: "" }])}>
                <Plus size={14} /> Add question
              </button>
            </ToolCard>
          )}
        </div>
        <div>
          <ToolCard title="JSON-LD output">
            <textarea readOnly value={output} style={{ ...s.ta(360), whiteSpace: "pre" }} spellCheck={false} />
            <div style={{ marginTop: 8 }}>
              <CopyButton text={output} label="Copy JSON-LD" size="md" />
              <DownloadButton
                onClick={() => downloadText("schema.jsonld", output, "application/ld+json")}
                label="Download JSON-LD"
                fileName="schema.jsonld"
                style={{ marginLeft: 8 }}
              />
            </div>
          </ToolCard>
        </div>
      </div>
    </>
  );
}

const ROBOT_AGENTS = [
  { label: "All bots", value: "*" },
  { label: "Googlebot", value: "Googlebot" },
  { label: "Bingbot", value: "bingbot" },
  { label: "GPTBot (AI crawler)", value: "GPTBot" },
  { label: "ClaudeBot", value: "ClaudeBot" },
  { label: "DuckDuckBot", value: "DuckDuckBot" },
  { label: "Yandex", value: "Yandex" },
];

export function RobotsTool() {
  const [agents, setAgents] = useState<{ agent: string; rules: string[] }[]>([
    { agent: "*", rules: ["/admin", "/api", "/account"] },
  ]);
  const [sitemap, setSitemap] = useState("https://techpivo.com/sitemap.xml");
  const [crawlDelay, setCrawlDelay] = useState("");

  const output = useMemo(() => {
    const lines: string[] = [];
    agents.forEach((a) => {
      if (!a.rules.length) return;
      lines.push(`User-agent: ${a.agent}`);
      a.rules.forEach((r) => {
        const clean = r.trim();
        if (clean) lines.push(clean.startsWith("Allow:") || clean.startsWith("Disallow:") ? clean : `Disallow: ${clean.startsWith("/") ? clean : `/${clean}`}`);
      });
      if (a.agent === "*" && crawlDelay) lines.push(`Crawl-delay: ${crawlDelay}`);
      lines.push("");
    });
    if (sitemap.trim()) lines.push(`Sitemap: ${sitemap.trim()}`);
    return lines.join("\n").trim();
  }, [agents, sitemap, crawlDelay]);

  return (
    <>
      <ToolCard title="User agents">
        {agents.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <select
              value={a.agent}
              onChange={(e) => {
                const next = [...agents];
                next[i] = { ...next[i], agent: e.target.value };
                setAgents(next);
              }}
              style={s.sel}
            >
              {ROBOT_AGENTS.map((ra) => (
                <option key={ra.value} value={ra.value}>{ra.label}</option>
              ))}
            </select>
            <textarea
              value={a.rules.join("\n")}
              onChange={(e) => {
                const next = [...agents];
                next[i] = { ...next[i], rules: e.target.value.split("\n") };
                setAgents(next);
              }}
              placeholder="Paths to block (one per line, e.g. /admin)"
              style={{ ...s.ta(64), fontFamily: "inherit", flexGrow: 1 }}
            />
            <button
              style={{ ...s.btn2, padding: "8px 10px" }}
              onClick={() => setAgents(agents.filter((_, j) => j !== i))}
              disabled={agents.length <= 1}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button style={s.btn2} onClick={() => setAgents([...agents, { agent: "*", rules: [""] }])}>
          <Plus size={14} /> Add user agent
        </button>
      </ToolCard>
      <ToolCard title="Extras">
        <div style={s.row}>
          <Field label="Sitemap URL" style={{ flexGrow: 1, minWidth: 220 }}>
            <input value={sitemap} onChange={(e) => setSitemap(e.target.value)} style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <Field label="Crawl-delay (optional)">
            <input value={crawlDelay} onChange={(e) => setCrawlDelay(e.target.value.replace(/[^\d]/g, ""))} placeholder="10" style={{ ...s.inp, width: 90 }} />
          </Field>
        </div>
      </ToolCard>
      <ToolCard title="Generated robots.txt">
        <textarea readOnly value={output} style={{ ...s.ta(200), whiteSpace: "pre" }} />
        <div style={{ marginTop: 8 }}>
          <CopyButton text={output} label="Copy robots.txt" size="md" />
          <DownloadButton onClick={() => downloadText("robots.txt", output)} label="Download robots.txt" fileName="robots.txt" style={{ marginLeft: 8 }} />
        </div>
      </ToolCard>
    </>
  );
}

const FREQ_OPTIONS = ["", "always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

export function SitemapTool() {
  const [urls, setUrls] = useState("https://techpivo.com/\nhttps://techpivo.com/tools\nhttps://techpivo.com/category/ai");
  const [includeLastmod, setIncludeLastmod] = useState(true);
  const [freq, setFreq] = useState("");
  const [priority, setPriority] = useState("");
  const [domain, setDomain] = useState("https://techpivo.com");

  const output = useMemo(() => {
    const list = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const normalize = (u: string) => {
      if (u.startsWith("http://") || u.startsWith("https://")) return u;
      return domain.replace(/\/$/, "") + (u.startsWith("/") ? u : `/${u}`);
    };
    const today = new Date().toISOString().split("T")[0];
    const items = list
      .map((u) => {
        const loc = normalize(u);
        return (
          "  <url>\n" +
          `    <loc>${loc}</loc>\n` +
          (includeLastmod ? `    <lastmod>${today}</lastmod>\n` : "") +
          (freq ? `    <changefreq>${freq}</changefreq>\n` : "") +
          (priority ? `    <priority>${priority}</priority>\n` : "") +
          "  </url>"
        );
      })
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
  }, [urls, includeLastmod, freq, priority, domain]);

  const count = urls.split("\n").map((u) => u.trim()).filter(Boolean).length;

  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label="Site domain" style={{ flexGrow: 1, minWidth: 220 }}>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={includeLastmod} onChange={(e) => setIncludeLastmod(e.target.checked)} /> Include lastmod
          </label>
          <Field label="Changefreq">
            <select value={freq} onChange={(e) => setFreq(e.target.value)} style={s.sel}>
              <option value="">— none —</option>
              {FREQ_OPTIONS.slice(1).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={s.sel}>
              <option value="">— none —</option>
              {["0.1", "0.3", "0.5", "0.7", "0.8", "0.9", "1.0"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.lab}>URLs (one per line)</label>
          <textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="https://your-site.com/page" style={{ ...s.ta(300), fontFamily: "inherit" }} spellCheck={false} />
        </div>
        <div>
          <label style={s.lab}>Generated sitemap.xml ({count} URLs)</label>
          <textarea readOnly value={output} style={{ ...s.ta(300), whiteSpace: "pre" }} spellCheck={false} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <CopyButton text={output} label="Copy XML" size="md" />
        <DownloadButton onClick={() => downloadText("sitemap.xml", output, "application/xml")} label="Download sitemap.xml" fileName="sitemap.xml" style={{ marginLeft: 8 }} />
      </div>
    </>
  );
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "for", "of", "to", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "can", "could", "should", "may", "might", "must", "shall",
  "this", "that", "these", "those", "it", "its", "i", "you", "he", "she", "we", "they", "them", "his",
  "her", "our", "your", "my", "me", "us", "their", "not", "so", "than", "too", "very", "just", "also",
  "about", "into", "over", "after", "before", "between", "out", "up", "down", "off", "again", "once",
  "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "only", "own", "same", "what", "which", "who", "whom", "while",
]);

export function KeywordDensityTool() {
  const [text, setText] = useState("");
  const [phrases, setPhrases] = useState(false);
  const result = useMemo(() => {
    const words = text.toLowerCase().match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g) || [];
    const total = words.length;
    const counts = new Map<string, number>();
    const bigrams = new Map<string, number>();
    words.forEach((w, i) => {
      if (!STOP_WORDS.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
      if (phrases && i < words.length - 1 && !STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
        const bg = `${words[i]} ${words[i + 1]}`;
        bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
      }
    });
    const single = [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 25);
    const pair = [...bigrams.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return { total, single, pair };
  }, [text, phrases]);
  return (
    <>
      <ToolCard title="Text">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste article text here…"
          style={{ ...s.ta(240), fontFamily: "inherit" }}
        />
        <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
          <input type="checkbox" checked={phrases} onChange={(e) => setPhrases(e.target.checked)} />
          Include 2-word phrases
        </label>
      </ToolCard>
      <OkBox>{result.total} words analyzed · showing keywords with 2+ occurrences</OkBox>
      <ToolCard title="Keyword frequency">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            {phrases && <label style={s.lab}>Phrases</label>}
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                  <th>Keyword</th><th>Count</th><th>Density</th>
                </tr>
              </thead>
              <tbody>
                {(phrases ? result.pair : result.single).map(([w, c]) => (
                  <tr key={w} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "5px 2px", fontFamily: "monospace" }}>{w}</td>
                    <td>{c}</td>
                    <td>{result.total ? ((c / result.total) * 100).toFixed(1) : "0"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!phrases ? result.single : result.pair).length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>No keywords found yet — paste text above.</div>
            )}
          </div>
          <div>
            <label style={s.lab}>Density bar</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(phrases ? result.pair : result.single).slice(0, 10).map(([w, c]) => (
                <div key={w} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", width: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w}</span>
                  <div style={{ flexGrow: 1, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (c / Math.max(1, result.total) * 100) * 5)}%`, background: "var(--accent)", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)", width: 40, textAlign: "right" }}>
                    {result.total ? ((c / result.total) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
              ))}
            </div>
            <div style={{ ...s.card, marginTop: 12, marginBottom: 0 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Use keywords naturally. Forcing a density above ~2-3% reads poorly — quality beats stuffing.
              </div>
            </div>
          </div>
        </div>
      </ToolCard>
    </>
  );
}

function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return 0;
  const groups = lower.match(/[aeiouy]+/g) || [];
  let count = groups.length;
  if (lower.endsWith("e") && count > 1) count--;
  if (lower.endsWith("le") && lower.length > 2 && !/[aeiouy]e$/.test(lower)) count++;
  return Math.max(1, count);
}

export function ReadabilityTool() {
  const [text, setText] = useState("");
  const result = useMemo(() => {
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    const words = text.match(/[a-zA-Z0-9’'-]+/g) || [];
    const sentenceCount = Math.max(1, sentences.length);
    const wordCount = Math.max(1, words.length);
    const avgWords = wordCount / sentenceCount;
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const avgSyllables = syllables / wordCount;
    const flesch = 206.835 - 1.015 * avgWords - 84.6 * avgSyllables;
    const grade = 0.39 * avgWords + 11.8 * avgSyllables - 15.59;
    const score = Math.max(0, Math.min(100, flesch));
    let verdict = "College level — tough read";
    if (score >= 90) verdict = "Very easy — 5th grade";
    else if (score >= 80) verdict = "Easy — 6th grade";
    else if (score >= 70) verdict = "Fairly easy — 7th grade";
    else if (score >= 60) verdict = "Standard — 8th-9th grade";
    else if (score >= 50) verdict = "Fairly difficult — 10th-12th grade";
    else if (score >= 30) verdict = "Difficult — college";
    const passive = (text.match(/\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi) || []).length;
    return { score, grade, avgWords, avgSyllables, wordCount, sentenceCount, verdict, passive };
  }, [text]);
  const color = result.score >= 60 ? "#047857" : result.score >= 40 ? "#D97706" : "#DC2626";
  return (
    <>
      <ToolCard title="Text">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste article or draft text here…" style={{ ...s.ta(260), fontFamily: "inherit" }} />
      </ToolCard>
      {text.trim() && (
        <>
          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color }}>{result.score.toFixed(0)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Flesch Reading Ease</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{result.verdict}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Grade level: {result.grade.toFixed(1)} · target 60-70 for general tech readers
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              ["Words", String(result.wordCount)],
              ["Sentences", String(result.sentenceCount)],
              ["Avg words / sentence", result.avgWords.toFixed(1)],
              ["Avg syllables / word", result.avgSyllables.toFixed(2)],
              ["Passive-voice hints", String(result.passive)],
              ["Reading time", `${Math.max(1, Math.round(result.wordCount / 200))} min`],
            ].map(([l, v]) => (
              <div key={l} style={{ ...s.card, margin: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>{v}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function SerpPreviewTool() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("https://techpivo.com");
  const [desc, setDesc] = useState("");
  const displayTitle = title.length > 60 ? title.slice(0, 60).trimEnd() + "…" : title || "Your page title";
  const displayDesc = desc.length > 160 ? desc.slice(0, 160).trimEnd() + "…" : desc || "Your meta description appears here, up to roughly 160 characters before Google truncates it with an ellipsis.";
  return (
    <>
      <ToolCard title="Enter your page">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label={`Title (${title.length}/60)`}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={s.inp} />
          </Field>
          <Field label="URL">
            <input value={url} onChange={(e) => setUrl(e.target.value)} style={s.inp} />
          </Field>
          <Field label={`Description (${desc.length}/160)`}>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...s.ta(70), fontFamily: "inherit" }} />
          </Field>
        </div>
      </ToolCard>
      <ToolCard title="Google preview">
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 18, maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#6B7280", fontWeight: 700 }}>
              {(url.replace(/^https?:\/\//, "")[0] || "S").toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: "#374151" }}>
              <div style={{ fontWeight: 400 }}>{url.replace(/^https?:\/\/(www\.)?/, "")}</div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: "#1A0DAB", fontWeight: 400, lineHeight: 1.3, marginBottom: 4, wordBreak: "break-word" }}>{displayTitle}</div>
          <div style={{ fontSize: 13, color: "#4D5156", lineHeight: 1.5 }}>{displayDesc}</div>
        </div>
      </ToolCard>
    </>
  );
}

export function WordCounterTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.match(/\S+/g) || [];
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
    const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))).size;
    const paras = text.trim() ? text.split(/\n{1,}/).filter((p) => p.trim()).length : 0;
    return { words: words.length, chars, charsNoSpace, sentences, paras, unique, readMin: Math.max(1, Math.round(words.length / 200)), speakMin: Math.max(1, Math.round(words.length / 130)) };
  }, [text]);
  return (
    <>
      <ToolCard title="Text">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Start typing or paste text…" style={{ ...s.ta(280), fontFamily: "inherit" }} />
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          ["Words", String(stats.words)],
          ["Characters", String(stats.chars)],
          ["Characters (no spaces)", String(stats.charsNoSpace)],
          ["Sentences", String(stats.sentences)],
          ["Paragraphs", String(stats.paras)],
          ["Unique words", String(stats.unique)],
          ["Reading time", `${stats.readMin} min`],
          ["Speaking time", `${stats.speakMin} min`],
        ].map(([l, v]) => (
          <div key={l} style={{ ...s.card, margin: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--text)" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <CopyButton text={text} label="Copy text" size="md" />
      </div>
    </>
  );
}

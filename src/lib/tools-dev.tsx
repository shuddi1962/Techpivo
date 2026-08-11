"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle2, Copy, Download, RefreshCw, Upload,
} from "lucide-react";
import { s, CopyButton, Field, ToolCard, ErrorBox, OkBox, downloadText } from "./tools-ui";

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);
  const parsed = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: null as unknown, error: "" };
    try {
      return { ok: true as const, value: JSON.parse(input) as unknown, error: "" };
    } catch (e: any) {
      return { ok: false as const, value: null as unknown, error: e?.message || "Invalid JSON" };
    }
  }, [input]);
  const stats = useMemo(() => {
    if (!parsed.ok || parsed.value === null || typeof parsed.value !== "object") return null;
    const raw = JSON.stringify(parsed.value);
    const keys = raw.match(/"[^"]*"\s*:/g)?.length ?? 0;
    return {
      bytes: raw.length,
      type: Array.isArray(parsed.value)
        ? `Array (${(parsed.value as unknown[]).length} items)`
        : `Object (${Object.keys(parsed.value as object).length} keys)`,
      keys,
    };
  }, [parsed]);
  const output = useMemo(() => {
    if (!parsed.ok || parsed.value === null) return "";
    return JSON.stringify(parsed.value, null, indent);
  }, [parsed, indent]);
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label="Indentation">
            <select value={indent} onChange={(e) => setIndent(Number(e.target.value))} style={s.sel}>
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
              <option value={0}>Compact (no spaces)</option>
            </select>
          </Field>
          <div style={{ alignSelf: "flex-end" }}>
            <button
              style={s.btn}
              onClick={() =>
                setInput('{"name":"Techpivo","tools":["JSON Formatter","Regex Tester"],"free":true}')
              }
            >
              Try sample
            </button>
            <CopyButton text={output} label="Copy formatted" size="md" />
            {parsed.ok && parsed.value !== null && typeof parsed.value === "object" && (
              <button style={s.btn2} onClick={() => downloadText("formatted.json", output, "application/json")}>
                <Download size={14} /> Download
              </button>
            )}
          </div>
        </div>
      </ToolCard>
      {!parsed.ok && <ErrorBox>{parsed.error}</ErrorBox>}
      {parsed.ok && stats && (
        <OkBox>Valid JSON · {stats.type} · {stats.bytes} bytes · {stats.keys} keys</OkBox>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.lab}>Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste JSON here, e.g. {"name": "Techpivo"}'
            style={{ ...s.ta(380), whiteSpace: "pre", overflow: "auto" }}
            spellCheck={false}
          />
        </div>
        <div>
          <label style={s.lab}>Formatted output</label>
          <textarea
            readOnly
            value={output}
            placeholder="Formatted JSON appears here…"
            style={{ ...s.ta(380), whiteSpace: "pre", overflow: "auto" }}
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

const CSV_DELIMS = [
  { label: "Comma (,)", value: "," },
  { label: "Semicolon (;)", value: ";" },
  { label: "Tab", value: "\t" },
  { label: "Pipe (|)", value: "|" },
];

export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: (string | number | null | undefined)[][], delim: string): string {
  const formulaRisk = (v: string) => /^[=+@]/.test(v) || /^-(?=[A-Za-z=@])/.test(v) || /^[\t\r]/.test(v);
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const raw = cell === null || cell === undefined ? "" : String(cell);
          const v = formulaRisk(raw) ? "'" + raw : raw;
          return /["\n\r,;|\t]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(delim)
    )
    .join("\n");
}

export function CsvJsonTool() {
  const [mode, setMode] = useState<"csv2json" | "json2csv">("csv2json");
  const [delim, setDelim] = useState(",");
  const [input, setInput] = useState("");
  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, output: "", error: "", rows: 0 };
    try {
      if (mode === "csv2json") {
        const rows = parseCsv(input, delim);
        if (rows.length === 0) return { ok: true as const, output: "[]", error: "", rows: 0 };
        const headers = rows[0].map((h) => h.trim());
        const data = rows.slice(1).map((r) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => { obj[h || `col${i + 1}`] = r[i] ?? ""; });
          return obj;
        });
        return { ok: true as const, output: JSON.stringify(data, null, 2), error: "", rows: data.length };
      }
      const arr = JSON.parse(input);
      if (!Array.isArray(arr)) throw new Error("Top-level JSON must be an array");
      const cols = new Set<string>();
      arr.forEach((o) => {
        if (o && typeof o === "object") Object.keys(o as object).forEach((k) => cols.add(k));
      });
      const header = [...cols];
      const rows = [
        header,
        ...arr.map((o) => header.map((h) => (o && typeof o === "object" ? (o as any)[h] : null))),
      ];
      return { ok: true as const, output: toCsv(rows, delim), error: "", rows: arr.length };
    } catch (e: any) {
      return { ok: false as const, output: "", error: e?.message || "Conversion failed", rows: 0 };
    }
  }, [mode, delim, input]);
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label="Direction">
            <select value={mode} onChange={(e) => setMode(e.target.value as "csv2json" | "json2csv")} style={s.sel}>
              <option value="csv2json">CSV → JSON</option>
              <option value="json2csv">JSON → CSV</option>
            </select>
          </Field>
          <Field label="Delimiter">
            <select value={delim} onChange={(e) => setDelim(e.target.value)} style={s.sel}>
              {CSV_DELIMS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </ToolCard>
      {!result.ok && <ErrorBox>{result.error}</ErrorBox>}
      {result.ok && result.rows > 0 && (
        <OkBox>{result.rows} rows converted · <CopyButton text={result.output} label="Copy result" /></OkBox>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.lab}>{mode === "csv2json" ? "CSV input" : "JSON input"}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "csv2json" ? "name,age,role\nAda,24,Editor" : '[{"name":"Ada","age":24}]'}
            style={{ ...s.ta(360), whiteSpace: "pre" }}
            spellCheck={false}
          />
        </div>
        <div>
          <label style={s.lab}>{mode === "csv2json" ? "JSON output" : "CSV output"}</label>
          <textarea
            readOnly
            value={result.output}
            placeholder="Converted output appears here…"
            style={{ ...s.ta(360), whiteSpace: "pre" }}
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false, u: false });
  const [text, setText] = useState("");
  const [replace, setReplace] = useState("");
  const [showReplace, setShowReplace] = useState(false);

  const flagString = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join("");

  const { matches, error, replaced } = useMemo(() => {
    if (!pattern) return { matches: [] as RegExpExecArray[], error: "", replaced: text };
    try {
      const re = new RegExp(pattern, flagString);
      const found: RegExpExecArray[] = [];
      if (re.global) {
        const copy = new RegExp(pattern, flagString);
        let m: RegExpExecArray | null;
        let guard = 0;
        while ((m = copy.exec(text)) !== null && guard < 5000) {
          found.push(m);
          guard++;
          if (m.index === copy.lastIndex) copy.lastIndex++;
        }
      } else {
        const m = re.exec(text);
        if (m) found.push(m);
      }
      const rep = showReplace ? text.replace(new RegExp(pattern, flagString), replace) : "";
      return { matches: found, error: "", replaced: rep };
    } catch (e: any) {
      return { matches: [], error: e?.message || "Invalid pattern", replaced: text };
    }
  }, [pattern, flagString, text, replace, showReplace]);

  const highlight = useMemo(() => {
    if (!pattern || error) return [{ key: "0", text }];
    try {
      const re = new RegExp(pattern, flagString);
      const parts: { key: string; text: string; match?: boolean }[] = [];
      if (!re.global) {
        const m = re.exec(text);
        if (!m) return [{ key: "0", text }];
        return [
          { key: "0", text: text.slice(0, m.index) },
          { key: "1", text: m[0], match: true },
          { key: "2", text: text.slice(m.index + m[0].length) },
        ];
      }
      const copy = new RegExp(pattern, flagString);
      let last = 0;
      let m: RegExpExecArray | null;
      let i = 0;
      while ((m = copy.exec(text)) !== null && i < 5000) {
        if (m.index > last) parts.push({ key: `t${i}`, text: text.slice(last, m.index) });
        parts.push({ key: `m${i}`, text: m[0], match: true });
        last = m.index + m[0].length;
        if (copy.lastIndex === m.index) copy.lastIndex++;
        i++;
      }
      if (last < text.length) parts.push({ key: `t${i}`, text: text.slice(last) });
      return parts;
    } catch {
      return [{ key: "0", text }];
    }
  }, [pattern, flagString, text, error]);

  return (
    <>
      <ToolCard title="Options">
        <Field label="Pattern">
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="e.g. ^\d{3}-\d{3}-\d{4}$"
            style={{ ...s.inp, fontFamily: "monospace" }}
            spellCheck={false}
          />
        </Field>
        <div style={{ ...s.row, marginTop: 10 }}>
          {(["g", "i", "m", "s", "u"] as const).map((f) => (
            <label key={f} style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={flags[f]} onChange={(e) => setFlags({ ...flags, [f]: e.target.checked })} />
              /{f}
            </label>
          ))}
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={showReplace} onChange={(e) => setShowReplace(e.target.checked)} />
            Replace mode
          </label>
        </div>
        {showReplace && (
          <div style={{ marginTop: 10 }}>
            <Field label="Replacement (supports $1 groups)">
              <input
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder="$1-$2"
                style={{ ...s.inp, fontFamily: "monospace" }}
                spellCheck={false}
              />
            </Field>
          </div>
        )}
      </ToolCard>
      {error && <ErrorBox>{error}</ErrorBox>}
      <OkBox>{matches.length} match{matches.length === 1 ? "" : "es"} found</OkBox>
      <ToolCard title="Test text">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text to test against…"
          maxLength={20000}
          style={{ ...s.ta(160), fontFamily: "inherit" }}
        />
        <div
          style={{
            background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8,
            padding: 10, fontSize: 13, marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word",
            color: "var(--text)",
          }}
        >
          {highlight.map((p) =>
            p.match ? (
              <mark key={p.key} style={{ background: "#FDE68A", color: "#1F2937", borderRadius: 2, padding: "0 1px" }}>
                {p.text}
              </mark>
            ) : (
              <span key={p.key}>{p.text}</span>
            )
          )}
        </div>
      </ToolCard>
      {showReplace && (
        <ToolCard title="Replaced output">
          <textarea readOnly value={replaced} style={{ ...s.ta(100), fontFamily: "inherit" }} />
        </ToolCard>
      )}
      {matches.length > 0 && (
        <ToolCard title="Match details">
          <div style={{ maxHeight: 220, overflow: "auto", fontSize: 13 }}>
            {matches.slice(0, 200).map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 8px", borderBottom: "1px solid var(--border)",
                  display: "flex", gap: 10, alignItems: "baseline",
                }}
              >
                <span style={{ color: "var(--muted)", fontWeight: 700, width: 48, flexShrink: 0 }}>#{i + 1}</span>
                <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{m[0]}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>pos {m.index}</span>
                {m.length > 1 && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    groups: [{m.slice(1).map((g) => `"${g ?? ""}"`).join(", ")}]
                  </span>
                )}
              </div>
            ))}
          </div>
        </ToolCard>
      )}
    </>
  );
}

export function Base64Tool({ mode }: { mode: "encode" | "decode" }) {
  const [input, setInput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [fileResult, setFileResult] = useState<{ data: string; name: string } | null>(null);

  const output = useMemo(() => {
    if (!input) return "";
    try {
      if (mode === "encode") {
        const bytes = new TextEncoder().encode(input);
        let b64 = btoa(String.fromCharCode(...bytes));
        if (urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        return b64;
      }
      let clean = input.trim().replace(/\s+/g, "");
      if (urlSafe || /[-_]/.test(clean)) clean = clean.replace(/-/g, "+").replace(/_/g, "/");
      while (clean.length % 4) clean += "=";
      const bin = atob(clean);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch (e: any) {
      return `Error: ${e?.message || "invalid Base64"}`;
    }
  }, [mode, input, urlSafe]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (mode === "encode") {
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let b64 = btoa(String.fromCharCode(...bytes));
        if (urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        setFileResult({ data: b64, name: `${file.name}.b64.txt` });
      } catch {
        setFileResult(null);
      }
    } else {
      try {
        const text = await file.text();
        let clean = text.trim().replace(/\s+/g, "");
        if (/[-_]/.test(clean)) clean = clean.replace(/-/g, "+").replace(/_/g, "/");
        while (clean.length % 4) clean += "=";
        const bin = atob(clean);
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        const blob = new Blob([bytes]);
        downloadBlobFromBytes(blob, file.name.replace(/\.(b64|txt|base64)$/i, "") + "-decoded.bin");
        setFileResult(null);
      } catch (e: any) {
        setFileResult(null);
        alert(`Could not decode file: ${e?.message}`);
      }
    }
  };

  return (
    <>
      <ToolCard title="Options">
        <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
          URL-safe alphabet (− _ and no padding)
        </label>
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.lab}>{mode === "encode" ? "Input text / file" : "Base64 string"}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "Hello Techpivo…" : "SGVsbG8gVGVjaHBpdm8="}
            style={{ ...s.ta(220), whiteSpace: "pre" }}
            spellCheck={false}
          />
          <div style={{ marginTop: 8 }}>
            <label style={{ ...s.btn2, cursor: "pointer" }} htmlFor="b64-file">
              <Upload size={14} /> {mode === "encode" ? "Encode a file" : "Decode a .b64 file"}
            </label>
            <input id="b64-file" type="file" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {fileResult && (
            <div style={{ ...s.ok, marginTop: 8 }}>
              File encoded ·{" "}
              <button style={{ ...s.btn2, padding: "4px 10px", fontSize: 12 }} onClick={() => downloadText(fileResult.name, fileResult.data, "text/plain")}>
                <Download size={12} /> Save
              </button>
            </div>
          )}
        </div>
        <div>
          <label style={s.lab}>Output</label>
          <textarea readOnly value={output} placeholder="Result appears here…" style={{ ...s.ta(220) }} spellCheck={false} />
          <div style={{ marginTop: 8 }}>
            <CopyButton text={output.startsWith("Error:") ? "" : output} size="md" />
          </div>
        </div>
      </div>
    </>
  );
}

function downloadBlobFromBytes(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function UrlEncodeTool({ mode }: { mode: "encode" | "decode" }) {
  const [input, setInput] = useState("");
  const [component, setComponent] = useState(true);
  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "encode") return component ? encodeURIComponent(input) : encodeURI(input);
    try {
      const val = input.replace(/\+/g, " ");
      return component ? decodeURIComponent(val) : decodeURI(val);
    } catch {
      return "Error: malformed percent-encoding";
    }
  }, [mode, input, component]);
  return (
    <>
      <ToolCard title="Options">
        <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={component} onChange={(e) => setComponent(e.target.checked)} />
          {mode === "encode"
            ? "Component mode (encodes / and ? — for query values)"
            : "Component mode (decodes %2F etc.)"}
        </label>
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.lab}>Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "https://techpivo.com/tools?from=technology&page=2" : "https%3A%2F%2Ftechpivo.com%2Ftools"}
            style={{ ...s.ta(180), whiteSpace: "pre" }}
            spellCheck={false}
          />
        </div>
        <div>
          <label style={s.lab}>Output</label>
          <textarea readOnly value={output} style={{ ...s.ta(180), whiteSpace: "pre" }} spellCheck={false} />
          <div style={{ marginTop: 8 }}>
            <CopyButton text={output.startsWith("Error:") ? "" : output} size="md" />
          </div>
        </div>
      </div>
    </>
  );
}

const HASH_ALGOS = [
  { label: "SHA-1", value: "SHA-1" },
  { label: "SHA-256", value: "SHA-256" },
  { label: "SHA-384", value: "SHA-384" },
  { label: "SHA-512", value: "SHA-512" },
];

export function HashTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!input) { setResults({}); return; }
    let cancelled = false;
    setBusy(true);
    const run = async () => {
      const out: Record<string, string> = {};
      for (const algo of HASH_ALGOS) {
        try {
          const digest = await crypto.subtle.digest(algo.value, new TextEncoder().encode(input));
          if (cancelled) return;
          out[algo.value] = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
        } catch {
          out[algo.value] = "";
        }
      }
      if (!cancelled) { setResults(out); setBusy(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [input]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.lab}>Input text</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text to hash…"
            style={{ ...s.ta(220), fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={s.lab}>Hashes (all algorithms, live via Web Crypto)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {HASH_ALGOS.map((a) => (
              <div key={a.value} style={{ ...s.card, padding: 10, margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{a.label}</span>
                  <button
                    style={{ ...s.btn2, padding: "4px 10px", fontSize: 12 }}
                    onClick={() => navigator.clipboard.writeText(results[a.value] || "")}
                    disabled={!results[a.value]}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--text)" }}>
                  {busy ? "computing…" : results[a.value] || "—"}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <CopyButton text={results["SHA-256"] || ""} label="Copy SHA-256" size="md" />
          </div>
        </div>
      </div>
      <div style={{ ...s.card, marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          MD5 is intentionally not offered: browsers do not expose it in Web Crypto and MD5 is cryptographically broken. SHA-256 is the recommended replacement.
        </div>
      </div>
    </>
  );
}

export function UuidTool() {
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const list = useMemo(() => {
    const n = Math.max(1, Math.min(100, count));
    return Array.from({ length: n }, () => {
      let u = crypto.randomUUID();
      if (!hyphens) u = u.replace(/-/g, "");
      if (upper) u = u.toUpperCase();
      return u;
    });
  }, [count, upper, hyphens]);
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label="How many">
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} style={{ ...s.inp, width: 90 }} />
          </Field>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> Uppercase
          </label>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} /> Hyphens
          </label>
        </div>
      </ToolCard>
      <ToolCard title="UUIDs (RFC 4122 v4, crypto.randomUUID)">
        <div style={{ maxHeight: 300, overflow: "auto", fontSize: 13, fontFamily: "monospace" }}>
          {list.map((u, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 4px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text)" }}>{u}</span>
              <button style={{ ...s.btn2, padding: "3px 8px", fontSize: 11 }} onClick={() => navigator.clipboard.writeText(u)}>
                <Copy size={11} /> Copy
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <CopyButton text={list.join("\n")} label="Copy all" size="md" />
        </div>
      </ToolCard>
    </>
  );
}

export function JwtTool() {
  const [token, setToken] = useState("");
  const parsed = useMemo(() => {
    const parts = token.trim().split(".");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    const decode = (seg: string) => {
      let val = seg.replace(/-/g, "+").replace(/_/g, "/");
      while (val.length % 4) val += "=";
      const bin = atob(val);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    };
    try {
      const header = JSON.parse(decode(parts[0]));
      const payload = JSON.parse(decode(parts[1]));
      const exp = payload.exp ? new Date(payload.exp * 1000) : null;
      const expired = exp ? exp.getTime() < Date.now() : null;
      return { header, payload, exp, expired, validSignatureShape: parts.length === 3 };
    } catch (e: any) {
      return { error: e?.message || "Malformed JWT" };
    }
  }, [token]);
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Field label="Paste your JWT token">
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ…"
            style={{ ...s.ta(90), fontFamily: "inherit" }}
            spellCheck={false}
          />
        </Field>
      </div>
      {!parsed && (
        <OkBox>Paste a token above — it is decoded locally and never sent anywhere.</OkBox>
      )}
      {parsed && "error" in parsed && <ErrorBox>{parsed.error}</ErrorBox>}
      {parsed && !("error" in parsed) && (
        <>
          {parsed.expired !== null && (
            <div style={{ ...(parsed.expired ? s.err : s.ok), marginBottom: 12 }}>
              {parsed.expired ? "Token EXPIRED" : "Token valid"} · {parsed.exp?.toLocaleString()}{" "}
              {parsed.expired ? "(expired)" : "(expires)"} ·{" "}
              {parsed.validSignatureShape ? "3 segments (signature present — not verified)" : "2 segments (no signature part)"}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={s.lab}>Header</label>
              <textarea readOnly value={JSON.stringify(parsed.header, null, 2)} style={{ ...s.ta(180), whiteSpace: "pre" }} />
              <div style={{ marginTop: 6 }}><CopyButton text={JSON.stringify(parsed.header, null, 2)} /></div>
            </div>
            <div>
              <label style={s.lab}>Payload</label>
              <textarea readOnly value={JSON.stringify(parsed.payload, null, 2)} style={{ ...s.ta(180), whiteSpace: "pre" }} />
              <div style={{ marginTop: 6 }}><CopyButton text={JSON.stringify(parsed.payload, null, 2)} /></div>
            </div>
          </div>
          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Signatures are never verified (that requires the secret) — and this tool deliberately never asks for it.
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function TimestampTool() {
  const [unix, setUnix] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const unixToDate = useMemo(() => {
    if (!unix.trim()) return "";
    const n = Number(unix.trim());
    if (!Number.isFinite(n)) return "Invalid number";
    const ms = Math.abs(n) < 100000000000 ? n * 1000 : n;
    return new Date(ms).toLocaleString();
  }, [unix]);
  const dateToUnix = useMemo(() => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "Invalid date";
    return `${Math.floor(d.getTime() / 1000)} s / ${d.getTime()} ms`;
  }, [dateStr]);
  return (
    <>
      <ToolCard title="Current time">
        <div style={s.row}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", fontFamily: "monospace" }}>
            {now.toLocaleString()}
          </span>
          <button style={s.btn2} onClick={() => setUnix(String(Math.floor(Date.now() / 1000)))}>
            Use now (seconds)
          </button>
          <button style={s.btn2} onClick={() => setUnix(String(Date.now()))}>Use now (ms)</button>
        </div>
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ToolCard title="Unix → Date" style={{ margin: 0 }}>
          <Field label="Unix timestamp (seconds or ms, auto-detected)">
            <input value={unix} onChange={(e) => setUnix(e.target.value)} placeholder="1786261417" style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <div style={{ ...s.ok, marginTop: 10, fontSize: 15 }}>{unixToDate}</div>
          <div style={{ marginTop: 8 }}><CopyButton text={unixToDate} /></div>
        </ToolCard>
        <ToolCard title="Date → Unix" style={{ margin: 0 }}>
          <Field label="Date and time">
            <input type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <div style={{ ...s.ok, marginTop: 10, fontSize: 15, wordBreak: "break-all" }}>{dateToUnix}</div>
          <div style={{ marginTop: 8 }}><CopyButton text={dateToUnix.split(" s /")[0]} /></div>
        </ToolCard>
      </div>
    </>
  );
}

const CRON_PRESETS: Record<string, string> = {
  "Every minute": "* * * * *",
  "Every 5 minutes": "*/5 * * * *",
  "Every 15 minutes": "*/15 * * * *",
  "Every 30 minutes": "*/30 * * * *",
  "Hourly": "0 * * * *",
  "Every 6 hours": "0 */6 * * *",
  "Daily at midnight": "0 0 * * *",
  "Daily at 3:00 AM": "0 3 * * *",
  "Weekly (Mon 8 AM)": "0 8 * * 1",
  "Weekdays 9 AM": "0 9 * * 1-5",
  "Monthly (1st, midnight)": "0 0 1 * *",
  "Yearly (Jan 1)": "0 0 1 1 *",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CronTool() {
  const [preset, setPreset] = useState("Daily at midnight");
  const [minute, setMinute] = useState("0");
  const [hour, setHour] = useState("0");
  const [dom, setDom] = useState("*");
  const [month, setMonth] = useState("*");
  const [dow, setDow] = useState("*");
  const applyPreset = (key: string) => {
    setPreset(key);
    const [m, h, d, mo, w] = CRON_PRESETS[key].split(" ");
    setMinute(m); setHour(h); setDom(d); setMonth(mo); setDow(w);
  };
  const expr = [minute, hour, dom, month, dow].join(" ");
  const description = useMemo(() => {
    const [m, h, d, mo, w] = expr.split(" ");
    if (m === "*" && h === "*") return "Every minute";
    if (m.startsWith("*/") && h === "*") return `Every ${m.slice(2)} minutes`;
    if (m !== "*" && h === "*") return `Every hour at minute ${m}`;
    if (m === "0" && h !== "*" && d === "*" && w === "*" && mo === "*") return `Daily at ${h.padStart(2, "0")}:00`;
    if (m === "0" && h !== "*" && d === "*" && mo === "*" && w !== "*" && /^[0-6](-[0-6])?$/.test(w)) {
      const [s, e] = w.split("-").map((x) => Number(x));
      return `Every ${WEEKDAYS[s]}${e !== undefined ? ` through ${WEEKDAYS[e]}` : ""} at ${h.padStart(2, "0")}:00`;
    }
    if (d !== "*" && mo === "*" && w === "*") return `On day ${d} of every month at ${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    return "Custom schedule — verify carefully";
  }, [expr]);
  const hourOptions = ["*", ...Array.from({ length: 24 }, (_, i) => String(i))];
  const minuteOptions = ["*", ...Array.from({ length: 60 }, (_, i) => String(i))];
  const custom = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    fn(e.target.value);
    setPreset("Custom");
  };
  return (
    <>
      <ToolCard title="Presets">
        <select value={preset} onChange={(e) => applyPreset(e.target.value)} style={{ ...s.sel, width: "100%" }}>
          {Object.keys(CRON_PRESETS).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </ToolCard>
      <ToolCard title="Custom fields">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <Field label="Minute">
            <select value={minute} onChange={custom(setMinute)} style={{ ...s.sel, width: "100%" }}>
              {minuteOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Hour">
            <select value={hour} onChange={custom(setHour)} style={{ ...s.sel, width: "100%" }}>
              {hourOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Day of month">
            <input value={dom} onChange={custom(setDom)} placeholder="* / 1-31" style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <Field label="Month">
            <input value={month} onChange={custom(setMonth)} placeholder="* / 1-12" style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <Field label="Day of week">
            <input value={dow} onChange={custom(setDow)} placeholder="* / 0-6" style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
        </div>
        <div style={{ ...s.ok, marginTop: 12, fontFamily: "monospace", fontSize: 16 }}>{expr}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{description}</div>
        <div style={{ marginTop: 8 }}><CopyButton text={expr} label="Copy expression" size="md" /></div>
      </ToolCard>
    </>
  );
}

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit",
  "voluptate", "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
  "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum",
];

export function LoremTool() {
  const [type, setType] = useState<"paragraphs" | "sentences" | "words">("paragraphs");
  const [count, setCount] = useState(3);
  const [nonce, setNonce] = useState(0);
  const output = useMemo(() => {
    const sentence = () => {
      const n = 8 + Math.floor(Math.random() * 8);
      const words = Array.from({ length: n }, () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
      return words[0].charAt(0).toUpperCase() + words[0].slice(1) + " " + words.slice(1).join(" ") + ".";
    };
    const paragraph = () => Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sentence).join(" ");
    const c = Math.max(1, Math.min(50, count));
    if (type === "paragraphs") return Array.from({ length: c }, paragraph).join("\n\n");
    if (type === "sentences") return Array.from({ length: c }, sentence).join(" ");
    return Array.from({ length: c }, () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]).join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, count, nonce]);
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as "paragraphs" | "sentences" | "words")} style={s.sel}>
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
            </select>
          </Field>
          <Field label="Amount">
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} style={{ ...s.inp, width: 90 }} />
          </Field>
          <button style={s.btn2} onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw size={14} /> Shuffle
          </button>
        </div>
      </ToolCard>
      <ToolCard title="Generated text">
        <textarea readOnly value={output} style={{ ...s.ta(260), fontFamily: "inherit" }} />
        <div style={{ marginTop: 8 }}>
          <CopyButton text={output} size="md" />
          <button style={{ ...s.btn2, marginLeft: 8, padding: "8px 18px" }} onClick={() => downloadText("lorem-ipsum.txt", output)}>
            <Download size={14} /> Download .txt
          </button>
        </div>
      </ToolCard>
    </>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;
  let listType = "ul";
  const closeList = () => {
    if (inList) { html += `</${listType}>`; inList = false; }
  };
  const inline = (t: string) => {
    let value = escapeHtml(t);
    value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
    value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    value = value.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return value;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    if (/^#{1,6}\s/.test(line)) {
      closeList();
      const level = line.match(/^(#+)/)![1].length;
      html += `<h${level}>${inline(line.replace(/^#+\s/, ""))}</h${level}>`;
    } else if (/^[-*]\s/.test(line)) {
      if (!inList || listType !== "ul") { closeList(); inList = true; listType = "ul"; html += "<ul>"; }
      html += `<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`;
    } else if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== "ol") { closeList(); inList = true; listType = "ol"; html += "<ol>"; }
      html += `<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`;
    } else if (line.startsWith("> ")) {
      closeList();
      html += `<blockquote>${inline(line.replace(/^> /, ""))}</blockquote>`;
    } else if (/^\|.*\|$/.test(line) && /^\|[\s:-|]+\|$/.test(line)) {
      continue;
    } else if (/^\|.*\|$/.test(line)) {
      closeList();
      const cells = line.split("|").slice(1, -1).map((c) => inline(c.trim()));
      html += `<table><tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr></table>`;
    } else if (line.trim() === "") {
      closeList();
    } else if (line.startsWith("---")) {
      closeList();
      html += "<hr />";
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

export function MarkdownTool() {
  const [md, setMd] = useState(
    "## Welcome\n\nWrite **markdown** on the left and see it render live.\n\n- Item one\n- Item two\n\n> A blockquote.\n\n```\ncode block\n```"
  );
  const html = useMemo(() => renderMarkdown(md), [md]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div>
        <label style={s.lab}>Markdown</label>
        <textarea value={md} onChange={(e) => setMd(e.target.value)} style={{ ...s.ta(420), fontFamily: "inherit" }} spellCheck={false} />
      </div>
      <div>
        <label style={s.lab}>Preview</label>
        <div
          style={{ ...s.ta(420), overflow: "auto", fontFamily: "inherit" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

const CASE_STYLES = [
  { key: "uppercase", label: "UPPERCASE" },
  { key: "lowercase", label: "lowercase" },
  { key: "title", label: "Title Case" },
  { key: "sentence", label: "Sentence case" },
  { key: "camel", label: "camelCase" },
  { key: "pascal", label: "PascalCase" },
  { key: "snake", label: "snake_case" },
  { key: "kebab", label: "kebab-case" },
  { key: "constant", label: "CONSTANT_CASE" },
  { key: "dot", label: "dot.case" },
];

export function caseTransform(input: string, style: string): string {
  const words = () => input.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  switch (style) {
    case "uppercase": return input.toUpperCase();
    case "lowercase": return input.toLowerCase();
    case "title": return words().map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    case "sentence": {
      const value = input.toLowerCase();
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    case "camel": return words().map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join("");
    case "pascal": return words().map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "snake": return words().map((w) => w.toLowerCase()).join("_");
    case "kebab": return words().map((w) => w.toLowerCase()).join("-");
    case "constant": return words().map((w) => w.toUpperCase()).join("_");
    case "dot": return words().map((w) => w.toLowerCase()).join(".");
    default: return input;
  }
}

export function CaseTool() {
  const [input, setInput] = useState("");
  return (
    <>
      <ToolCard title="Input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste any text, e.g. hello world from techpivo"
          style={{ ...s.ta(110), fontFamily: "inherit" }}
        />
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {CASE_STYLES.map((c) => (
          <ToolCard key={c.key} style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", flexShrink: 0, width: 110 }}>{c.label}</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", flexGrow: 1, color: "var(--text)" }}>
                {caseTransform(input, c.key)}
              </span>
              <CopyButton text={caseTransform(input, c.key)} />
            </div>
          </ToolCard>
        ))}
      </div>
    </>
  );
}

export function SlugTool() {
  const [input, setInput] = useState("");
  const [maxLen, setMaxLen] = useState(60);
  const slug = useMemo(() => {
    let value = input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (maxLen > 0 && value.length > maxLen) {
      const cut = value.slice(0, maxLen).replace(/-[^-]*$/, "");
      value = cut.length > 0 ? cut : value.slice(0, maxLen);
    }
    return value;
  }, [input, maxLen]);
  return (
    <>
      <ToolCard title="Title or phrase">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="10 Best Programming Languages to Learn in 2026"
          style={{ ...s.ta(90), fontFamily: "inherit" }}
        />
      </ToolCard>
      <ToolCard title="Options">
        <Field label={`Max length (${maxLen === 0 ? "no limit" : maxLen})`}>
          <input type="range" min={0} max={100} value={maxLen} onChange={(e) => setMaxLen(Number(e.target.value))} style={{ width: "100%" }} />
        </Field>
      </ToolCard>
      <div style={{ ...s.card, marginBottom: 12 }}>
        <label style={s.lab}>Your URL slug</label>
        <div style={{ ...s.ok, fontFamily: "monospace", fontSize: 15, wordBreak: "break-all" }}>{slug || "—"}</div>
        <div style={{ marginTop: 8 }}><CopyButton text={slug} label="Copy slug" size="md" /></div>
      </div>
      <div style={{ ...s.card }}>
        <label style={s.lab}>Full URL preview</label>
        <div style={{ fontFamily: "monospace", fontSize: 14, color: "var(--accent)", wordBreak: "break-all" }}>
          https://techpivo.com/{slug || "{slug}"}
        </div>
      </div>
    </>
  );
}

export function entropyOf(password: string): number {
  const sets = {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digits: /\d/.test(password),
    sym: /[^a-zA-Z0-9]/.test(password),
  };
  let pool = 0;
  if (sets.lower) pool += 26;
  if (sets.upper) pool += 26;
  if (sets.digits) pool += 10;
  if (sets.sym) pool += 32;
  return pool === 0 ? 0 : password.length * Math.log2(pool);
}

export function passwordVerdict(entropy: number): { label: string; color: string } {
  if (entropy < 40) return { label: "Weak", color: "#DC2626" };
  if (entropy < 60) return { label: "Okay", color: "#D97706" };
  if (entropy < 80) return { label: "Strong", color: "#059669" };
  return { label: "Very strong", color: "#047857" };
}

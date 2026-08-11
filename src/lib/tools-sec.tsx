"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import { s, CopyButton, Field, ToolCard, ErrorBox, OkBox } from "./tools-ui";
import { entropyOf, passwordVerdict } from "./tools-dev";

export function PasswordGenTool() {
  const [len, setLen] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [exclude, setExclude] = useState(true);
  const [count, setCount] = useState(3);

  const generate = () => {
    let chars = "";
    if (lower) chars += "abcdefghijkmnpqrstuvwxyz";
    if (upper) chars += "ABCDEFGHJKLMNPQRSTUVWXYZ";
    if (digits) chars += "23456789";
    if (symbols) chars += "!@#$%^&*()-_=+[]{};:,.<>?";
    if (exclude) chars = chars.replace(/[Il1O0o]/g, "");
    if (!chars) return [];
    const rnd = new Uint32Array(len * count);
    crypto.getRandomValues(rnd);
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      let p = "";
      for (let j = 0; j < len; j++) p += chars[rnd[i * len + j] % chars.length];
      out.push(p);
    }
    return out;
  };
  const [passwords, setPasswords] = useState<string[]>(() => generate());

  return (
    <>
      <ToolCard title="Options">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <Field label={`Length: ${len}`}>
            <input type="range" min={8} max={64} value={len} onChange={(e) => setLen(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
          <Field label="How many">
            <input
              type="number" min={1} max={10} value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              style={{ ...s.inp, width: 90 }}
            />
          </Field>
        </div>
        <div style={{ ...s.row, marginTop: 10 }}>
          {[
            { k: "lower", l: "Lowercase (a-z)" },
            { k: "upper", l: "Uppercase (A-Z)" },
            { k: "digits", l: "Digits (2-9)" },
            { k: "symbols", l: "Symbols (!@#$…)" },
            { k: "exclude", l: "Avoid ambiguous (Il1O0o)" },
          ].map((o) => (
            <label key={o.k} style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={o.k === "lower" ? lower : o.k === "upper" ? upper : o.k === "digits" ? digits : o.k === "symbols" ? symbols : exclude}
                onChange={(e) => {
                  const v = e.target.checked;
                  if (o.k === "lower") setLower(v);
                  if (o.k === "upper") setUpper(v);
                  if (o.k === "digits") setDigits(v);
                  if (o.k === "symbols") setSymbols(v);
                  if (o.k === "exclude") setExclude(v);
                }}
              />
              {o.l}
            </label>
          ))}
          <button style={s.btn} onClick={() => setPasswords(generate())}>
            <RefreshCw size={14} /> Generate
          </button>
        </div>
      </ToolCard>
      <ToolCard title="Generated passwords (crypto-secure)">
        {passwords.map((p, i) => {
          const verdict = passwordVerdict(entropyOf(p));
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "7px 2px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all", color: "var(--text)" }}>{p}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ ...s.tag, background: `${verdict.color}18`, color: verdict.color }}>{verdict.label}</span>
                <button style={{ ...s.btn2, padding: "4px 10px", fontSize: 12 }} onClick={() => navigator.clipboard.writeText(p)}>
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>
          );
        })}
      </ToolCard>
    </>
  );
}

export function PasswordStrengthTool() {
  const [password, setPassword] = useState("");
  const analysis = useMemo(() => {
    if (!password) return null;
    const len = password.length;
    const lower = /[a-z]/.test(password);
    const upper = /[A-Z]/.test(password);
    const digits = /\d/.test(password);
    const symbols = /[^a-zA-Z0-9]/.test(password);
    const poolsUsed = [lower, upper, digits, symbols].filter(Boolean).length;
    const ent = entropyOf(password);
    const verdict = passwordVerdict(ent);
    let crack = "less than a second";
    if (ent >= 40) crack = "minutes";
    if (ent >= 55) crack = "hours";
    if (ent >= 65) crack = "days";
    if (ent >= 75) crack = "months";
    if (ent >= 85) crack = "years";
    if (ent >= 95) crack = "centuries";
    const common = /^(password|123456|qwerty|admin|letmein|welcome|iloveyou|monkey|dragon|football|baseball)$/i.test(password);
    const repeated = /(.)\1{3,}/.test(password);
    const sequential = /(0123|1234|2345|3456|4567|5678|6789|8901|abcd|bcde|cdef|xyz)/.test(password.toLowerCase());
    return { len, poolsUsed, ent, verdict, crack, warnings: { common, repeated, sequential, short: len < 8 } };
  }, [password]);
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Field label="Enter a password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Type to analyze…" style={{ ...s.inp, fontSize: 16 }} />
        </Field>
      </div>
      {!analysis && <OkBox>Type above — analysis runs locally, nothing is sent anywhere.</OkBox>}
      {analysis && (
        <>
          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: analysis.verdict.color }}>{analysis.verdict.label}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>~{Math.round(analysis.ent)} bits of entropy</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, analysis.ent)}%`, background: analysis.verdict.color, transition: "width .2s" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              ["Length", `${analysis.len} characters`, !analysis.warnings.short ? "#047857" : "#DC2626"],
              ["Character sets", `${analysis.poolsUsed}/4 (upper, lower, digits, symbols)`, analysis.poolsUsed >= 3 ? "#047857" : "#D97706"],
              ["Estimated crack time", analysis.crack, "#047857"],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ ...s.card, margin: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{l}</div>
                <div style={{ fontSize: 14, color: c as string, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
          {(analysis.warnings.common || analysis.warnings.repeated || analysis.warnings.sequential) && (
            <div style={{ ...s.err, marginTop: 12 }}>
              {analysis.warnings.common && <div>• This looks like a very common password.</div>}
              {analysis.warnings.repeated && <div>• Repeated characters reduce strength.</div>}
              {analysis.warnings.sequential && <div>• Sequential patterns (1234, abcd) are easy to guess.</div>}
            </div>
          )}
        </>
      )}
    </>
  );
}

const RANDOM_CHARSETS = [
  { label: "Letters only", value: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { label: "Digits only", value: "0123456789" },
  { label: "Letters + digits", value: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
  { label: "Alphanumeric + symbols", value: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*" },
];

export function RandomStringTool() {
  const [len, setLen] = useState(12);
  const [charset, setCharset] = useState(RANDOM_CHARSETS[2].value);
  const [count, setCount] = useState(5);
  const generate = () => {
    if (!charset) return [];
    const rnd = new Uint32Array(len * count);
    crypto.getRandomValues(rnd);
    return Array.from({ length: count }, (_, i) => {
      let out = "";
      for (let j = 0; j < len; j++) out += charset[rnd[i * len + j] % charset.length];
      return out;
    });
  };
  const [list, setList] = useState<string[]>(() => generate());
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label={`Length: ${len}`}>
            <input type="range" min={4} max={64} value={len} onChange={(e) => setLen(Number(e.target.value))} style={{ width: 160 }} />
          </Field>
          <Field label="Count">
            <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} style={{ ...s.inp, width: 80 }} />
          </Field>
          <button style={s.btn} onClick={() => setList(generate())}>
            <RefreshCw size={14} /> Generate
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <Field label="Character set">
            <select value={charset} onChange={(e) => setCharset(e.target.value)} style={{ ...s.sel, width: "100%" }}>
              {RANDOM_CHARSETS.map((c) => (
                <option key={c.label} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </ToolCard>
      <ToolCard title="Generated strings">
        {list.map((str, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", color: "var(--text)" }}>{str}</span>
            <button style={{ ...s.btn2, padding: "4px 10px", fontSize: 12 }} onClick={() => navigator.clipboard.writeText(str)}>
              <Copy size={12} /> Copy
            </button>
          </div>
        ))}
        <div style={{ marginTop: 8 }}><CopyButton text={list.join("\n")} label="Copy all" /></div>
      </ToolCard>
    </>
  );
}

export function RandomNumberTool() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(5);
  const [decimals, setDecimals] = useState(false);
  const values = useMemo(() => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Array.from({ length: Math.max(1, Math.min(50, count)) }, () => {
      const n = lo + Math.random() * (hi - lo);
      return decimals ? Number(n.toFixed(4)) : Math.round(n);
    });
  }, [min, max, count, decimals]);
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <Field label="Min"><input type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} style={{ ...s.inp, width: 110 }} /></Field>
          <Field label="Max"><input type="number" value={max} onChange={(e) => setMax(Number(e.target.value))} style={{ ...s.inp, width: 110 }} /></Field>
          <Field label="Count"><input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} style={{ ...s.inp, width: 80 }} /></Field>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={decimals} onChange={(e) => setDecimals(e.target.checked)} /> Decimals
          </label>
        </div>
      </ToolCard>
      <ToolCard title="Results">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {values.map((v, i) => (
            <span key={i} style={{ ...s.card, margin: 0, fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "var(--text)", minWidth: 70, textAlign: "center" }}>
              {v}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 10 }}><CopyButton text={values.join(", ")} label="Copy numbers" /></div>
      </ToolCard>
    </>
  );
}

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com", "throwawaymail.com",
  "yopmail.com", "trashmail.com", "dispostable.com", "maildrop.cc", "getnada.com",
  "temp-mail.org", "mailnesia.com", "mytemp.email", "tmpmail.org", "sharklasers.com",
];

const EMAIL_TYPOS: Record<string, string> = {
  "gmail.con": "gmail.com", "gmial.com": "gmail.com", "gmali.com": "gmail.com", "gmail.cm": "gmail.com",
  "gmail.co": "gmail.com", "yahoo.cm": "yahoo.com", "yahoo.co": "yahoo.com", "yahooo.com": "yahoo.com",
  "hotmail.cm": "hotmail.com", "hotmial.com": "hotmail.com", "outlok.com": "outlook.com",
  "gnail.com": "gmail.com", "gmal.com": "gmail.com", "yaho.com": "yahoo.com",
};

export function EmailValidatorTool() {
  const [email, setEmail] = useState("");
  const result = useMemo(() => {
    const value = email.trim().toLowerCase();
    if (!value) return null;
    const emailRe =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    const formatOk = emailRe.test(value);
    const domain = value.split("@")[1];
    const disposable = domain ? DISPOSABLE_DOMAINS.includes(domain) : false;
    const typo = domain ? EMAIL_TYPOS[domain] : undefined;
    const local = value.split("@")[0];
    const localIssues = local.length === 0 || local.length > 64;
    return { formatOk, disposable, typo, localIssues, domain };
  }, [email]);
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Field label="Email address">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...s.inp, fontSize: 15 }} />
        </Field>
      </div>
      {result &&
        (result.formatOk && !result.disposable && !result.typo ? (
          <OkBox>&quot;{email.trim()}&quot; looks like a valid email format.</OkBox>
        ) : (
          <ErrorBox>
            {!result.formatOk && <div>• Invalid format — expected name@domain.tld.</div>}
            {result.localIssues && <div>• Local part is empty or too long.</div>}
            {result.typo && <div>• Did you mean @{result.typo}? (common typo)</div>}
            {result.disposable && <div>• @{result.domain} is a disposable email domain — consider another address.</div>}
          </ErrorBox>
        ))}
      {!result && <OkBox>Type an address above for instant validation.</OkBox>}
      {result && (
        <div style={{ ...s.card }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Note: this checks format locally only. Verifying that a mailbox actually exists requires a server-side SMTP check, which we deliberately do not perform.
          </div>
        </div>
      )}
    </>
  );
}

function luhnValid(num: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function detectCardBrand(num: string): { brand: string; pattern: RegExp } | null {
  const brands: { brand: string; pattern: RegExp }[] = [
    { brand: "Visa", pattern: /^4/ },
    { brand: "Mastercard", pattern: /^(5[1-5]|2[2-7])/ },
    { brand: "American Express", pattern: /^3[47]/ },
    { brand: "Discover", pattern: /^(6011|65|64[4-9])/ },
    { brand: "JCB", pattern: /^35(2[89]|[3-8])/ },
    { brand: "Diners Club", pattern: /^(30[0-5]|36|38)/ },
  ];
  return brands.find((b) => b.pattern.test(num)) || null;
}

export function CreditCardTool() {
  const [digits, setDigits] = useState("");
  const result = useMemo(() => {
    const num = digits.replace(/[\s-]/g, "");
    if (!num) return null;
    const numeric = /^\d+$/.test(num);
    const brand = detectCardBrand(num);
    const checksumOk = numeric && luhnValid(num);
    let formatted = "";
    if (numeric) {
      const groups = brand?.brand === "American Express" ? [4, 6, 5] : [4, 4, 4, 4];
      let i = 0;
      for (const g of groups) {
        if (num.length > i) {
          formatted += num.slice(i, i + g) + " ";
          i += g;
        }
      }
      if (i < num.length) formatted += num.slice(i);
      formatted = formatted.trim();
    }
    return { numeric, brand, checksumOk, length: num.length, formatted };
  }, [digits]);
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Field label="Card number">
          <input
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/[^\d\s-]/g, ""))}
            placeholder="4242 4242 4242 4242"
            style={{ ...s.inp, fontSize: 15, fontFamily: "monospace" }}
            maxLength={23}
          />
        </Field>
      </div>
      {result &&
        (result.numeric && result.checksumOk ? (
          <OkBox>Passes the Luhn checksum — structurally valid.</OkBox>
        ) : (
          <ErrorBox>
            {!result.numeric
              ? "• Only digits, spaces and hyphens are allowed."
              : `• ${result.length} digits — the Luhn checksum ${result.length < 13 ? "(too short)" : "does not pass"}.`}
          </ErrorBox>
        ))}
      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <div style={{ ...s.card, margin: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Brand</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>{result.brand?.brand || "Unknown"}</div>
            </div>
            <div style={{ ...s.card, margin: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Length</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>{result.length} digits</div>
            </div>
            <div style={{ ...s.card, margin: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Formatted</div>
              <div style={{ fontSize: 15, fontFamily: "monospace", marginTop: 4, color: "var(--text)" }}>{result.formatted || "—"}</div>
            </div>
          </div>
          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Format validation only — this cannot tell whether a card is active or has funds. Never enter real card details on random sites; this tool never transmits anything.
            </div>
          </div>
        </>
      )}
    </>
  );
}

function parseIpv4(num: string): { a: number; b: number; c: number; d: number } | null {
  const parts = num.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return { a: parts[0], b: parts[1], c: parts[2], d: parts[3] };
}

function expandIpv6(num: string): { groups: string[]; compressed: string } | null {
  if (num === "::") return { groups: Array(8).fill("0"), compressed: "::" };
  const doubleColons = num.match(/::/g);
  if (doubleColons && doubleColons.length > 1) return null;
  const [hp, tp] = num.includes("::") ? num.split("::") : [num, ""];
  const left = hp ? hp.split(":") : [];
  const right = tp ? tp.split(":") : [];
  if (left.length + right.length >= 8) return null;
  const mid = Array(8 - left.length - right.length).fill("0");
  const groups = [...left, ...mid, ...right];
  if (groups.some((g) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  const padded = groups.map((g) => g.padStart(4, "0"));
  let best = { len: 0, start: -1 };
  let run = 0;
  let runStart = -1;
  padded.forEach((g, i) => {
    if (g === "0000") {
      if (run === 0) runStart = i;
      run++;
    } else {
      if (run > best.len) best = { len: run, start: runStart };
      run = 0;
    }
  });
  if (run > best.len) best = { len: run, start: runStart };
  let compressed: string;
  if (best.len >= 2) {
    compressed = [
      padded.slice(0, best.start).join(":"),
      padded.slice(best.start + best.len).join(":"),
    ].join("::");
  } else {
    compressed = padded.join(":");
  }
  return { groups: padded, compressed };
}

function ipv4Info(parts: { a: number; b: number; c: number; d: number }) {
  const { a, b, c, d } = parts;
  let kind = "Public";
  let cls = "";
  if (a === 127) kind = "Loopback (local machine)";
  else if (a === 0) kind = "This network / reserved";
  else if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) kind = "Private (RFC 1918)";
  else if (a === 169 && b === 254) kind = "Link-local (APIPA)";
  else if (a >= 224 && a <= 239) kind = "Multicast";
  else if (a >= 240) kind = "Reserved";
  if (a <= 127) cls = "A";
  else if (a <= 191) cls = "B";
  else if (a <= 223) cls = "C";
  else if (a <= 239) cls = "D (multicast)";
  else cls = "E (reserved)";
  const bin = (n: number) => n.toString(2).padStart(8, "0");
  const integer = a * 16777216 + b * 65536 + c * 256 + d;
  const hex = integer.toString(16).toUpperCase().padStart(8, "0");
  return { kind, cls, binary: `${bin(a)}.${bin(b)}.${bin(c)}.${bin(d)}`, integer, hex };
}

export function IpLookupTool() {
  const [input, setInput] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geo, setGeo] = useState<{ ip: string; country: string; regionName: string; city: string; timezone: string; currency: string; isp: string } | null>(null);
  const [geoError, setGeoError] = useState("");
  const result = useMemo(() => {
    const value = input.trim();
    if (!value) return null;
    if (value.includes(":")) {
      const v6 = expandIpv6(value);
      if (!v6) return { error: "Invalid IPv6 address" };
      const first = parseInt(v6.groups[0], 16);
      let kind = "Global Unicast";
      if (v6.groups.every((g) => g === "0000")) kind = "Unspecified (::)";
      else if (v6.groups.slice(0, 7).every((g) => g === "0000") && v6.groups[7] === "0001") kind = "Loopback (::1)";
      else if ((first & 0xffc0) === 0xfe80) kind = "Link-local (fe80::/10)";
      else if ((first >> 5) === 0x7f) kind = "ULA private (fc00::/7)";
      else if ((first >> 4) === 0xff) kind = "Multicast (ff00::/8)";
      else if (v6.groups[0] === "0064" && v6.groups[1] === "ff9b") kind = "IPv4-mapped";
      return { v6: true as const, groups: v6.groups, compressed: v6.compressed, kind };
    }
    const v4 = parseIpv4(value);
    if (!v4) return { error: "Invalid IPv4 address" };
    const info = ipv4Info(v4);
    return { v6: false as const, ...info, address: value };
  }, [input]);

  const detectMine = async () => {
    setGeoBusy(true);
    setGeoError("");
    setGeo(null);
    try {
      const res = await fetch("/api/geo", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.countryCode) throw new Error(data.error || "Could not detect location");
      setGeo({ ip: data.ip, country: data.country, regionName: data.regionName || data.region, city: data.city, timezone: data.timezone, currency: data.currency, isp: data.isp });
    } catch (e: any) {
      setGeoError(e?.message || "Location detection failed — try again in a moment");
    } finally {
      setGeoBusy(false);
    }
  };

  return (
    <>
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          Detect your own public IP, country, region and city in one click — powered by free geolocation.
        </div>
        <button onClick={detectMine} style={{ ...s.btn2, display: "flex", gap: 6, alignItems: "center" }}>
          <MapPin size={14} /> {geoBusy ? "Detecting…" : "Detect my location"}
        </button>
        {geo && (
          <OkBox>
            {geo.city && `${geo.city}, `}{geo.regionName && `${geo.regionName}, `}{geo.country}{geo.currency ? ` · currency ${geo.currency}` : ""}
          </OkBox>
        )}
        {geo && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            <div style={{ ...s.card, padding: "8px 10px" }}><div style={{ fontSize: 12, color: "var(--muted)" }}>IP</div><div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text)" }}>{geo.ip}</div></div>
            <div style={{ ...s.card, padding: "8px 10px" }}><div style={{ fontSize: 12, color: "var(--muted)" }}>Timezone</div><div style={{ fontSize: 13, color: "var(--text)" }}>{geo.timezone}</div></div>
            <div style={{ ...s.card, padding: "8px 10px" }}><div style={{ fontSize: 12, color: "var(--muted)" }}>ISP</div><div style={{ fontSize: 13, color: "var(--text)" }}>{geo.isp}</div></div>
          </div>
        )}
        {geoError && <ErrorBox>{geoError}</ErrorBox>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <Field label="Or analyze any IP address (IPv4 or IPv6)">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="192.168.1.1 or 2606:4700:4700::1111" style={{ ...s.inp, fontSize: 15, fontFamily: "monospace" }} />
        </Field>
      </div>
      {result && "error" in result && <ErrorBox>{result.error}</ErrorBox>}
      {result && !("error" in result) && result.v6 && (
        <>
          <OkBox>Valid IPv6 · {result.kind}</OkBox>
          <div style={{ ...s.card, marginBottom: 12 }}>
            <label style={s.lab}>Expanded form</label>
            <div style={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all", color: "var(--text)" }}>{result.groups.join(":")}</div>
            <label style={{ ...s.lab, marginTop: 10 }}>Compressed form</label>
            <div style={{ fontFamily: "monospace", fontSize: 14, color: "var(--text)" }}>{result.compressed}</div>
          </div>
        </>
      )}
      {result && !("error" in result) && !result.v6 && (
        <>
          <OkBox>Valid IPv4 · {result.kind} · Class {result.cls}</OkBox>
          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={s.lab}>Binary</label>
                <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--text)" }}>{result.binary}</div>
              </div>
              <div>
                <label style={s.lab}>Integer</label>
                <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--text)" }}>{result.integer}</div>
              </div>
              <div>
                <label style={s.lab}>Hex</label>
                <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--text)" }}>0x{result.hex}</div>
              </div>
              <div>
                <label style={s.lab}>Common CIDR</label>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text)" }}>
                  {result.address}/{result.cls.startsWith("A") ? 8 : result.cls.startsWith("B") ? 16 : 24}
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...s.card }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              This analyzes the address locally. Geolocation is not included — it would require a third-party location database.
            </div>
          </div>
        </>
      )}
    </>
  );
}

const DNS_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "ANY"];

export function DnsTool() {
  const [domain, setDomain] = useState("");
  const [qtype, setQtype] = useState("A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<{ name: string; type: string; ttl: number; data: string }[]>([]);
  const [queried, setQueried] = useState("");
  const lookup = async () => {
    const name = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!name) {
      setError("Enter a domain name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tools/net?type=dns&name=${encodeURIComponent(name)}&qtype=${qtype}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setAnswers(data.answers || []);
      setQueried(name);
    } catch (e: any) {
      setError(e?.message || "Lookup failed — check the domain and try again");
      setAnswers([]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flexGrow: 1, minWidth: 220 }}>
            <label style={s.lab}>Domain</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="techpivo.com"
              style={{ ...s.inp, fontFamily: "monospace" }}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
          </div>
          <div>
            <label style={s.lab}>Record type</label>
            <select value={qtype} onChange={(e) => setQtype(e.target.value)} style={s.sel}>
              {DNS_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <button style={s.btn} onClick={lookup} disabled={loading}>
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={14} />}
            {loading ? "Querying…" : "Lookup"}
          </button>
        </div>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {answers.length > 0 && (
        <>
          <OkBox>
            {answers.length} {qtype} record{answers.length === 1 ? "" : "s"} for {queried}
          </OkBox>
          <div style={{ ...s.card }}>
            <div style={{ fontFamily: "monospace", fontSize: 13 }}>
              {answers.map((a, i) => (
                <div key={i} style={{ padding: "8px 2px", borderBottom: i < answers.length - 1 ? "1px solid var(--border)" : "none", wordBreak: "break-all" }}>
                  <span style={{ color: "hsl(var(--accent))", fontWeight: 700 }}>{a.type}</span>
                  <span style={{ color: "var(--muted)" }}>  {a.ttl}s  </span>
                  <span style={{ color: "var(--text)" }}>{a.data}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Queries run through Cloudflare&apos;s public DNS-over-HTTPS endpoint (1.1.1.1) — live, no API key needed.
            </div>
          </div>
        </>
      )}
      {answers.length === 0 && !error && (
        <OkBox>Enter a domain above and press Lookup to fetch live DNS records.</OkBox>
      )}
    </>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { Copy, Sparkles, RefreshCw } from "lucide-react";
import { s, CopyButton, Field, ToolCard, ErrorBox, OkBox } from "./tools-ui";

const numFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/* Calculators                                                        */
/* ------------------------------------------------------------------ */

export function PercentageCalculatorTool() {
  const [mode, setMode] = useState<"of" | "change" | "ratio">("of");
  const [a, setA] = useState("20");
  const [b, setB] = useState("150");
  const [from, setFrom] = useState("100");
  const [to, setTo] = useState("140");
  const [x, setX] = useState("30");
  const [y, setY] = useState("200");

  let result: string = "";
  let detail: string = "";
  if (mode === "of") {
    const p = Number(a), n = Number(b);
    if (isFinite(p) && isFinite(n) && n !== 0) {
      const v = (p / 100) * n;
      result = `${numFmt.format(v)}`;
      detail = `${a}% of ${numFmt.format(n)} = ${numFmt.format(v)}`;
    }
  } else if (mode === "change") {
    const f = Number(from), t = Number(to);
    if (isFinite(f) && isFinite(t) && f !== 0) {
      const v = ((t - f) / Math.abs(f)) * 100;
      result = `${v >= 0 ? "+" : ""}${numFmt.format(v)}%`;
      detail = `Change from ${numFmt.format(f)} to ${numFmt.format(t)} = ${numFmt.format(t - f)} (${v >= 0 ? "increase" : "decrease"})`;
    }
  } else {
    const p = Number(x), q = Number(y);
    if (isFinite(p) && isFinite(q) && q !== 0) {
      const v = (p / q) * 100;
      result = `${numFmt.format(v)}%`;
      detail = `${numFmt.format(p)} is ${numFmt.format(v)}% of ${numFmt.format(q)}`;
    }
  }

  return (
    <>
      <ToolCard title="Mode">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["of", "X% of Y"],
            ["change", "Percent change"],
            ["ratio", "X is what % of Y"],
          ].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m as any)} style={mode === m ? s.btn : s.btn2}>
              {label}
            </button>
          ))}
        </div>
      </ToolCard>
      <ToolCard title="Values">
        {mode === "of" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Percentage (%)">
              <input inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} style={s.inp} />
            </Field>
            <Field label="Number">
              <input inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} style={s.inp} />
            </Field>
          </div>
        )}
        {mode === "change" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="From">
              <input inputMode="decimal" value={from} onChange={(e) => setFrom(e.target.value)} style={s.inp} />
            </Field>
            <Field label="To">
              <input inputMode="decimal" value={to} onChange={(e) => setTo(e.target.value)} style={s.inp} />
            </Field>
          </div>
        )}
        {mode === "ratio" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="X">
              <input inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} style={s.inp} />
            </Field>
            <Field label="Y">
              <input inputMode="decimal" value={y} onChange={(e) => setY(e.target.value)} style={s.inp} />
            </Field>
          </div>
        )}
      </ToolCard>
      <ToolCard title="Result">
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{result || "—"}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{detail}</div>
      </ToolCard>
    </>
  );
}

function pmt(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function LoanCalculatorTool() {
  const [principal, setPrincipal] = useState("500000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("2");
  const [showTable, setShowTable] = useState(false);

  const P = Number(principal), R = Number(rate), Y = Number(years);
  const valid = isFinite(P) && isFinite(R) && isFinite(Y) && P > 0 && R >= 0 && Y > 0 && Y <= 50;

  const rows = useMemo(() => {
    if (!valid || !showTable) return [];
    const monthly = pmt(P, R, Y);
    const n = Math.min(Math.ceil(Y * 12), 120);
    const out: { i: number; payment: number; interest: number; principal: number; balance: number }[] = [];
    let balance = P;
    for (let i = 1; i <= n; i++) {
      const interest = (balance * (R / 100)) / 12;
      const principalPaid = monthly - interest;
      balance = Math.max(0, balance - principalPaid);
      out.push({ i, payment: monthly, interest, principal: principalPaid, balance });
    }
    return out;
  }, [valid, showTable, P, R, Y]);

  const monthly = valid ? pmt(P, R, Y) : 0;
  const total = valid ? monthly * Y * 12 : 0;
  const totalInterest = valid ? total - P : 0;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Loan amount (₦)">
          <input inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} style={s.inp} />
        </Field>
        <Field label="Annual interest rate (%)">
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} style={s.inp} />
        </Field>
        <Field label="Term (years, max 50)">
          <input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} style={s.inp} />
        </Field>
      </div>
      {!valid && <ErrorBox>Enter valid numbers (principal &gt; 0, rate ≥ 0, term 0-50 years).</ErrorBox>}
      {valid && (
        <>
          <ToolCard title="Summary">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Monthly payment</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>₦{numFmt.format(monthly)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Total paid</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>₦{numFmt.format(total)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Total interest</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>₦{numFmt.format(totalInterest)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Payments</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{numFmt.format(Y * 12)}</div>
              </div>
            </div>
          </ToolCard>
          <ToolCard title="Amortization">
            <button onClick={() => setShowTable(!showTable)} style={showTable ? s.btn2Off : s.btn2}>
              {showTable ? "Hide first 120 payments" : "Show first 120 payments"}
            </button>
            {showTable && (
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "var(--muted)", fontSize: 12, textAlign: "left" }}>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>#</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Payment</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Interest</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Principal</th>
                      <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.i} style={{ color: "var(--text)" }}>
                        <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{r.i}</td>
                        <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)" }}>₦{numFmt.format(r.payment)}</td>
                        <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)" }}>₦{numFmt.format(r.interest)}</td>
                        <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)" }}>₦{numFmt.format(r.principal)}</td>
                        <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)" }}>₦{numFmt.format(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ToolCard>
        </>
      )}
    </>
  );
}

type UnitCategory = {
  key: string;
  label: string;
  from: (v: number) => number;
  units: { name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[];
};

const UNIT_CATEGORIES: UnitCategory[] = [
  {
    key: "length",
    label: "Length",
    from: (v) => v,
    units: [
      { name: "Meters (m)", toBase: (v) => v, fromBase: (v) => v },
      { name: "Kilometers (km)", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: "Centimeters (cm)", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { name: "Millimeters (mm)", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: "Miles (mi)", toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
      { name: "Yards (yd)", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { name: "Feet (ft)", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { name: "Inches (in)", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
    ],
  },
  {
    key: "mass",
    label: "Mass",
    from: (v) => v,
    units: [
      { name: "Kilograms (kg)", toBase: (v) => v, fromBase: (v) => v },
      { name: "Grams (g)", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: "Milligrams (mg)", toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
      { name: "Metric tons (t)", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: "Pounds (lb)", toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { name: "Ounces (oz)", toBase: (v) => v * 0.028349523, fromBase: (v) => v / 0.028349523 },
    ],
  },
  {
    key: "volume",
    label: "Volume",
    from: (v) => v,
    units: [
      { name: "Liters (L)", toBase: (v) => v, fromBase: (v) => v },
      { name: "Milliliters (mL)", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: "Cubic meters (m³)", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: "US Gallons (gal)", toBase: (v) => v * 3.785411784, fromBase: (v) => v / 3.785411784 },
      { name: "US Quarts (qt)", toBase: (v) => v * 0.946352946, fromBase: (v) => v / 0.946352946 },
      { name: "US Pints (pt)", toBase: (v) => v * 0.473176473, fromBase: (v) => v / 0.473176473 },
      { name: "US Cups", toBase: (v) => v * 0.2365882365, fromBase: (v) => v / 0.2365882365 },
      { name: "Fluid ounces (fl oz)", toBase: (v) => v * 0.02957352956, fromBase: (v) => v / 0.02957352956 },
    ],
  },
  {
    key: "speed",
    label: "Speed",
    from: (v) => v,
    units: [
      { name: "Kilometers/hour (km/h)", toBase: (v) => v, fromBase: (v) => v },
      { name: "Meters/second (m/s)", toBase: (v) => v * 3.6, fromBase: (v) => v / 3.6 },
      { name: "Miles/hour (mph)", toBase: (v) => v * 1.609344, fromBase: (v) => v / 1.609344 },
      { name: "Knots", toBase: (v) => v * 1.852, fromBase: (v) => v / 1.852 },
      { name: "Feet/second (ft/s)", toBase: (v) => v * 1.09728, fromBase: (v) => v / 1.09728 },
    ],
  },
  {
    key: "data",
    label: "Data",
    from: (v) => v,
    units: [
      { name: "Bytes (B)", toBase: (v) => v, fromBase: (v) => v },
      { name: "Kilobytes (KB)", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: "Megabytes (MB)", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { name: "Gigabytes (GB)", toBase: (v) => v * 1e9, fromBase: (v) => v / 1e9 },
      { name: "Terabytes (TB)", toBase: (v) => v * 1e12, fromBase: (v) => v / 1e12 },
      { name: "Kibibytes (KiB)", toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { name: "Mebibytes (MiB)", toBase: (v) => v * 1024 * 1024, fromBase: (v) => v / 1024 / 1024 },
      { name: "Gigibytes (GiB)", toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
      { name: "Bits (b)", toBase: (v) => v / 8, fromBase: (v) => v * 8 },
    ],
  },
];

export function UnitConverterTool() {
  const [catKey, setCatKey] = useState("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);

  const cat = UNIT_CATEGORIES.find((c) => c.key === catKey) || UNIT_CATEGORIES[0];
  const v = Number(value);
  const valid = isFinite(v);
  const base = valid ? cat.units[from].toBase(v) : 0;
  const result = valid ? cat.units[to].fromBase(base) : NaN;

  const switchUnits = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <>
      <ToolCard title="Category">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {UNIT_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setCatKey(c.key);
                setFrom(0);
                setTo(1);
              }}
              style={catKey === c.key ? s.btn : s.btn2}
            >
              {c.label}
            </button>
          ))}
        </div>
      </ToolCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
        <Field label="From">
          <div style={{ display: "flex", gap: 8 }}>
            <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} style={s.inp} />
            <select value={from} onChange={(e) => setFrom(Number(e.target.value))} style={{ ...s.sel, width: 150 }}>
              {cat.units.map((u, i) => (
                <option key={u.name} value={i}>{u.name}</option>
              ))}
            </select>
          </div>
        </Field>
        <button onClick={switchUnits} style={{ ...s.btn2, padding: "10px 12px", marginBottom: 2 }} aria-label="Swap units">⇄</button>
        <Field label="To">
          <div style={{ display: "flex", gap: 8 }}>
            <input readOnly value={valid ? numFmt.format(result) : ""} style={{ ...s.inp, background: "var(--muted-alpha, rgba(128,128,128,0.08))", fontWeight: 700 }} />
            <select value={to} onChange={(e) => setTo(Number(e.target.value))} style={{ ...s.sel, width: 150 }}>
              {cat.units.map((u, i) => (
                <option key={u.name} value={i}>{u.name}</option>
              ))}
            </select>
          </div>
        </Field>
      </div>
      {!valid && isFinite(v) === false && value !== "" && <ErrorBox>Enter a valid number.</ErrorBox>}
      {valid && (
        <OkBox>
          {numFmt.format(v)} {cat.units[from].name.split(" (")[0]} = <strong>{numFmt.format(result)}</strong> {cat.units[to].name.split(" (")[0]}
        </OkBox>
      )}
    </>
  );
}

export function AgeCalculatorTool() {
  const [birth, setBirth] = useState("2000-01-15");

  const info = useMemo(() => {
    const d = new Date(birth);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    let days = now.getDate() - d.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonth;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const totalDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (next.getTime() <= now.getTime()) next.setFullYear(now.getFullYear() + 1);
    const daysToNext = Math.ceil((next.getTime() - now.getTime()) / 86400000);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    return { years, months, days, totalDays, daysToNext, weekday };
  }, [birth]);

  return (
    <>
      <Field label="Date of birth">
        <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} style={{ ...s.inp, maxWidth: 220 }} />
      </Field>
      {!info && <ErrorBox>Enter a valid date of birth.</ErrorBox>}
      {info && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{info.years}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Years</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{info.months}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Months</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{info.days}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Days</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{numFmt.format(info.totalDays)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Days alive</div>
            </div>
          </div>
          <OkBox>
            Born on a {info.weekday}. Your next birthday is in <strong>{info.daysToNext}</strong> day{info.daysToNext === 1 ? "" : "s"}.
          </OkBox>
        </>
      )}
    </>
  );
}

export function DateCalculatorTool() {
  const [mode, setMode] = useState<"math" | "diff">("math");
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState("30");
  const [weeks, setWeeks] = useState("0");
  const [months, setMonths] = useState("0");
  const [years, setYears] = useState("0");
  const [dateA, setDateA] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateB, setDateB] = useState(() => new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));

  const mathResult = useMemo(() => {
    const d = new Date(start);
    if (isNaN(d.getTime())) return null;
    const n = Number(days), w = Number(weeks), m = Number(months), y = Number(years);
    if (![n, w, m, y].every((x) => isFinite(x))) return null;
    const out = new Date(d);
    out.setDate(out.getDate() + n + w * 7);
    out.setMonth(out.getMonth() + m);
    out.setFullYear(out.getFullYear() + y);
    return out;
  }, [start, days, weeks, months, years]);

  const diffResult = useMemo(() => {
    const a = new Date(dateA), b = new Date(dateB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const [earlier, later] = a <= b ? [a, b] : [b, a];
    let years = later.getFullYear() - earlier.getFullYear();
    let months = later.getMonth() - earlier.getMonth();
    let days = later.getDate() - earlier.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(later.getFullYear(), later.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const totalDays = Math.floor((later.getTime() - earlier.getTime()) / 86400000);
    return { years, months, days, totalDays };
  }, [dateA, dateB]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode("math")} style={mode === "math" ? s.btn : s.btn2}>Add / subtract</button>
        <button onClick={() => setMode("diff")} style={mode === "diff" ? s.btn : s.btn2}>Days between</button>
      </div>
      {mode === "math" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
            <Field label="Start date">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ ...s.inp, width: "100%" }} />
            </Field>
            <Field label="Days">
              <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} style={s.inp} />
            </Field>
            <Field label="Weeks">
              <input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={s.inp} />
            </Field>
            <Field label="Months">
              <input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} style={s.inp} />
            </Field>
            <Field label="Years">
              <input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} style={s.inp} />
            </Field>
          </div>
          {mathResult && (
            <OkBox>
              Result: <strong>{mathResult.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
            </OkBox>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="First date">
              <input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} style={{ ...s.inp, width: "100%" }} />
            </Field>
            <Field label="Second date">
              <input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} style={{ ...s.inp, width: "100%" }} />
            </Field>
          </div>
          {diffResult && (
            <OkBox>
              <strong>{diffResult.totalDays} days</strong> — that&apos;s {diffResult.years} years, {diffResult.months} months, {diffResult.days} days.
            </OkBox>
          )}
        </>
      )}
    </>
  );
}

const VALID_BASE_RE = /^[0-9a-zA-Z]+$/;

export function BaseConverterTool() {
  const [value, setValue] = useState("ff");
  const [fromBase, setFromBase] = useState(16);
  const [toBase, setToBase] = useState(2);

  const decimal = useMemo(() => {
    if (!VALID_BASE_RE.test(value) || fromBase < 2 || fromBase > 36) return null;
    const parsed = parseInt(value.toLowerCase(), fromBase);
    return isNaN(parsed) ? null : parsed;
  }, [value, fromBase]);

  const converted = decimal === null ? "" : decimal.toString(toBase).toUpperCase();

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 14, alignItems: "end" }}>
        <Field label="Number">
          <input value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} style={{ ...s.inp, fontFamily: "monospace" }} />
        </Field>
        <Field label="From base">
          <select value={fromBase} onChange={(e) => setFromBase(Number(e.target.value))} style={s.sel}>
            {Array.from({ length: 35 }, (_, i) => i + 2).map((b) => (
              <option key={b} value={b}>Base {b}</option>
            ))}
          </select>
        </Field>
        <Field label="To base">
          <select value={toBase} onChange={(e) => setToBase(Number(e.target.value))} style={s.sel}>
            {Array.from({ length: 35 }, (_, i) => i + 2).map((b) => (
              <option key={b} value={b}>Base {b}</option>
            ))}
          </select>
        </Field>
      </div>
      {decimal === null && value !== "" && (
        <ErrorBox>Invalid character for base {fromBase}. Valid: 0-9, A-{String.fromCharCode(55 + fromBase - 10)} (case-insensitive).</ErrorBox>
      )}
      {decimal !== null && (
        <>
          <OkBox>
            {value} (base {fromBase}) = <strong style={{ wordBreak: "break-all" }}>{converted}</strong> (base {toBase})
          </OkBox>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[2, 8, 10, 16].filter((b) => b !== fromBase && b !== toBase).map((b) => (
              <button key={b} onClick={() => setToBase(b)} style={s.btn2}>
                {decimal.toString(b).toUpperCase()} (base {b})
              </button>
            ))}
          </div>
          <ToolCard title="Quick conversions">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: 13 }}>
              {[
                ["Decimal", decimal.toString(10)],
                ["Binary", decimal.toString(2)],
                ["Octal", decimal.toString(8)],
                ["Hexadecimal", decimal.toString(16).toUpperCase()],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <span style={{ color: "var(--muted)" }}>{l}</span>
                  <span style={{ fontFamily: "monospace", color: "var(--text)", wordBreak: "break-all", textAlign: "right", paddingLeft: 8 }}>{v}</span>
                </div>
              ))}
            </div>
          </ToolCard>
        </>
      )}
    </>
  );
}

export function BmiCalculatorTool() {
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [hFt, setHFt] = useState("5");
  const [hIn, setHIn] = useState("7");
  const [wLb, setWLb] = useState("155");

  const bmi = useMemo(() => {
    let h = 0, w = 0;
    if (unit === "metric") {
      h = Number(height) / 100;
      w = Number(weight);
    } else {
      h = (Number(hFt) * 12 + Number(hIn)) * 0.0254;
      w = Number(wLb) * 0.45359237;
    }
    if (!isFinite(h) || !isFinite(w) || h <= 0 || w <= 0) return null;
    return w / (h * h);
  }, [unit, height, weight, hFt, hIn, wLb]);

  const category = bmi === null ? null : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese";
  const color = bmi === null ? "var(--muted)" : bmi < 18.5 ? "#F59E0B" : bmi < 25 ? "#10B981" : bmi < 30 ? "#F59E0B" : "#EF4444";

  const healthyRange = useMemo(() => {
    let h = 0;
    if (unit === "metric") h = Number(height) / 100;
    else h = (Number(hFt) * 12 + Number(hIn)) * 0.0254;
    if (!isFinite(h) || h <= 0) return null;
    const min = 18.5 * h * h;
    const max = 24.9 * h * h;
    if (unit === "imperial") return { min: min / 0.45359237, max: max / 0.45359237 };
    return { min, max };
  }, [unit, height, hFt, hIn]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setUnit("metric")} style={unit === "metric" ? s.btn : s.btn2}>Metric (cm / kg)</button>
        <button onClick={() => setUnit("imperial")} style={unit === "imperial" ? s.btn : s.btn2}>Imperial (ft / lb)</button>
      </div>
      {unit === "metric" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Height (cm)">
            <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} style={s.inp} />
          </Field>
          <Field label="Weight (kg)">
            <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} style={s.inp} />
          </Field>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Height (ft)">
            <input inputMode="decimal" value={hFt} onChange={(e) => setHFt(e.target.value)} style={s.inp} />
          </Field>
          <Field label="Inches">
            <input inputMode="decimal" value={hIn} onChange={(e) => setHIn(e.target.value)} style={s.inp} />
          </Field>
          <Field label="Weight (lb)">
            <input inputMode="decimal" value={wLb} onChange={(e) => setWLb(e.target.value)} style={s.inp} />
          </Field>
        </div>
      )}
      {bmi === null && <ErrorBox>Enter valid height and weight.</ErrorBox>}
      {bmi !== null && category && (
        <>
          <ToolCard title="Result">
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color }}>{bmi.toFixed(1)}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{category}</div>
            </div>
            <div style={{ position: "relative", height: 10, borderRadius: 5, background: "linear-gradient(90deg,#3B82F6,#10B981,#F59E0B,#EF4444)", marginTop: 14, opacity: 0.9 }}>
              {bmi !== null && (
                <div style={{ position: "absolute", left: `${Math.min(100, Math.max(2, ((bmi - 14) / 26) * 100))}%`, top: -4, width: 18, height: 18, borderRadius: 9, background: color, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              )}
            </div>
          </ToolCard>
          {healthyRange && (
            <OkBox>
              Healthy weight range for your height: <strong>{numFmt.format(healthyRange.min)}–{numFmt.format(healthyRange.max)}</strong> {unit === "imperial" ? "lb" : "kg"}
            </OkBox>
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AI text tools (instant, template-based, no external API)           */
/* ------------------------------------------------------------------ */

const HEADLINE_TEMPLATES = [
  (topic: string) => `How to Master ${topic}: A Step-by-Step Guide for 2026`,
  (topic: string) => `${topic}: Everything You Need to Know`,
  (topic: string) => `The Beginner's Guide to ${topic}`,
  (topic: string) => `10 Proven ${topic} Tips That Actually Work`,
  (topic: string) => `Why ${topic} Matters More Than Ever in 2026`,
  (topic: string) => `${topic} Explained in 5 Minutes`,
  (topic: string) => `7 Common Mistakes Everyone Makes with ${topic}`,
  (topic: string) => `${topic} vs Alternatives: Which One Wins?`,
  (topic: string) => `The Complete ${topic} Checklist (Free Download)`,
  (topic: string) => `What Nobody Tells You About ${topic}`,
  (topic: string) => `How Businesses Are Using ${topic} to Grow in 2026`,
  (topic: string) => `${topic}: Pros, Cons, and Everything in Between`,
  (topic: string) => `The Future of ${topic}: Trends to Watch in 2026`,
  (topic: string) => `Fix These ${topic} Problems Today — 5 Practical Solutions`,
  (topic: string) => `A Simple Way to Get Started with ${topic} Today`,
];

export function AiHeadlineGeneratorTool() {
  const [topic, setTopic] = useState("AI automation");
  const [count, setCount] = useState(5);
  const [headlines, setHeadlines] = useState<string[]>([]);

  const generate = () => {
    const t = topic.trim() || "your topic";
    const up = t.replace(/\b\w/g, (c) => c.toUpperCase());
    const picked: string[] = [];
    const indices = Array.from({ length: HEADLINE_TEMPLATES.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    indices.slice(0, Math.min(count, HEADLINE_TEMPLATES.length)).forEach((idx) => picked.push(HEADLINE_TEMPLATES[idx](up)));
    setHeadlines(picked);
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 14, alignItems: "end" }}>
        <Field label="Topic">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={s.inp} placeholder="AI automation, Rust, VPNs…" />
        </Field>
        <Field label="How many">
          <select value={count} onChange={(e) => setCount(Math.min(15, Math.max(1, Number(e.target.value))))} style={s.sel}>
            {[3, 5, 10, 15].map((n) => (
              <option key={n} value={n}>{n} headlines</option>
            ))}
          </select>
        </Field>
        <button style={s.btn} onClick={generate}>
          <Sparkles size={14} /> Generate
        </button>
      </div>
      {headlines.length > 0 && (
        <ToolCard title={`Headlines (${headlines.length})`}>
          {headlines.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text)", flexGrow: 1 }}>{h}</span>
              <CopyButton text={h} />
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <button style={s.btn2} onClick={generate}><RefreshCw size={13} /> Regenerate</button>
          </div>
        </ToolCard>
      )}
    </>
  );
}

function clampMeta(text: string): string {
  let t = text;
  if (t.length > 160) t = t.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  return t;
}

export function AiMetaDescriptionTool() {
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [charCounts, setCharCounts] = useState<number[]>([]);

  const generate = () => {
    const t = title.trim() || "this guide";
    const k = keyword.trim();
    const base = `${t}. ${k ? `Learn everything about ${k} — ` : ""}tips, tools, and expert advice to get the best results in 2026.`;
    const templates = [
      clampMeta(base),
      clampMeta(`${k ? `${k[0].toUpperCase() + k.slice(1)}: ` : ""}${t} explained simply. Practical steps, real examples, and the mistakes to avoid.`),
      clampMeta(`Looking for the best ${k || t}? We break down options, pricing, and performance so you can decide with confidence.`),
      clampMeta(`${t} — a complete, no-fluff walkthrough covering setup, optimization, and common pitfalls. Save time, skip the guesswork.`),
    ];
    setVariations(templates);
    setCharCounts(templates.map((x) => x.length));
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr auto", gap: 14, alignItems: "end" }}>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={s.inp} placeholder="How to use Next.js in 2026" />
        </Field>
        <Field label="Primary keyword (optional)">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} style={s.inp} placeholder="next.js tutorial" />
        </Field>
        <button style={s.btn} onClick={generate}><Sparkles size={14} /> Generate</button>
      </div>
      {variations.length > 0 && (
        <ToolCard title={`Meta descriptions (target ${charCounts.filter((c) => c <= 160 && c >= 130).length}/4 on target)`}>
          {variations.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text)", flexGrow: 1 }}>{v}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: charCounts[i] <= 160 && charCounts[i] >= 120 ? "#10B981" : "#EF4444" }}>{charCounts[i]}</span>
              <CopyButton text={v} />
            </div>
          ))}
        </ToolCard>
      )}
    </>
  );
}

export function AiFaqGeneratorTool() {
  const [topic, setTopic] = useState("password managers");
  const [count, setCount] = useState(5);
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);

  const generate = () => {
    const t = topic.trim().toLowerCase() || "this technology";
    const n = Math.min(count, 8);
    const builders: { q: (x: string) => string; a: (x: string) => string }[] = [
      {
        q: (x) => `What is ${x}?`,
        a: (x) => `${x[0].toUpperCase() + x.slice(1).replace(/s$/i, "")} is a system designed to solve a specific problem reliably. This guide covers what it is, how it works, and whether it fits your needs.`,
      },
      {
        q: (x) => `How does ${x} work?`,
        a: (x) => `${x[0].toUpperCase() + x.slice(1)} works by automating the core process: you configure it once, and it handles the repetitive work using a clear, predictable workflow that you can verify at any time.`,
      },
      {
        q: (x) => `Why should I use ${x}?`,
        a: (x) => `Using ${x} saves time, reduces human error, and gives you consistent results. Most users see value immediately — especially for tasks that are repetitive or easy to get wrong.`,
      },
      {
        q: (x) => `Is ${x} secure?`,
        a: (x) => `Security depends on your provider and setup. Look for end-to-end encryption, solid access controls, and regular security audits. Always enable two-factor authentication where available.`,
      },
      {
        q: (x) => `How much does ${x} cost?`,
        a: (x) => `Pricing varies: many ${x} options offer free tiers with core features, while premium plans add advanced features, support, and higher limits. Compare plans based on your actual usage.`,
      },
      {
        q: (x) => `What are the downsides of ${x}?`,
        a: (x) => `Common trade-offs include a learning curve, subscription costs, and occasional compatibility limits. The right choice depends on your workflow — test before committing.`,
      },
      {
        q: (x) => `How do I get started with ${x}?`,
        a: (x) => `Start small: set up an account, complete the guided setup, and run one real task end-to-end. Most providers have documentation and templates that make the first hour productive.`,
      },
      {
        q: (x) => `Is ${x} worth it in 2026?`,
        a: (x) => `For most people and teams, yes — the time savings and consistency outweigh the cost. If the task it automates is frequent or error-prone, the return on investment is usually clear.`,
      },
    ];
    const up = t.replace(/\b\w/g, (c) => c.toUpperCase());
    setFaqs(builders.slice(0, n).map((b) => ({ q: b.q(up), a: b.a(t) })));
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 14, alignItems: "end" }}>
        <Field label="Topic">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={s.inp} placeholder="password managers" />
        </Field>
        <Field label="How many">
          <select value={count} onChange={(e) => setCount(Math.min(8, Math.max(2, Number(e.target.value))))} style={s.sel}>
            {[2, 3, 5, 8].map((n) => (
              <option key={n} value={n}>{n} questions</option>
            ))}
          </select>
        </Field>
        <button style={s.btn} onClick={generate}><Sparkles size={14} /> Generate</button>
      </div>
      {faqs.length > 0 && (
        <ToolCard title="FAQ (FAQPage schema ready)">
          {faqs.map((f, i) => (
            <div key={i} style={{ padding: "10px 2px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{f.q}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{f.a}</div>
              <div style={{ marginTop: 6 }}>
                <CopyButton text={`Q: ${f.q}\nA: ${f.a}`} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <CopyButton text={faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")} label="Copy all" />
          </div>
        </ToolCard>
      )}
    </>
  );
}

const PROMPT_ROLES = ["Expert copywriter", "Senior software engineer", "Data analyst", "SEO specialist", "Digital marketer", "UX designer"];
const PROMPT_FORMATS = ["Markdown with headings", "Bullet points", "Step-by-step numbered list", "Table", "Plain paragraph"];

export function AiPromptGeneratorTool() {
  const [goal, setGoal] = useState("Write a blog post about AI automation for small businesses");
  const [role, setRole] = useState(PROMPT_ROLES[0]);
  const [format, setFormat] = useState(PROMPT_FORMATS[0]);
  const [extra, setExtra] = useState("Keep it practical, include real examples, avoid fluff");
  const [prompt, setPrompt] = useState("");
  const [examples, setExamples] = useState<string[]>([]);

  const generate = () => {
    const p = [
      `You are a ${role}.`,
      ``,
      `## Task`,
      `${goal.trim() || "Write a response to the request below."}`,
      ``,
      `## Requirements`,
      `- Output format: ${format}`,
      `- Tone: clear, professional, and useful — no filler`,
      `- ${extra.trim() || "Answer completely and accurately"}`,
      `- If any information is uncertain, say so rather than guessing`,
      ``,
      `## Rules`,
      `- Do not use AI clichés like "delve", "in today's fast-paced world", or "game-changer"`,
      `- Use short sentences and concrete examples`,
      `- Structure the output for easy scanning`,
    ].join("\n");
    setPrompt(p);
    const ex = [
      `Rewrite this headline to be more clickable: "AI in Business"\n\nStyle: curiosity + specificity. Provide 5 variants with a one-line rationale each.`,
      `Explain ${PROMPT_ROLES[1]} concepts to a complete beginner.\n\nUse analogies, avoid jargon, and end with a 3-question self-check.`,
      `You are an SEO specialist. Provide a content outline for: "${goal || 'topic'}"\n\nInclude target keywords, suggested H2s, FAQs (5), and internal/external link ideas.`,
    ];
    setExamples(ex);
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Your goal">
          <textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} style={s.ta(110)} />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)} style={s.sel}>
            {PROMPT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Output format">
          <select value={format} onChange={(e) => setFormat(e.target.value)} style={s.sel}>
            {PROMPT_FORMATS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Extra instructions (optional)">
        <input value={extra} onChange={(e) => setExtra(e.target.value)} style={s.inp} />
      </Field>
      <button style={s.btn} onClick={generate}><Sparkles size={14} /> Build prompt</button>
      {prompt && (
        <>
          <ToolCard title="Your prompt">
            <textarea rows={12} readOnly value={prompt} style={{ ...s.ta, fontFamily: "monospace", fontSize: 13 }} />
            <div style={{ marginTop: 8 }}>
              <CopyButton text={prompt} label="Copy prompt" />
            </div>
          </ToolCard>
          <ToolCard title="Example prompts you can adapt">
            {examples.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 2px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text)", flexGrow: 1, whiteSpace: "pre-wrap" }}>{e}</span>
                <CopyButton text={e} />
              </div>
            ))}
          </ToolCard>
        </>
      )}
    </>
  );
}

const WEAK_PHRASES: [RegExp, string][] = [
  [/\bin today's fast-paced world\b/gi, "Right now"],
  [/\bdelve into\b/gi, "explore"],
  [/\bin conclusion\b/gi, "To sum up"],
  [/\bgame-changer\b/gi, "a big shift"],
  [/\bleverage\b/gi, "use"],
  [/\bunlock\b/gi, "tap into"],
  [/\bharness(ing|ed|es)?\b/gi, "use"],
  [/\bultimately\b/gi, "in the end"],
  [/\bbasically\b/gi, "simply"],
  [/\bembrace\b/gi, "adopt"],
  [/\bbest-in-class\b/gi, "top-tier"],
  [/\bcutting-edge\b/gi, "newest"],
  [/\bstay ahead of the curve\b/gi, "keep up"],
  [/\brevolutioniz(e|ing|es|ed)\b/gi, "transform"],
  [/\bseamless(ly)?\b/gi, "smooth"],
];

const SENTENCE_OPENERS = ["", "", "", "Here's what matters: ", "The key point: ", "", "What this means: ", "", "Plainly: ", ""];

export function AiTextHumanizerTool() {
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<"conversational" | "professional" | "simple">("conversational");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<{ in: number; out: number } | null>(null);

  const humanize = () => {
    let text = input.trim();
    if (!text) return;
    const wordsIn = text.split(/\s+/).length;

    for (const [re, rep] of WEAK_PHRASES) {
      text = text.replace(re, rep as string);
    }

    const sentences = text.split(/(?<=[.!?])\s+/);
    const out = sentences
      .map((sent, i) => {
        let s = sent.trim();
        if (style === "conversational") {
          s = s
            .replace(/^Additionally, /i, "")
            .replace(/^Furthermore, /i, "")
            .replace(/^Moreover, /i, "")
            .replace(/^It is important to note that /i, "")
            .replace(/^Please note that /i, "")
            .replace(/it should be noted that /gi, "");
          if (i > 0 && SENTENCE_OPENERS[i % SENTENCE_OPENERS.length] && s.length > 40) {
            s = SENTENCE_OPENERS[i % SENTENCE_OPENERS.length] + s.charAt(0).toLowerCase() + s.slice(1);
          }
        } else if (style === "professional") {
          s = s.replace(/\bain't\b/gi, "is not").replace(/\bgonna\b/gi, "going to").replace(/\bwanna\b/gi, "want to").replace(/\bbecause\b/gi, "since");
        } else {
          s = s
            .replace(/\bhowever\b/gi, "but")
            .replace(/\bnevertheless\b/gi, "still")
            .replace(/\bfurthermore\b/gi, "also")
            .replace(/\badditionally\b/gi, "also")
            .replace(/\bconsequently\b/gi, "so")
            .replace(/\bregarding\b/gi, "about");
        }
        return s;
      })
      .join(" ");

    const wordsOut = out.split(/\s+/).length;
    setOutput(out);
    setStats({ in: wordsIn, out: wordsOut });
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {(["conversational", "professional", "simple"] as const).map((st) => (
          <button key={st} onClick={() => setStyle(st)} style={style === st ? s.btn : s.btn2}>
            {st === "conversational" ? "Conversational" : st === "professional" ? "Professional" : "Simple English"}
          </button>
        ))}
      </div>
      <Field label="Your text">
        <textarea rows={8} value={input} onChange={(e) => setInput(e.target.value)} style={s.ta(240)} placeholder="Paste AI-sounding or formal text here…" />
      </Field>
      <button style={s.btn} onClick={humanize}><Sparkles size={14} /> Humanize text</button>
      {output && (
        <ToolCard title="Humanized version">
          <textarea rows={8} readOnly value={output} style={s.ta(240)} />
          {stats && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              {stats.in} words → {stats.out} words · removes AI clichés, filler phrases, and robotic transitions
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <CopyButton text={output} label="Copy result" />
          </div>
        </ToolCard>
      )}
    </>
  );
}
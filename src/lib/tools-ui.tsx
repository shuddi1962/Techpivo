"use client";

import React, { useState } from "react";
import { Check, Copy, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

export const s = {
  btn: {
    padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "#ffffff",
    border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  } as React.CSSProperties,
  btn2: {
    padding: "8px 18px", borderRadius: 8, background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  } as React.CSSProperties,
  btn2Off: {
    padding: "8px 18px", borderRadius: 8, background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: "not-allowed",
    opacity: 0.5, display: "inline-flex", alignItems: "center", gap: 6,
  } as React.CSSProperties,
  inp: {
    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", fontSize: 14, outline: "none",
    boxSizing: "border-box",
  } as React.CSSProperties,
  sel: {
    padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--text)", fontSize: 14, outline: "none",
  } as React.CSSProperties,
  lab: {
    display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--muted)",
  } as React.CSSProperties,
  ta: (h = 300) =>
    ({
      width: "100%", height: h, padding: 12, borderRadius: 10,
      border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)",
      fontFamily: "monospace", fontSize: 13, resize: "vertical", outline: "none",
      boxSizing: "border-box",
    }) as React.CSSProperties,
  err: {
    padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626",
    fontSize: 13, border: "1px solid #FECACA",
  } as React.CSSProperties,
  ok: {
    padding: "10px 14px", borderRadius: 8, background: "#ECFDF5", color: "#047857",
    fontSize: 13, border: "1px solid #A7F3D0",
  } as React.CSSProperties,
  card: {
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16,
  } as React.CSSProperties,
  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } as React.CSSProperties,
  tag: {
    padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.4,
  } as React.CSSProperties,
};

export function CopyButton({
  text, label = "Copy", size = "sm",
}: { text: string; label?: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const style = size === "sm" ? { ...s.btn2, padding: "5px 12px", fontSize: 12 } : s.btn2;
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      disabled={!text}
      style={text ? style : s.btn2Off}
    >
      {copied ? <Check size={size === "sm" ? 12 : 14} /> : <Copy size={size === "sm" ? 12 : 14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function Field({
  label, children, style,
}: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={s.lab}>{label}</label>
      {children}
    </div>
  );
}

export function ToolCard({
  title, children, style,
}: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...s.card, marginBottom: 12, ...style }}>
      {title && (
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: "var(--text)" }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...s.err, margin: "0 0 12px" }}>
      <AlertCircle size={13} style={{ verticalAlign: -2 }} /> {children}
    </div>
  );
}

export function OkBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...s.ok, margin: "0 0 12px" }}>
      <CheckCircle2 size={13} style={{ verticalAlign: -2 }} /> {children}
    </div>
  );
}

export function FilePicker({ label, accept, onPick, disabled }: { label: string; accept?: string; onPick: (file: File | undefined) => void; disabled?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => { onPick(e.target.files?.[0]); e.currentTarget.value = ""; }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        style={{ ...s.btn, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Upload size={14} /> {label}
      </button>
    </div>
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  downloadBlob(new Blob([content], { type: `${mime};charset=utf-8` }), filename);
}

export function hexFromBuffer(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function downloadIcon(size = 14) {
  return <Download size={size} />;
}

export function uploadIcon(size = 14) {
  return <Upload size={size} />;
}

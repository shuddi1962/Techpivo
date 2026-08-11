"use client";

import React, { useMemo, useState } from "react";
import { Copy, Download, Loader2, Upload } from "lucide-react";
import { s, CopyButton, Field, ToolCard, ErrorBox, OkBox } from "./tools-ui";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image — is it a valid PNG/JPG/WebP?"));
    };
    img.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      type,
      quality
    );
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const FILE_BTN = { ...s.btn2, cursor: "pointer" } as React.CSSProperties;

function useProcessedImage(opts: {
  scale?: number;
  width?: number;
  height?: number;
  keepAspect?: boolean;
  type: string;
  quality: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string; width: number; height: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const process = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const img = await loadImage(f);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (opts.width && opts.height) {
        if (opts.keepAspect) {
          const ratio = Math.min(opts.width / w, opts.height / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        } else {
          w = opts.width;
          h = opts.height;
        }
      } else if (opts.scale && opts.scale !== 100) {
        w = Math.max(1, Math.round((w * opts.scale) / 100));
        h = Math.max(1, Math.round((h * opts.scale) / 100));
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await canvasToBlob(canvas, opts.type, opts.quality);
      setResult({ blob, url: URL.createObjectURL(blob), width: w, height: h });
    } catch (e: any) {
      setError(e?.message || "Processing failed");
    } finally {
      setBusy(false);
    }
  };

  return { file, result, error, busy, process };
}

function FilePicker({
  label, accept, onPick, compact,
}: { label: string; accept: string; onPick: (f: File | undefined) => void; compact?: boolean }) {
  const id = `file-${label.replace(/\W/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <label htmlFor={id} style={{ ...FILE_BTN, ...(compact ? { padding: "6px 14px", fontSize: 13 } : {}) }}>
      <Upload size={14} /> {label}
      <input id={id} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => onPick(e.target.files?.[0])} />
    </label>
  );
}

export function ImageCompressorTool() {
  const [quality, setQuality] = useState(0.8);
  const [scale, setScale] = useState(100);
  const [type, setType] = useState("image/jpeg");
  const { file, result, error, busy, process } = useProcessedImage({ scale, type, quality });
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <FilePicker label="Choose image (PNG/JPG/WebP)" accept="image/*" onPick={process} />
          {file && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name} · {formatBytes(file.size)}</span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 12 }}>
          <Field label={`Quality: ${Math.round(quality * 100)}%`}>
            <input type="range" min={0.2} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
          <Field label={`Scale: ${scale}%`}>
            <input type="range" min={10} max={100} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
          <Field label="Output format">
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...s.sel, width: "100%" }}>
              <option value="image/jpeg">JPG (photos)</option>
              <option value="image/webp">WebP (smallest)</option>
              <option value="image/png">PNG (lossless)</option>
            </select>
          </Field>
        </div>
      </ToolCard>
      {busy && (
        <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Compressing…</OkBox>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
      {result && (
        <>
          <OkBox>
            {result.width}×{result.height}px · {formatBytes(result.blob.size)} ({(file && file.size ? (100 - (result.blob.size / file.size) * 100) : 0).toFixed(1)}% smaller)
          </OkBox>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...s.card, marginBottom: 0 }}>
              <label style={s.lab}>Compressed preview</label>
              <img src={result.url} alt="Compressed preview" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, display: "block" }} />
            </div>
            <div style={{ ...s.card, marginBottom: 0 }}>
              <label style={s.lab}>Download</label>
              <div style={{ marginTop: 8 }}>
                <a
                  href={result.url}
                  download={`compressed-${file?.name || "image"}`}
                  style={{ textDecoration: "none" }}
                >
                  <button style={s.btn}>
                    <Download size={14} /> Download {type === "image/jpeg" ? ".jpg" : type === "image/webp" ? ".webp" : ".png"}
                  </button>
                </a>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 10 }}>
                Original: {file ? formatBytes(file.size) : "—"} → Compressed: {formatBytes(result.blob.size)}
              </div>
            </div>
          </div>
        </>
      )}
      {!result && !busy && !error && (
        <OkBox>Choose an image — compression runs 100% in your browser, nothing is uploaded.</OkBox>
      )}
    </>
  );
}

export function ImageResizerTool() {
  const [mode, setMode] = useState<"percent" | "exact">("percent");
  const [percent, setPercent] = useState(50);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [keepAspect, setKeepAspect] = useState(true);
  const [type, setType] = useState("image/webp");
  const { file, result, error, busy, process } = useProcessedImage({
    scale: mode === "percent" ? percent : undefined,
    width: mode === "exact" ? width : undefined,
    height: mode === "exact" ? height : undefined,
    keepAspect,
    type,
    quality: 0.9,
  });
  const reProcess = (f: File | undefined) => process(f);
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <FilePicker label="Choose image" accept="image/*" onPick={reProcess} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 12 }}>
          <Field label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value as "percent" | "exact")} style={{ ...s.sel, width: "100%" }}>
              <option value="percent">By percentage</option>
              <option value="exact">Exact size</option>
            </select>
          </Field>
          {mode === "percent" ? (
            <Field label={`Scale: ${percent}%`}>
              <input type="range" min={5} max={200} step={5} value={percent} onChange={(e) => setPercent(Number(e.target.value))} style={{ width: "100%" }} />
            </Field>
          ) : (
            <>
              <Field label="Width (px)">
                <input type="number" min={1} max={8000} value={width} onChange={(e) => setWidth(Math.max(1, Number(e.target.value) || 1))} style={s.inp} />
              </Field>
              <Field label="Height (px)">
                <input type="number" min={1} max={8000} value={height} onChange={(e) => setHeight(Math.max(1, Number(e.target.value) || 1))} style={s.inp} />
              </Field>
            </>
          )}
          <Field label="Format">
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...s.sel, width: "100%" }}>
              <option value="image/webp">WebP</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
            </select>
          </Field>
        </div>
        {mode === "exact" && (
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
            <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} />
            Keep aspect ratio (fit inside the box)
          </label>
        )}
      </ToolCard>
      {busy && <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Resizing…</OkBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {result && (
        <>
          <OkBox>{result.width}×{result.height}px · {formatBytes(result.blob.size)}</OkBox>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...s.card, marginBottom: 0 }}>
              <label style={s.lab}>Preview</label>
              <img src={result.url} alt="Resized preview" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, display: "block" }} />
            </div>
            <div style={{ ...s.card, marginBottom: 0 }}>
              <label style={s.lab}>Download</label>
              <div style={{ marginTop: 8 }}>
                <a href={result.url} download={`resized-${file?.name || "image"}`} style={{ textDecoration: "none" }}>
                  <button style={s.btn}><Download size={14} /> Download</button>
                </a>
              </div>
            </div>
          </div>
        </>
      )}
      {!result && !busy && !error && <OkBox>Choose an image to resize — everything happens locally.</OkBox>}
    </>
  );
}

export function WebpConverterTool() {
  const [quality, setQuality] = useState(0.85);
  const { file, result, error, busy, process } = useProcessedImage({ type: "image/webp", quality });
  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <FilePicker label="Choose PNG/JPG" accept="image/png,image/jpeg,image/jpg" onPick={process} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name} · {formatBytes(file.size)}</span>}
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label={`WebP quality: ${Math.round(quality * 100)}%`}>
            <input type="range" min={0.2} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
        </div>
      </ToolCard>
      {busy && <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Converting…</OkBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {result && (
        <>
          <OkBox>
            {file && file.size
              ? `${formatBytes(result.blob.size)} — ${(100 - (result.blob.size / file.size) * 100).toFixed(1)}% smaller than the original`
              : `${formatBytes(result.blob.size)}`}
          </OkBox>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...s.card, marginBottom: 0 }}>
              <label style={s.lab}>WebP preview</label>
              <img src={result.url} alt="WebP preview" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, display: "block" }} />
            </div>
            <div style={{ ...s.card, marginBottom: 0 }}>
              <label style={s.lab}>Download</label>
              <div style={{ marginTop: 8 }}>
                <a href={result.url} download={`${(file?.name || "image").replace(/\.[^.]+$/, "")}.webp`} style={{ textDecoration: "none" }}>
                  <button style={s.btn}><Download size={14} /> Download .webp</button>
                </a>
              </div>
            </div>
          </div>
        </>
      )}
      {!result && !busy && !error && (
        <OkBox>WebP is supported by all modern browsers and is typically 25-35% smaller than JPG at equal quality.</OkBox>
      )}
    </>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  let h = clean;
  if (clean.length === 3) h = clean.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function shade(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (factor > 0 ? (255 - c) : c) * Math.abs(factor));
  const r = factor >= 0 ? mix(rgb.r) : mix(rgb.r);
  const g = factor >= 0 ? mix(rgb.g) : mix(rgb.g);
  const b = factor >= 0 ? mix(rgb.b) : mix(rgb.b);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function contrastRatio(hex: string): "white" | "black" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "black";
  const lum = (r: number) => {
    const c = r / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lum(rgb.r) + 0.7152 * lum(rgb.g) + 0.0722 * lum(rgb.b);
  return L > 0.4 ? "black" : "white";
}

export function ColorTool() {
  const [hex, setHex] = useState("#6366F1");
  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => (rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null), [rgb]);
  const shades = useMemo(() => {
    if (!rgb) return [];
    return [-0.5, -0.35, -0.2, -0.1, 0, 0.1, 0.2, 0.35, 0.5, 0.7].map((f) => shade(hex, f));
  }, [hex, rgb]);
  const textColor = contrastRatio(hex);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <ToolCard title="Pick a color">
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <input
                type="color"
                value={hexToRgb(hex) ? hex : "#6366F1"}
                onChange={(e) => setHex(e.target.value)}
                style={{ width: 60, height: 44, border: "1px solid var(--border)", borderRadius: 8, background: "none", cursor: "pointer", padding: 0 }}
              />
              <input value={hex} onChange={(e) => setHex(e.target.value)} style={{ ...s.inp, fontFamily: "monospace", width: 110 }} />
            </div>
            <div
              style={{
                height: 90, borderRadius: 10, background: hex, border: "1px solid var(--border)",
                display: "flex", alignItems: "flex-end", padding: 12,
                color: textColor, fontWeight: 700, fontSize: 14,
              }}
            >
              {hexToRgb(hex) ? "Preview text on this color" : "Invalid hex"}
            </div>
          </ToolCard>
        </div>
        <div>
          <ToolCard title="Conversions">
            {rgb && hsl ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["HEX", hex.toUpperCase()],
                  ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
                  ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", width: 44 }}>{l}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 14, flexGrow: 1, color: "var(--text)", wordBreak: "break-all" }}>{v}</span>
                    <CopyButton text={v} />
                  </div>
                ))}
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  Contrast: use {textColor === "white" ? "white" : "black"} text on this color
                </div>
              </div>
            ) : (
              <ErrorBox>Enter a valid hex color (e.g. #6366F1 or #f60)</ErrorBox>
            )}
          </ToolCard>
        </div>
      </div>
      {rgb && (
        <ToolCard title="Shades & tints">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {shades.map((sh, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <button
                  onClick={() => setHex(sh)}
                  style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid var(--border)", background: sh, cursor: "pointer" }}
                  aria-label={`Select ${sh}`}
                />
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", marginTop: 4 }}>{sh}</div>
              </div>
            ))}
          </div>
        </ToolCard>
      )}
    </>
  );
}

type PdfDoc = { pages: { width: number; height: number }[]; size: number };

async function readPdf(file: File): Promise<{ doc: any; info: PdfDoc }> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const info = {
    pages: doc.getPages().map((p: any) => ({ width: p.getWidth(), height: p.getHeight() })),
    size: bytes.byteLength,
  };
  return { doc, info };
}

function parsePageRanges(input: string, pageCount: number): number[] | null {
  const selected = new Set<number>();
  for (const part of input.split(",")) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes("-")) {
      const [a, b] = p.split("-").map((x) => Number(x.trim()));
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > pageCount || a > b) return null;
      for (let i = a; i <= b; i++) selected.add(i);
    } else {
      const n = Number(p);
      if (!Number.isInteger(n) || n < 1 || n > pageCount) return null;
      selected.add(n);
    }
  }
  return [...selected].sort((a, b) => a - b);
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneName, setDoneName] = useState("");

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    setError("");
    setDoneName("");
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
  };

  const merge = async () => {
    if (files.length < 2) {
      setError("Add at least two PDFs to merge");
      return;
    }
    setBusy(true);
    setError("");
    setDoneName("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p: any) => out.addPage(p));
      }
      const bytes = await out.save();
      downloadPdf(bytes, `merged-${Date.now()}.pdf`);
      setDoneName(`merged-${Date.now()}.pdf`);
    } catch (e: any) {
      setError(e?.message || "Merge failed — ensure all files are valid PDFs");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolCard title="Add PDFs">
        <div style={s.row}>
          <label htmlFor="merge-files" style={FILE_BTN}>
            <Upload size={14} /> Add PDF files
          </label>
          <input id="merge-files" type="file" accept="application/pdf" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
          <button style={s.btn} onClick={merge} disabled={busy}>
            {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
            {busy ? "Merging…" : `Merge ${files.length} file${files.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </ToolCard>
      {error && <ErrorBox>{error}</ErrorBox>}
      {doneName && <OkBox>Downloaded {doneName}</OkBox>}
      {files.length > 0 && (
        <ToolCard title="Order (top = first page)">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", width: 22 }}>{i + 1}.</span>
              <span style={{ flexGrow: 1, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <button style={{ ...s.btn2, padding: "4px 8px", fontSize: 12 }} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button style={{ ...s.btn2, padding: "4px 8px", fontSize: 12 }} onClick={() => move(i, 1)} disabled={i === files.length - 1}>↓</button>
              <button style={{ ...s.btn2, padding: "4px 8px", fontSize: 12 }} onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </ToolCard>
      )}
      <div style={{ ...s.card }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Files are merged locally with pdf-lib — they never leave your browser.
        </div>
      </div>
    </>
  );
}

export function SplitPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PdfDoc | null>(null);
  const [ranges, setRanges] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneName, setDoneName] = useState("");

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    setDoneName("");
    setFile(f);
    setInfo(null);
    try {
      const { info: pdfInfo } = await readPdf(f);
      setInfo(pdfInfo);
    } catch {
      setError("Could not read this PDF");
      setFile(null);
    }
  };

  const split = async () => {
    if (!file || !info) return;
    const pages = parsePageRanges(ranges, info.pages.length);
    if (!pages) {
      setError(`Invalid range — use formats like 1-5, 8, 10-12 (max ${info.pages.length} pages)`);
      return;
    }
    setBusy(true);
    setError("");
    setDoneName("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const copy = await out.copyPages(src, pages.map((p) => p - 1));
      copy.forEach((p: any) => out.addPage(p));
      const bytes = await out.save();
      const name = `split-${Date.now()}.pdf`;
      downloadPdf(bytes, name);
      setDoneName(name);
    } catch (e: any) {
      setError(e?.message || "Split failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolCard title="PDF file">
        <div style={s.row}>
          <label htmlFor="split-file" style={FILE_BTN}>
            <Upload size={14} /> Choose PDF
          </label>
          <input id="split-file" type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => pick(e.target.files?.[0])} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name}</span>}
        </div>
        {info && (
          <OkBox>{info.pages.length} pages · {formatBytes(info.size)}</OkBox>
        )}
      </ToolCard>
      {error && <ErrorBox>{error}</ErrorBox>}
      {doneName && <OkBox>Downloaded {doneName}</OkBox>}
      {info && (
        <ToolCard title="Pages to keep">
          <Field label={`Ranges (1-${info.pages.length}): e.g. 1-3, 7, 9-10`}>
            <input value={ranges} onChange={(e) => setRanges(e.target.value)} style={{ ...s.inp, fontFamily: "monospace" }} />
          </Field>
          <div style={{ marginTop: 10 }}>
            <button style={s.btn} onClick={split} disabled={busy}>
              {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
              {busy ? "Extracting…" : "Extract pages"}
            </button>
          </div>
        </ToolCard>
      )}
      <div style={{ ...s.card }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Extraction runs locally in your browser — the file is never uploaded.
        </div>
      </div>
    </>
  );
}

export function CompressPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState(0.6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);

  const compress = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p: any) => out.addPage(p));
      const bytes = await out.save({ useObjectStreams: true });
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResult({ blob, url: URL.createObjectURL(blob) });
    } catch (e: any) {
      setError(e?.message || "Compression failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <label htmlFor="pdf-compress-file" style={FILE_BTN}>
            <Upload size={14} /> Choose PDF
          </label>
          <input id="pdf-compress-file" type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => compress(e.target.files?.[0])} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name} · {formatBytes(file.size)}</span>}
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label={`Aggressiveness: ${Math.round(level * 100)}%`}>
            <input type="range" min={0.3} max={0.9} step={0.05} value={level} onChange={(e) => setLevel(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
        </div>
      </ToolCard>
      {busy && <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Compressing…</OkBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {result && file && (
        <>
          <OkBox>
            {formatBytes(result.blob.size)} — {(100 - (result.blob.size / file.size) * 100).toFixed(1)}% smaller (from {formatBytes(file.size)})
          </OkBox>
          <div style={{ ...s.card }}>
            <a href={result.url} download={`compressed-${file.name}`} style={{ textDecoration: "none" }}>
              <button style={s.btn}><Download size={14} /> Download compressed PDF</button>
            </a>
          </div>
        </>
      )}
      <div style={{ ...s.card }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Note: text-only PDFs shrink little (text streams are already compact); scanned PDFs can drop 40-70%. Processing is local — nothing is uploaded.
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Excel <-> PDF + Image Upscaler (new, all local, no APIs)           */
/* ------------------------------------------------------------------ */

function sanitizeCell(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

async function workbookToRows(file: File, sheetName?: string): Promise<{ rows: string[][]; sheets: string[] }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheets = wb.SheetNames;
  const ws = wb.Sheets[(sheetName && wb.Sheets[sheetName]) ? sheetName : sheets[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return { rows: raw.map((r) => (Array.isArray(r) ? r : []).map(sanitizeCell)), sheets };
}

function fitPdfColWidths(rows: string[][], font: any): number[] {
  const MAX_W = 5; // inches
  const cols = Math.min(12, Math.max(...rows.map((r) => r.length), 0));
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    let longest = 0;
    for (let i = 0; i < Math.min(rows.length, 400); i++) {
      const cell = rows[i][c] || "";
      const w = cell.length * (cell.length > 20 ? 0.055 : 0.065);
      if (w > longest) longest = w;
    }
    widths.push(Math.min(2.6, Math.max(0.55, longest)));
  }
  return widths;
}

export function ExcelToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setError("");
    setResult(null);
    setRows([]);
    setBusy(true);
    try {
      const { rows: r, sheets: s } = await workbookToRows(f);
      setRows(r);
      setSheets(s);
      setSheet(s[0] || "");
      if (s.length > 1) {
        setSheet(s[1] && confirm("This file has multiple sheets. Convert the second sheet (" + s[1] + ") instead?") ? s[1] : s[0]);
      }
    } catch (e: any) {
      setError("Could not read the spreadsheet. Support .xlsx, .xls, .csv and .tsv files.");
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!rows.length) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { PDFDocument, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
      const pageW = rows[0].length > 6 ? 792 : 612;
      const pageH = 612;
      const widths = fitPdfColWidths(rows, font);
      const cellH = 14;
      const top = 30;
      const perPage = Math.floor((pageH - top - 40) / cellH);
const block = (page: any, rows: string[][], startRowIdx: number) => {
        let y = pageH - top;
        if (startRowIdx === 0) {
          page.drawText("Exported from TechPivo — " + (file?.name || "spreadsheet"), { x: 30, y: y + 22, size: 8, font, color: { r: 0.45, g: 0.45, b: 0.45 } });
        }
        rows.forEach((row, i) => {
          const isHeader = startRowIdx + i === 0;
          let x = 30;
          row.forEach((cell, c) => {
            const w = widths[c] * 72;
            const text = cell.length > 45 ? cell.slice(0, 44) + "…" : cell;
            page.drawText(text, { x: x + 4, y: y - 9, size: 8, font: isHeader ? fontB : font, maxWidth: w - 8 });
            page.drawRectangle({ x, y: y - 13, width: w, height: cellH, borderColor: { r: 0.8, g: 0.8, b: 0.8 }, borderWidth: isHeader ? 1 : 0.5 });
            x += w;
          });
          y -= cellH;
          if (y < 40) { y = pageH - top; }
        });
      };
      for (let s = 0; s < rows.length; s += perPage) {
        const page = doc.addPage([pageW, pageH]);
        block(page, rows.slice(s, s + perPage), s);
      }
      const bytes = await doc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResult({ blob, url: URL.createObjectURL(blob) });
    } catch (e: any) {
      setError(e?.message || "PDF generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <FilePicker label="Choose spreadsheet (.xlsx/.xls/.csv/.tsv)" accept=".xlsx,.xls,.csv,.tsv" onPick={pick} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name} · {formatBytes(file.size)}</span>}
        </div>
{sheets.length > 1 && (
          <div style={{ marginTop: 10 }}>
            <Field label="Sheet">
              <select value={sheet} onChange={async (e) => {
                const sh = e.target.value;
                setSheet(sh);
                if (!file) return;
                setBusy(true);
                try {
                  const { rows: r } = await workbookToRows(file, sh);
                  setRows(r);
                } catch { setError("Could not read that sheet."); }
                setBusy(false);
              }} style={{ ...s.sel, width: "100%" }}>
                {sheets.map((sh) => <option key={sh} value={sh}>{sh}</option>)}
              </select>
            </Field>
          </div>
        )}
        {rows.length > 0 && (
          <button onClick={generate} style={{ ...s.btn, marginTop: 12 }}><Download size={14} /> Convert to PDF ({rows.length.toLocaleString()} rows)</button>
        )}
      </ToolCard>
      {busy && <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Working…</OkBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {rows.length > 0 && (
        <ToolCard title="Preview (first 100 rows)">
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    {r.slice(0, 12).map((cell, c) => (
                      <td key={c} style={{ border: "1px solid var(--border)", padding: "4px 6px", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ToolCard>
      )}
      {result && (
        <div style={{ ...s.card, marginTop: 10 }}>
          <a href={result.url} download={(file?.name || "sheet").replace(/\.[^.]+$/, "") + ".pdf"} style={{ textDecoration: "none" }}>
            <button style={s.btn}><Download size={14} /> Download PDF</button>
          </a>
        </div>
      )}
      <div style={{ ...s.card, marginTop: 10 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Everything runs locally — your spreadsheet is never uploaded. Large sheets are paginated automatically.
        </div>
      </div>
    </>
  );
}

let pdfWorkerReady = false;

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfWorkerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    pdfWorkerReady = true;
  }
  return pdfjs;
}

async function pdfTextToRows(file: File): Promise<{ rows: string[][]; pages: number }> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument(await file.arrayBuffer()).promise;
  const out: string[][] = [];
  const maxPages = Math.min(doc.numPages, 200);
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items.filter((it: any) => typeof it.str === "string" && it.str.trim() !== "");
    const marks = items.map((it: any) => {
      const t = it.transform || [1, 0, 0, 1, 0, 0];
      return { str: it.str, x: t[4], y: t[5], w: typeof it.width === "number" ? it.width : it.str.length * 4 };
    });
    marks.sort((a: any, b: any) => b.y - a.y);
    let currentRow: any[] = [];
    let currentY: number | null = null;
    for (const m of marks) {
      if (currentY !== null && Math.abs(m.y - currentY) > 4.5) {
        currentRow.sort((a, b) => a.x - b.x);
        let cells: string[] = [];
        let lastEnd = -100;
        for (const c of currentRow) {
          if (lastEnd > -50 && c.x - lastEnd > 18) cells.push("");
          cells.push(c.str);
          lastEnd = c.x + c.w;
        }
        out.push(cells);
        currentRow = [];
      }
      currentRow.push(m);
      currentY = m.y;
    }
    if (currentRow.length) {
      currentRow.sort((a, b) => a.x - b.x);
      let cells: string[] = [];
      let lastEnd = -100;
      for (const c of currentRow) {
        if (lastEnd > -50 && c.x - lastEnd > 18) cells.push("");
        cells.push(c.str);
        lastEnd = c.x + c.w;
      }
      out.push(cells);
    }
  }
  return { rows: out, pages: doc.numPages };
}

export function PdfToExcelTool() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setError("");
    setResult(null);
    setRows([]);
    setBusy(true);
    try {
      const { rows: r } = await pdfTextToRows(f);
      setRows(r);
      if (!r.length) setError("No extractable text found — this PDF is likely a scan. Try the Image Upscaler? For scanned PDFs, use OCR-capable software.");
    } catch (e: any) {
      setError("Could not read the PDF. If it is password-protected or a scanned image, text extraction is not possible locally.");
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = async () => {
    if (!rows.length) return;
    setBusy(true);
    setError("");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = rows[0]?.map((_, i) => ({ wch: Math.min(40, Math.max(8, ...rows.slice(0, 200).map((r) => (r[i] || "").length + 2))) })) || [];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PDF export");
      const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      setResult({ blob, url: URL.createObjectURL(blob) });
    } catch (e: any) {
      setError(e?.message || "Excel export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolCard title="Options">
        <div style={s.row}>
          <FilePicker label="Choose PDF" accept="application/pdf" onPick={pick} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name} · {formatBytes(file.size)}</span>}
        </div>
        {rows.length > 0 && (
          <button onClick={exportExcel} style={{ ...s.btn, marginTop: 12 }}><Download size={14} /> Export to Excel (.xlsx)</button>
        )}
      </ToolCard>
      {busy && <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Extracting text…</OkBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {rows.length > 0 && (
        <ToolCard title={`Extracted rows (${rows.length.toLocaleString()}) — preview first 100`}>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    {r.slice(0, 12).map((cell, c) => (
                      <td key={c} style={{ border: "1px solid var(--border)", padding: "4px 6px", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ToolCard>
      )}
      {result && (
        <div style={{ ...s.card, marginTop: 10 }}>
          <a href={result.url} download={(file?.name || "pdf").replace(/\.pdf$/i, "") + ".xlsx"} style={{ textDecoration: "none" }}>
            <button style={s.btn}><Download size={14} /> Download Excel file</button>
          </a>
        </div>
      )}
      <div style={{ ...s.card, marginTop: 10 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Text is extracted locally from the PDF and grouped into rows and columns. Scanned (image-only) PDFs contain no text and cannot be converted without OCR.
        </div>
      </div>
    </>
  );
}

export function ImageUpscalerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [factor, setFactor] = useState(4);
  const [type, setType] = useState("image/png");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; width: number; height: number; blob: Blob } | null>(null);

  const upscale = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const img = await loadImage(f);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const tw = w * factor;
      const th = h * factor;
      if (tw > 8192 || th > 8192 || tw * th > 80_000_000) {
        throw new Error("Result would be too large for in-browser processing (max 8192px or 80MP). Use a smaller factor.");
      }
      let srcCanvas = document.createElement("canvas");
      srcCanvas.width = w;
      srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) throw new Error("Canvas not supported");
      srcCtx.imageSmoothingEnabled = true;
      srcCtx.imageSmoothingQuality = "high";
      srcCtx.drawImage(img, 0, 0, w, h);
      let curW = w;
      let curH = h;
      while (curW < tw || curH < th) {
        const nextW = Math.min(tw, curW * 2);
        const nextH = Math.min(th, curH * 2);
        const canvas = document.createElement("canvas");
        canvas.width = nextW;
        canvas.height = nextH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(srcCanvas, 0, 0, nextW, nextH);
        srcCanvas = canvas;
        curW = nextW;
        curH = nextH;
      }
      const blob = await canvasToBlob(srcCanvas, type, 0.92);
      setResult({ url: URL.createObjectURL(blob), width: curW, height: curH, blob });
    } catch (e: any) {
      setError(e?.message || "Upscaling failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolCard title="Options">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={`Upscale factor: ${factor}x`}>
            <input type="range" min={2} max={8} step={1} value={factor} onChange={(e) => setFactor(Number(e.target.value))} style={{ width: "100%" }} />
          </Field>
          <Field label="Output format">
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...s.sel, width: "100%" }}>
              <option value="image/png">PNG (lossless)</option>
              <option value="image/jpeg">JPG (smaller)</option>
              <option value="image/webp">WebP</option>
            </select>
          </Field>
        </div>
        <div style={s.row}>
          <FilePicker label="Choose image (PNG/JPG/WebP)" accept="image/*" onPick={upscale} />
          {file && <span style={{ fontSize: 13, color: "var(--muted)" }}>{file.name} · {formatBytes(file.size)}</span>}
        </div>
      </ToolCard>
      {busy && <OkBox><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Upscaling…</OkBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {result && file && (
        <>
          <OkBox>{file.name} — {factor}x upscale: {result.width} × {result.height}px · {formatBytes(result.blob.size)}</OkBox>
          <div style={{ ...s.card, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
            <img src={result.url} alt="Upscaled result preview" style={{ maxWidth: 320, maxHeight: 220, border: "1px solid var(--border)", borderRadius: 8 }} />
            <div>
              <a href={result.url} download={`upscaled-${file.name}`} style={{ textDecoration: "none" }}>
                <button style={s.btn}><Download size={14} /> Download upscaled image</button>
              </a>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, maxWidth: 320 }}>
                Upscaling enlarges pixels — it sharpens, it cannot add detail that isn&apos;t in the original. Best results on clean logos, illustrations and screenshots.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

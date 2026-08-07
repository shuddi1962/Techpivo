"use client"

import {
  LineChart as ReLineChart, Line, BarChart as ReBarChart, Bar,
  AreaChart as ReAreaChart, Area,
  RadarChart as ReRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart as RePie, Pie,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, LabelList, Sector
} from "recharts"
import Image from "next/image"
import { useEffect, useRef, useState, useMemo } from "react"

// ─── Base Types ─────────────────────────────────────────────
interface ChartProps {
  data: any[]
  className?: string
  height?: number
}

// ─── Color Palette ─────────────────────────────────────────
const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"]

// ─── CSS Injection ─────────────────────────────────────────
const STYLE_ID = "tp-chart-styles"

function useChartCSS() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return
    const s = document.createElement("style")
    s.id = STYLE_ID
    s.textContent = `
      @keyframes tp-slide-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      @keyframes tp-fade-in { from { opacity:0 } to { opacity:1 } }
      @keyframes tp-scale-in { from { opacity:0; transform:scale(0.85) } to { opacity:1; transform:scale(1) } }
      @keyframes tp-pulse {
        0%, 100% { opacity:1; transform:scale(1) }
        50% { opacity:0.5; transform:scale(1.35) }
      }
      .tp-anim-in { animation:tp-fade-in 0.45s ease both }
      .tp-anim-up { animation:tp-slide-up 0.5s ease both }
      .tp-anim-scale { animation:tp-scale-in 0.4s ease both }
      .tp-stg:nth-child(1) { animation-delay:0ms }
      .tp-stg:nth-child(2) { animation-delay:40ms }
      .tp-stg:nth-child(3) { animation-delay:80ms }
      .tp-stg:nth-child(4) { animation-delay:120ms }
      .tp-stg:nth-child(5) { animation-delay:160ms }
      .tp-stg:nth-child(6) { animation-delay:200ms }
      .tp-stg:nth-child(7) { animation-delay:240ms }
      .tp-stg:nth-child(8) { animation-delay:280ms }
      .tp-stg:nth-child(9) { animation-delay:320ms }
      .tp-stg:nth-child(10) { animation-delay:360ms }
      .tp-pulse { animation:tp-pulse 2s ease-in-out infinite }
    `
    document.head.appendChild(s)
  }, [])
}

// ─── Glass Tooltip ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      padding: "12px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)",
      fontSize: 13,
      lineHeight: 1.5,
      minWidth: 140,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    }}>
      {label && (
        <div style={{ fontWeight: 600, marginBottom: 6, color: "hsl(var(--foreground))", fontSize: 12, opacity: 0.65, letterSpacing: "0.01em" }}>
          {label}
        </div>
      )}
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: i > 0 ? 4 : 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, whiteSpace: "nowrap" }}>
            {entry.name || entry.dataKey}:{" "}
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Shared helpers ────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 8)
}

const axisStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" }
const gridStyle: React.CSSProperties = { stroke: "hsl(var(--border))", strokeOpacity: 0.35, strokeDasharray: "none" }

function defaultMargins(type?: "area" | "pie") {
  if (type === "pie") return { top: 8, right: 8, bottom: 8, left: 8 }
  return { top: 12, right: 24, left: -4, bottom: 8 }
}

// ─── Line Chart ────────────────────────────────────────────
interface LineChartProps extends ChartProps {
  xKey: string
  lines: { key: string; color: string; name?: string }[]
  showGrid?: boolean
  smooth?: boolean
  showDots?: boolean
  gradient?: boolean
}

export function ChartLine({ data, xKey, lines, height = 300, showGrid = true, smooth = true, showDots = true, gradient = false, className }: LineChartProps) {
  useChartCSS()
  const id = useMemo(uid, [])
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReLineChart data={data} margin={defaultMargins()}>
        <defs>
          {gradient && lines.map((l, i) => (
            <linearGradient key={l.key} id={`lg-${id}-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={l.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" style={gridStyle} vertical={false} />}
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} dy={6} minTickGap={20} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-4} width={48} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.15, strokeDasharray: "4 4" }} />
        {lines.length > 1 && <Legend iconType="circle" verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />}
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type={smooth ? "monotone" : "linear"}
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2.5}
            name={l.name || l.key}
            fill={gradient ? `url(#lg-${id}-${l.key})` : undefined}
            fillOpacity={gradient ? 1 : 0}
            dot={showDots ? { r: 3, fill: l.color, stroke: "hsl(var(--background))", strokeWidth: 2, style: { transition: "r 0.15s" as any } } : false}
            activeDot={{ r: 6, fill: l.color, stroke: "hsl(var(--background))", strokeWidth: 2.5 }}
            animationBegin={i * 150}
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  )
}

// ─── Bar Chart ─────────────────────────────────────────────
interface BarChartProps extends ChartProps {
  xKey: string
  bars: { key: string; color: string; name?: string }[]
  stacked?: boolean
  layout?: "horizontal" | "vertical"
  showValues?: boolean
}

export function ChartBar({ data, xKey, bars, height = 300, stacked = false, layout = "horizontal", showValues = false, className }: BarChartProps) {
  useChartCSS()
  const id = useMemo(uid, [])
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      {layout === "vertical" ? (
        <ReBarChart data={data} layout="vertical" margin={{ top: 8, right: 32, left: 0, bottom: 4 }}>
          <defs>
            {bars.map((b) => (
              <linearGradient key={b.key} id={`bgv-${id}-${b.key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={b.color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={b.color} stopOpacity={0.9} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid style={gridStyle} horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} dx={4} />
          <YAxis type="category" dataKey={xKey} tick={{ ...axisStyle, fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.04 }} />
          {bars.length > 1 && <Legend iconType="rect" verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />}
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              fill={`url(#bgv-${id}-${b.key})`}
              name={b.name || b.key}
              stackId={stacked ? "stack" : undefined}
              radius={[0, 8, 8, 0]}
              barSize={20}
              animationBegin={i * 120}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {showValues && <LabelList dataKey={b.key} position="right" style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} formatter={(v: any) => typeof v === 'number' ? v.toLocaleString() : v} />}
            </Bar>
          ))}
        </ReBarChart>
      ) : (
        <ReBarChart data={data} margin={{ top: 8, right: 20, left: -4, bottom: 4 }}>
          <defs>
            {bars.map((b) => (
              <linearGradient key={b.key} id={`bgh-${id}-${b.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={b.color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={b.color} stopOpacity={0.5} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid style={gridStyle} vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} dy={6} minTickGap={20} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-4} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.04 }} />
          {bars.length > 1 && <Legend iconType="rect" verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />}
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              fill={`url(#bgh-${id}-${b.key})`}
              name={b.name || b.key}
              stackId={stacked ? "stack" : undefined}
              radius={[8, 8, 0, 0]}
              barSize={28}
              animationBegin={i * 120}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {showValues && <LabelList dataKey={b.key} position="top" style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} formatter={(v: any) => typeof v === 'number' ? v.toLocaleString() : v} />}
            </Bar>
          ))}
        </ReBarChart>
      )}
    </ResponsiveContainer>
  )
}

// ─── Area Chart ────────────────────────────────────────────
interface AreaChartProps extends ChartProps {
  xKey: string
  areas: { key: string; color: string; name?: string }[]
  stacked?: boolean
}

export function ChartArea({ data, xKey, areas, height = 300, stacked = false, className }: AreaChartProps) {
  useChartCSS()
  const id = useMemo(uid, [])
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReAreaChart data={data} margin={defaultMargins("area")}>
        <defs>
          {areas.map((a) => (
            <linearGradient key={a.key} id={`ag-${id}-${a.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.color} stopOpacity={0.4} />
              <stop offset="50%" stopColor={a.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={a.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid style={gridStyle} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} dy={6} minTickGap={16} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-4} width={48} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.12, strokeDasharray: "4 4" }} />
        {areas.length > 1 && <Legend iconType="circle" verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />}
        {areas.map((a, i) => (
          <Area
            key={a.key}
            type="monotone"
            dataKey={a.key}
            stroke={a.color}
            fill={`url(#ag-${id}-${a.key})`}
            name={a.name || a.key}
            strokeWidth={2.5}
            stackId={stacked ? "stack" : undefined}
            animationBegin={i * 150}
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
        ))}
      </ReAreaChart>
    </ResponsiveContainer>
  )
}

// ─── Radar Chart ────────────────────────────────────────────
interface RadarChartProps extends ChartProps {
  angleKey: string
  metrics: { key: string; color: string; name?: string }[]
}

export function ChartRadar({ data, angleKey, metrics, height = 350, className }: RadarChartProps) {
  useChartCSS()
  const id = useMemo(uid, [])
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReRadarChart data={data}>
        <defs>
          {metrics.map((m) => (
            <linearGradient key={m.key} id={`rg-${id}-${m.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={m.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={m.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
        <PolarAngleAxis dataKey={angleKey} tick={{ ...axisStyle, fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {metrics.length > 1 && <Legend iconType="circle" verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />}
        {metrics.map((m, i) => (
          <Radar
            key={m.key}
            dataKey={m.key}
            stroke={m.color}
            fill={`url(#rg-${id}-${m.key})`}
            fillOpacity={1}
            name={m.name || m.key}
            strokeWidth={2.5}
            animationBegin={i * 200}
            animationDuration={900}
            animationEasing="ease-out"
          />
        ))}
      </ReRadarChart>
    </ResponsiveContainer>
  )
}

// ─── Pie Chart (with optional donut + active shape) ────────
interface PieChartProps extends ChartProps {
  nameKey: string
  valueKey: string
  colors?: string[]
  showLabel?: boolean
  donut?: boolean
  innerSize?: number
}

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.15} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

export function ChartPie({ data, nameKey, valueKey, colors = COLORS, height = 300, showLabel = false, donut = false, className, innerSize }: PieChartProps) {
  useChartCSS()
  const inner = donut ? (innerSize || 60) : 0
  const total = useMemo(() => data.reduce((s: number, d: any) => s + (d[valueKey] || 0), 0), [data, valueKey])
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <RePie margin={defaultMargins("pie")}>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={inner}
          label={showLabel ? ({ name, value }: any) => `${name} ${((value / total) * 100).toFixed(0)}%` : false}
          labelLine={showLabel}
          paddingAngle={3}
          animationBegin={200}
          animationDuration={800}
          animationEasing="ease-out"
          stroke="hsl(var(--background))"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </RePie>
    </ResponsiveContainer>
  )
}

// ─── Composed Chart (Bar + Line) ───────────────────────────
interface ComposedChartProps extends ChartProps {
  xKey: string
  bars?: { key: string; color: string; name?: string }[]
  lines?: { key: string; color: string; name?: string }[]
}

export function ChartComposed({ data, xKey, bars = [], lines = [], height = 300, className }: ComposedChartProps) {
  useChartCSS()
  const id = useMemo(uid, [])
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ComposedChart data={data} margin={defaultMargins()}>
        <defs>
          {bars.map((b) => (
            <linearGradient key={b.key} id={`cg-${id}-${b.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={b.color} stopOpacity={0.85} />
              <stop offset="100%" stopColor={b.color} stopOpacity={0.45} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid style={gridStyle} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} dy={6} minTickGap={20} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} dx={-4} width={48} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.1 }} />
        {(bars.length > 1 || lines.length > 1) && <Legend iconType="circle" verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            fill={`url(#cg-${id}-${b.key})`}
            name={b.name || b.key}
            radius={[6, 6, 0, 0]}
            barSize={22}
            animationBegin={i * 100}
            animationDuration={700}
            animationEasing="ease-out"
          />
        ))}
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2.5}
            name={l.name || l.key}
            dot={{ r: 3, fill: l.color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: l.color, stroke: "hsl(var(--background))", strokeWidth: 2.5 }}
            animationBegin={(bars.length * 100) + (i * 150)}
            animationDuration={900}
            animationEasing="ease-in-out"
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Heat Map (grid-based with intensity) ──────────────────
interface HeatMapProps extends ChartProps {
  nameKey: string
  valueKey: string
}

export function ChartHeatMap({ data, nameKey, valueKey, height = 350, className }: HeatMapProps) {
  useChartCSS()
  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1)
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className={`tp-anim-in ${className || ""}`} style={{ minHeight: height }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
        {data.map((item, i) => {
          const val = item[valueKey] || 0
          const ratio = val / maxVal
          const intensity = Math.round(ratio * 100)
          const isHovered = hovered === i
          const bg = ratio > 0.75
            ? `linear-gradient(135deg, hsl(0 70% 50%), hsl(340 70% 45%))`
            : ratio > 0.5
            ? `linear-gradient(135deg, hsl(30 80% 55%), hsl(20 80% 45%))`
            : ratio > 0.25
            ? `linear-gradient(135deg, hsl(200 65% 50%), hsl(210 65% 40%))`
            : `linear-gradient(135deg, hsl(160 55% 40%), hsl(170 55% 35%))`
          return (
            <div
              key={i}
              className="tp-stg"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                background: bg,
                minHeight: 90,
                transform: isHovered ? "scale(1.04)" : "scale(1)",
                boxShadow: isHovered ? "0 8px 25px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.08)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }} />
              <div style={{ position: "relative", padding: "14px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", minHeight: 90 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.15)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item[nameKey]}
                </span>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", display: "block", textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                    {val.toLocaleString()}
                  </span>
                  <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "rgba(255,255,255,0.7)", borderRadius: 2, width: `${intensity}%`, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </div>
              {isHovered && (
                <div style={{
                  position: "absolute",
                  top: -36,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 20,
                  backdropFilter: "blur(12px)",
                  pointerEvents: "none",
                }}>
                  {item[nameKey]}: <strong>{val.toLocaleString()}</strong>
                  <div style={{
                    position: "absolute",
                    bottom: -4,
                    left: "50%",
                    transform: "translateX(-50%) rotate(45deg)",
                    width: 8,
                    height: 8,
                    background: "hsl(var(--popover))",
                    borderRight: "1px solid hsl(var(--border))",
                    borderBottom: "1px solid hsl(var(--border))",
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {data.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
          No data available
        </div>
      )}
    </div>
  )
}

// ─── Timeline ──────────────────────────────────────────────
interface TimelineProps {
  events: { date: string; label: string; description?: string; type?: "success" | "warning" | "error" | "info" }[]
  className?: string
}

export function ChartTimeline({ events, className }: TimelineProps) {
  useChartCSS()
  const typeStyles: Record<string, { bg: string; shadow: string; icon: string; label: string }> = {
    success: { bg: "linear-gradient(135deg, #22c55e, #16a34a)", shadow: "rgba(34,197,94,0.35)", icon: "\u2713", label: "Success" },
    warning: { bg: "linear-gradient(135deg, #f59e0b, #d97706)", shadow: "rgba(245,158,11,0.35)", icon: "\u26A0", label: "Warning" },
    error: { bg: "linear-gradient(135deg, #ef4444, #dc2626)", shadow: "rgba(239,68,68,0.35)", icon: "\u2715", label: "Error" },
    info: { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", shadow: "rgba(59,130,246,0.35)", icon: "\u2139", label: "Info" },
  }
  return (
    <div className={className || ""}>
      {events.map((event, i) => {
        const s = typeStyles[event.type || "info"]
        return (
          <div key={i} className="tp-anim-up tp-stg" style={{ display: "flex", gap: 14, paddingBottom: i < events.length - 1 ? 28 : 0, position: "relative" }}>
            {i < events.length - 1 && (
              <div style={{ position: "absolute", left: 14, top: 28, bottom: 0, width: 2, background: "linear-gradient(to bottom, hsl(var(--border)), transparent)" }} />
            )}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                boxShadow: `0 4px 12px ${s.shadow}`,
                border: "2px solid hsl(var(--background))",
                flexShrink: 0,
              }}>
                {s.icon}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, background: "hsl(var(--card))", borderRadius: 10, padding: "10px 14px", border: "1px solid hsl(var(--border))" }}>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontWeight: 500, letterSpacing: "0.02em" }}>{event.date}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))", marginTop: 2 }}>{event.label}</div>
              {event.description && (
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4, lineHeight: 1.5 }}>{event.description}</div>
              )}
            </div>
          </div>
        )
      })}
      {events.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
          No timeline events
        </div>
      )}
    </div>
  )
}

// ─── Geographic Map ─────────────────────────────────────────
interface GeoMapProps extends ChartProps {
  countryKey: string
  valueKey: string
  flagKey?: string
}

export function ChartGeoMap({ data, countryKey, valueKey, flagKey, height = 350, className }: GeoMapProps) {
  useChartCSS()
  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1)
  const totalVal = data.reduce((s, d) => s + (d[valueKey] || 0), 0) || 1

  return (
    <div className={`tp-anim-in ${className || ""}`} style={{ minHeight: height }}>
      {data.slice(0, 20).map((item, i) => {
        const val = item[valueKey] || 0
        const pct = (val / maxVal) * 100
        const share = (val / totalVal) * 100
        const name = item[countryKey] || "Unknown"
        const flag = flagKey ? item[flagKey] || "" : ""
        const rankColors = [
          "linear-gradient(135deg, #f59e0b, #d97706)",
          "linear-gradient(135deg, #94a3b8, #64748b)",
          "linear-gradient(135deg, #b45309, #92400e)",
        ]
        return (
          <div key={i} className="tp-stg tp-anim-up" style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 10px",
            borderBottom: i < data.slice(0, 20).length - 1 ? "1px solid hsl(var(--border) / 0.5)" : "none",
            borderRadius: 8,
            transition: "background 0.15s",
            cursor: "default",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted-foreground) / 0.04)" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
          >
            <div style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: i < 3 ? "#fff" : "hsl(var(--muted-foreground))",
              background: i < 3 ? rankColors[i] : "hsl(var(--muted) / 0.2)",
              boxShadow: i < 3 ? `0 3px 10px ${["rgba(245,158,11,0.3)", "rgba(148,163,184,0.3)", "rgba(180,83,9,0.3)"][i]}` : "none",
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            {flag && <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{flag}</span>}
            <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </span>
            <div style={{ flex: "0 0 140px", height: 8, borderRadius: 4, background: "hsl(var(--muted) / 0.2)", overflow: "hidden", display: "none" }} className="sm:block">
              <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(var(--primary)))", width: `${pct}%`, transition: "width 1s ease" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", whiteSpace: "nowrap", minWidth: 70, textAlign: "right" }}>
              {val.toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", minWidth: 44, textAlign: "right" }}>
              {share.toFixed(1)}%
            </span>
          </div>
        )
      })}
      {data.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
          No geographic data available
        </div>
      )}
    </div>
  )
}

// ─── Leaderboard ────────────────────────────────────────────
interface LeaderboardProps extends ChartProps {
  nameKey: string
  valueKey: string
  valueLabel?: string
  avatarKey?: string
  subtitleKey?: string
}

export function ChartLeaderboard({ data, nameKey, valueKey, valueLabel = "Value", avatarKey, subtitleKey, height }: LeaderboardProps) {
  useChartCSS()
  const rankGradients = [
    "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
    "linear-gradient(135deg, #94a3b8 0%, #475569 100%)",
    "linear-gradient(135deg, #b45309 0%, #78350f 100%)",
  ]
  const rankShadows = [
    "0 4px 14px rgba(245,158,11,0.3)",
    "0 4px 14px rgba(148,163,184,0.25)",
    "0 4px 14px rgba(180,83,9,0.25)",
  ]
  return (
    <div className={`tp-anim-in ${height ? "" : ""}`}>
      {data.map((item, i) => (
        <div key={i} className="tp-anim-up tp-stg" style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 12,
          transition: "background 0.15s",
          cursor: "default",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.08)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: i < 3 ? "#fff" : "hsl(var(--muted-foreground))",
            background: i < 3 ? rankGradients[i] : "hsl(var(--muted) / 0.15)",
            boxShadow: i < 3 ? rankShadows[i] : "none",
            flexShrink: 0,
            position: "relative",
          }}>
            {i + 1}
            {i === 0 && <span style={{ position: "absolute", top: -4, right: -4, fontSize: 10 }}>&#x1F3C6;</span>}
          </div>
          {avatarKey && item[avatarKey] && (
            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "hsl(var(--muted))" }}>
              <Image src={item[avatarKey]} alt="" width={48} height={48} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item[nameKey]}
            </div>
            {subtitleKey && (
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                {item[subtitleKey]}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))" }}>
              {typeof item[valueKey] === "number" ? item[valueKey].toLocaleString() : item[valueKey]}
            </div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>{valueLabel}</div>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
          No data available
        </div>
      )}
    </div>
  )
}

// ─── Real-time Geographic Map (Leaflet) ─────────────────────
interface RealTimeGeoMapProps {
  data: { country: string; lat: number; lng: number; value: number; label?: string }[]
  height?: number
}

export function ChartRealTimeMap({ data, height = 400 }: RealTimeGeoMapProps) {
  useChartCSS()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  const tileProviders = useMemo(() => [
    { name: "CartoDB", url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" },
    { name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
    { name: "Stadia", url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" },
  ], [])

  const tileUrl = useMemo(
    () => tileProviders[Math.floor(Math.random() * tileProviders.length)].url,
    [tileProviders]
  )

  useEffect(() => {
    if (!isClient || !mapRef.current || data.length === 0) return

    let destroyed = false

    const initMap = async () => {
      try {
        await import("leaflet/dist/leaflet.css")
        const L = (await import("leaflet")).default

        if (destroyed || !mapRef.current) return

        if (mapInstanceRef.current) {
          markersRef.current.forEach((m) => { mapInstanceRef.current.removeLayer(m) })
          markersRef.current = []
        }

        if (!mapInstanceRef.current) {
          const map = L.map(mapRef.current, {
            center: [20, 0],
            zoom: 2,
            zoomControl: true,
            scrollWheelZoom: false,
            attributionControl: false,
          })

          L.tileLayer(tileUrl, {
            maxZoom: 19,
            attribution: "",
          }).addTo(map)

          mapInstanceRef.current = map
        }

        const maxVal = Math.max(...data.map((d) => d.value), 1)
        const bounds: [number, number][] = []

        data.forEach((point) => {
          bounds.push([point.lat, point.lng])
          const radius = Math.max(8, (point.value / maxVal) * 28)
          const hue = Math.max(0, 210 - (point.value / maxVal) * 170)

          const marker = L.circleMarker([point.lat, point.lng], {
            radius,
            fillColor: `hsl(${hue}, 70%, 50%)`,
            color: "#fff",
            weight: 2,
            opacity: 0.95,
            fillOpacity: 0.7,
            className: "tp-map-marker",
          })

          marker.bindTooltip(
            `<div style="font-family:system-ui;font-size:13px;font-weight:600;background:hsl(var(--popover));border:1px solid hsl(var(--border));border-radius:8px;padding:6px 10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              <b>${point.label || point.country}</b><br/>
              <span style="color:hsl(var(--muted-foreground))">${point.value.toLocaleString()} views</span>
            </div>`,
            { direction: "top" }
          )

          marker.addTo(mapInstanceRef.current)
          markersRef.current.push(marker)
        })

        if (bounds.length > 0) {
          mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 5 })
        }
      } catch (e) {
        console.error("Map init error:", e)
      }
    }

    initMap()

    return () => {
      destroyed = true
      if (mapInstanceRef.current) {
        markersRef.current.forEach((m) => { mapInstanceRef.current.removeLayer(m) })
        markersRef.current = []
      }
    }
  }, [isClient, data, tileUrl])

  if (!isClient) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--muted) / 0.3)", borderRadius: 12, height }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 24, height: 24, border: "2px solid", borderColor: "hsl(var(--primary)) transparent hsl(var(--primary)) transparent", borderRadius: "50%", animation: "tp-fade-in 0.6s ease infinite", margin: "0 auto 8px" }} />
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Loading map...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid hsl(var(--border))", height }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}

// ─── Shot Map ───────────────────────────────────────────────
interface ShotMapProps extends ChartProps {
  xKey: string
  yKey: string
  valueKey: string
  xLabel?: string
  yLabel?: string
}

export function ChartShotMap({ data, xKey, yKey, valueKey, height = 350, className }: ShotMapProps) {
  useChartCSS()
  const id = useMemo(uid, [])

  const chartData = data.slice(0, 50).map((d) => ({
    ...d,
    _label: `${d[xKey]}`,
  }))

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReBarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 20 }}>
        <defs>
          <linearGradient id={`sm-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid style={gridStyle} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="_label" tick={axisStyle} axisLine={false} tickLine={false} dy={8} angle={-20} textAnchor="end" height={30} interval={Math.max(1, Math.floor(chartData.length / 8))} />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }} />
        <Bar
          dataKey={valueKey}
          fill={`url(#sm-${id})`}
          radius={[4, 4, 0, 0]}
          barSize={Math.max(6, Math.min(24, 160 / chartData.length))}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </ReBarChart>
    </ResponsiveContainer>
  )
}

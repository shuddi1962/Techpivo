"use client"

// Shared design kit for every TechPivo Market admin section — one visual
// language (page bar, cards, KPI tiles, toolbars, tables, badges, empty and
// loading states, modals) so no section looks scattered next to the others.
//
// The system follows the same four page shapes every premium ecommerce
// admin uses (Polaris / Medusa style):
//   1. index   → page bar + toolbar + table/cards
//   2. detail  → page bar + drawer/modal
//   3. settings→ page bar + grouped cards
//   4. report  → page bar + KPI grid + charts
// Design it once and every section inherits it.

import type { ReactNode } from "react"
import { Loader2, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export const marketCardCls =
  "bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]"

export const marketInputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"

export const marketIconInputWrapCls = "relative"
export const marketIconInputCls =
  "w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"

export const marketBtnPrimaryCls =
  "inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] rounded-xl px-3.5 py-2 transition-all active:scale-[0.98] disabled:opacity-60"

export const marketBtnDarkCls =
  "inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white rounded-xl px-3.5 py-2 transition-all active:scale-[0.98] disabled:opacity-50"

export const marketBtnGhostCls =
  "inline-flex items-center justify-center gap-1.5 text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl px-3.5 py-2 transition-all active:scale-[0.98] disabled:opacity-50"

export const marketIconBtnCls =
  "p-2 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"

export const marketIconBtnDangerCls =
  "p-2 rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"

export const marketThCls = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"

/* ------------------------------------------------------------------ *
 * Status vocabulary — one badge component for every state in the store
 * ------------------------------------------------------------------ */
export type MarketTone =
  | "neutral"
  | "amber"
  | "emerald"
  | "red"
  | "blue"
  | "violet"
  | "sky"
  | "rose"

const TONE_CLS: Record<MarketTone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-600 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
}

const DOT_CLS: Record<MarketTone, string> = {
  neutral: "bg-slate-400",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
}

export function MarketBadge({
  tone = "neutral",
  children,
  dot = false,
  pulse = false,
  className,
}: {
  tone?: MarketTone
  children: ReactNode
  dot?: boolean
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-inset",
        TONE_CLS[tone],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", DOT_CLS[tone])} />
          )}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", DOT_CLS[tone])} />
        </span>
      )}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Page bar — the one header every section owns (title + primary action)
 * ------------------------------------------------------------------ */
export function MarketPageBar({
  icon: Icon,
  title,
  desc,
  actions,
  badge,
  className,
}: {
  icon: LucideIcon
  title: string
  desc?: string
  actions?: ReactNode
  badge?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-3 mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white/85 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:-mx-6 sm:px-6",
        className
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
          {badge}
        </div>
        {desc && <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-[13px]">{desc}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * KPI tile — clickable metric card (Shopify metrics-card pattern)
 * ------------------------------------------------------------------ */
export function MarketKpi({
  label,
  value,
  sub,
  icon: Icon,
  tone = "amber",
  href,
  delta,
}: {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  tone?: MarketTone
  href?: string
  delta?: ReactNode
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1.5 text-[26px] font-extrabold leading-none tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              TONE_CLS[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
        {delta}
      </div>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          marketCardCls,
          "group block p-4 transition-all hover:-translate-y-px hover:border-amber-200 hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)]"
        )}
      >
        {body}
      </a>
    )
  }
  return <div className={cn(marketCardCls, "p-4 transition-all hover:shadow-md")}>{body}</div>
}

/* ------------------------------------------------------------------ *
 * Toolbar — search + filters row (always above a list)
 * ------------------------------------------------------------------ */
export function MarketToolbar({
  left,
  right,
  className,
}: {
  left?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        marketCardCls,
        "mb-3 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{left}</div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export function MarketSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn(marketIconInputWrapCls, "min-w-0 flex-1 sm:max-w-xs", className)}>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.63 3.64a1 1 0 0 0 1.41-1.42l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
          clipRule="evenodd"
        />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={marketIconInputCls}
      />
    </div>
  )
}

/* Filter pills (status vocabulary in the toolbar) */
export function MarketSegmented({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: string; label: string; count?: number }>
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex max-w-full gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.97]",
              active
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */
export function MarketCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return <div className={cn(marketCardCls, padded && "p-4 sm:p-5", className)}>{children}</div>
}

export function MarketCardHead({
  title,
  desc,
  actions,
  icon: Icon,
  className,
}: {
  title: string
  desc?: string
  actions?: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          {title}
        </p>
        {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Form field + modal
 * ------------------------------------------------------------------ */
export function MarketField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{hint}</p>}
    </div>
  )
}

export function MarketModal({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  width = "sm:max-w-lg",
}: {
  open: boolean
  onClose: () => void
  title: string
  desc?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl",
          width
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
            {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */
export function MarketTableShell({
  children,
  maxHeight,
  className,
}: {
  children: ReactNode
  maxHeight?: string
  className?: string
}) {
  return (
    <div className={cn(marketCardCls, "overflow-hidden", className)}>
      <div className="overflow-x-auto" style={maxHeight ? { maxHeight } : undefined}>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Empty / loading / notice
 * ------------------------------------------------------------------ */
export function MarketEmpty({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: LucideIcon
  title: string
  desc: string
  action?: ReactNode
}) {
  return (
    <div className={cn(marketCardCls, "p-10 text-center")}>
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </span>
      <p className="font-extrabold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{desc}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function MarketNotice({
  tone = "success",
  children,
  className,
}: {
  tone?: "success" | "warn" | "info" | "error"
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-3 rounded-xl border px-3 py-2 text-sm",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "info" && "border-slate-200 bg-slate-50 text-slate-600",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        className
      )}
    >
      {children}
    </div>
  )
}

export function MarketLoading({ label }: { label: string }) {
  return (
    <div className={cn(marketCardCls, "flex items-center justify-center gap-2 p-12 text-sm text-slate-500")}>
      <Loader2 className="h-5 w-5 animate-spin text-amber-600" /> {label}
    </div>
  )
}

/* Skeleton rows — used while a live list resolves */
export function MarketSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className={cn(marketCardCls, "divide-y divide-slate-100")}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100/70" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

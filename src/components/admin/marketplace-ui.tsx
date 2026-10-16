"use client"

// Shared design kit for every TechPivo Market admin section — one visual
// language (cards, headers, stats, tables, empty states, buttons) so no
// section looks scattered or out of place next to the others.

import type { ReactNode } from "react"
import { Loader2, type LucideIcon } from "lucide-react"
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

export function MarketHeader({
  icon: Icon,
  title,
  desc,
  actions,
  tint = "bg-amber-50 text-amber-600",
}: {
  icon: LucideIcon
  title: string
  desc: string
  actions?: ReactNode
  tint?: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tint)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="truncate text-xs text-slate-500">{desc}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function MarketStat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xl font-extrabold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-bold text-slate-600">{label}</p>
      {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

export function MarketStatStrip({ children }: { children: ReactNode }) {
  return (
    <div className={cn(marketCardCls, "mb-3 flex flex-wrap items-center gap-x-6 gap-y-3 p-4")}>
      {children}
    </div>
  )
}

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

export function MarketNotice({ tone = "success", children }: { tone?: "success" | "warn" | "info"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mb-3 rounded-xl border px-3 py-2 text-sm",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "info" && "border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      {children}
    </div>
  )
}

export function MarketLoading({ label }: { label: string }) {
  return (
    <div className={cn(marketCardCls, "p-10 text-center text-sm text-slate-500")}>
      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-amber-600" /> {label}
    </div>
  )
}

export function MarketTableShell({ children }: { children: ReactNode }) {
  return (
    <div className={cn(marketCardCls, "overflow-hidden")}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export const marketThCls = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"

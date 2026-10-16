"use client"

import { useEffect, useState } from "react"
import { ChevronDown, LayoutGrid } from "lucide-react"
import { MARKET_DEPARTMENTS, MARKET_LEAF_COUNT, MARKET_SUB_COUNT } from "@/lib/marketplace-categories"
import {
  marketCardCls,
  MarketEmpty,
  MarketHeader,
  MarketLoading,
  MarketStat,
  MarketStatStrip,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

export function MarketplaceCategoriesTab() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "consumer-electronics": true })
  const [dbCount, setDbCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/marketplace/api?section=categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.categories)) setDbCount(d.categories.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <MarketLoading label="Loading departments..." />

  return (
    <div>
      <MarketHeader
        icon={LayoutGrid}
        title="Categories"
        desc="Departments, subcategories & leaves — drives the storefront menu and CJ mapping"
      />
      <MarketStatStrip>
        <MarketStat label="Departments" value={String(MARKET_DEPARTMENTS.length)} />
        <MarketStat label="Subcategories" value={String(MARKET_SUB_COUNT)} />
        <MarketStat label="Leaves" value={String(MARKET_LEAF_COUNT)} />
        {dbCount !== null && (
          <MarketStat
            label="DB rows"
            value={String(dbCount)}
            sub={dbCount === 0 ? "run migration 091 to seed" : "synced with code tree"}
          />
        )}
      </MarketStatStrip>

      {MARKET_DEPARTMENTS.length === 0 ? (
        <MarketEmpty
          icon={LayoutGrid}
          title="No departments"
          desc="The category tree is empty — check src/lib/marketplace-categories.ts."
        />
      ) : (
        <div className="grid gap-2.5">
          {MARKET_DEPARTMENTS.map((d) => {
            const isOpen = !!open[d.slug]
            return (
              <div key={d.slug} className={cn(marketCardCls, "overflow-hidden")}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [d.slug]: !o[d.slug] }))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <LayoutGrid className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-900">{d.name}</span>
                    <span className="block text-[11px] text-slate-400">
                      {d.subs.length} subcategories · {d.subs.reduce((s, x) => s + x.items.length, 0)} leaves
                    </span>
                  </span>
                  <code className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-400 sm:block">
                    {d.slug}
                  </code>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", !isOpen && "-rotate-90")}
                  />
                </button>
                {isOpen && (
                  <div className="grid gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
                    {d.subs.map((s) => (
                      <div key={s.slug} className="rounded-xl border border-slate-200/80 bg-white p-3">
                        <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                        <p className="mb-2 truncate text-[11px] text-slate-400">{s.slug}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.items.map((item) => (
                            <span
                              key={item.slug}
                              title={item.slug}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
                            >
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-500">
        These slugs drive the storefront “All Departments” menu and the CJ import mapping. To rename or hide a
        branch, update <code className="rounded bg-slate-100 px-1">src/lib/marketplace-categories.ts</code> and
        re-run migration 091.
      </p>
    </div>
  )
}

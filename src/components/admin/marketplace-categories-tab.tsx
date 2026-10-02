"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react"
import { MARKET_DEPARTMENTS, MARKET_LEAF_COUNT, MARKET_SUB_COUNT } from "@/lib/marketplace-categories"

export function MarketplaceCategoriesTab() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "consumer-electronics": true })
  const [dbCount, setDbCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/admin/marketplace/api?section=categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.categories)) setDbCount(d.categories.length)
      })
      .catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1.5 font-semibold">
          <LayoutGrid className="h-3.5 w-3.5" />
          {MARKET_DEPARTMENTS.length} departments · {MARKET_SUB_COUNT} subcategories · {MARKET_LEAF_COUNT} leaves
        </span>
        {dbCount !== null && (
          <span className="text-slate-500">{dbCount} rows in marketplace_categories {dbCount === 0 && "(run migration 091 to seed)"}</span>
        )}
      </div>
      <div className="grid gap-3">
        {MARKET_DEPARTMENTS.map((d) => {
          const isOpen = !!open[d.slug]
          return (
            <div key={d.slug} className="bg-white border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen((o) => ({ ...o, [d.slug]: !o[d.slug] }))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <span className="font-bold text-slate-900">{d.name}</span>
                <span className="text-xs text-slate-500">{d.subs.length} subcategories</span>
                <code className="ml-auto text-[11px] text-slate-400 hidden sm:block">{d.slug}</code>
              </button>
              {isOpen && (
                <div className="border-t px-4 py-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {d.subs.map((s) => (
                    <div key={s.slug} className="bg-slate-50 border rounded-lg p-3">
                      <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="text-[11px] text-slate-400 mb-2">{s.slug}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.items.map((item) => (
                          <span key={item.slug} className="text-[11px] bg-white border rounded-full px-2 py-1 text-slate-600">
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
      <p className="text-xs text-slate-500 mt-3">
        These slugs drive the storefront “All Departments” menu and the CJ import mapping. To rename or hide a
        branch, update <code>src/lib/marketplace-categories.ts</code> and re-run migration 091.
      </p>
    </div>
  )
}

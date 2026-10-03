"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import {
  ArrowLeftRight, Check, ChevronDown, ChevronUp, Heart, ShoppingCart, Star,
} from "lucide-react"
import type { DemoProduct } from "@/lib/marketplace"
import { marketImage } from "@/lib/marketplace-images"
import { readCompare, toggleCompareStored } from "@/lib/marketplace-compare"

export function PanelStars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.round(value) ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`}
        />
      ))}
    </span>
  )
}

export function discountPct(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round((1 - price / oldPrice) * 100)
}

interface PanelActions {
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}

function FeaturePanel({ title, items, onAdd, added, wished, onWish }: { title: string; items: DemoProduct[] } & PanelActions) {
  const [index, setIndex] = useState(0)
  const [compared, setCompared] = useState<Record<string, boolean>>(() => readCompare())
  const thumbsRef = useRef<HTMLDivElement>(null)

  if (items.length === 0) return null
  const safe = Math.min(index, items.length - 1)
  const current = items[safe]
  const pct = discountPct(current.price, current.oldPrice)
  const href = /^[0-9a-f-]{36}$/i.test(current.id) ? `/marketplace/product/${current.id}` : undefined

  const select = (i: number) => {
    const n = (i + items.length) % items.length
    setIndex(n)
    thumbsRef.current?.children[n]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  const flipCompare = (id: string) =>
    setCompared((m) => ({ ...m, [id]: toggleCompareStored(id) }))

  return (
    <article className="flex w-[86%] shrink-0 snap-start flex-col bg-white rounded-2xl border border-[#E5E7EB] p-5 md:w-auto">
      {/* header: yellow pill flush-left + circular up button */}
      <div className="mb-4 flex items-center justify-between">
        <span className="-ml-5 rounded-r-full bg-[#F59E0B] py-2 pl-5 pr-6 text-sm font-extrabold uppercase tracking-wide text-[#0F172A]">
          {title}
        </span>
        <button
          type="button"
          onClick={() => select(safe - 1)}
          aria-label={`Previous product in ${title}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] transition-colors hover:border-[#F59E0B] hover:text-[#B45309]"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-3">
        {/* main product */}
        <div className="relative min-w-0 flex-1">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#F1F5F9] bg-white">
            {href ? (
              <Link href={href} aria-label={current.name} className="block h-full w-full p-5">
                {current.image ? (
                  <img src={marketImage(current.image)} alt={current.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                ) : null}
              </Link>
            ) : (
              <div className="h-full w-full p-5">
                {current.image ? (
                  <img src={marketImage(current.image)} alt={current.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                ) : null}
              </div>
            )}
            {pct > 0 && (
              <span className="absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#F59E0B] text-xs font-extrabold text-[#0F172A] shadow-sm">
                -{pct}%
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1.5">
            {href ? (
              <Link href={href} title={current.name} className="block truncate text-sm font-semibold text-[#0F172A] hover:text-[#B45309]">
                {current.name}
              </Link>
            ) : (
              <p title={current.name} className="truncate text-sm font-semibold text-[#0F172A]">{current.name}</p>
            )}
            <PanelStars value={current.rating} />
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold tabular-nums text-[#0F172A]">${current.price.toFixed(2)}</span>
              {current.oldPrice && current.oldPrice > current.price && (
                <span className="text-sm tabular-nums text-slate-400 line-through">${current.oldPrice.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>

        {/* vertical thumbnails + down button */}
        <div className="flex w-[76px] shrink-0 flex-col gap-2">
          <div ref={thumbsRef} className="grid max-h-[324px] gap-2 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
            {items.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => select(i)}
                aria-label={`View ${t.name}`}
                aria-pressed={i === safe}
                className={`flex h-[76px] w-full items-center justify-center overflow-hidden rounded-lg border bg-white p-1.5 transition-colors ${i === safe ? "border-[#F59E0B] border-2" : "border-[#E5E7EB] hover:border-slate-300"}`}
              >
                {t.image ? (
                  <img src={marketImage(t.image)} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (thumbsRef.current) {
                const el = thumbsRef.current
                const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
                if (nearBottom) {
                  el.scrollTo({ top: 0, behavior: "smooth" })
                  select(0)
                } else {
                  el.scrollBy({ top: 84, behavior: "smooth" })
                  select(safe + 1)
                }
              } else {
                select(safe + 1)
              }
            }}
            aria-label={`Next product in ${title}`}
            className="flex h-9 w-9 items-center justify-center self-center rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] transition-colors hover:border-[#F59E0B] hover:text-[#B45309]"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* actions: add to cart + wishlist + compare */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAdd(current)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-colors ${added[current.id] ? "bg-[#10B981] text-white" : "bg-slate-100 text-[#0F172A] hover:bg-[#F59E0B]"}`}
        >
          {added[current.id] ? (
            <><Check className="h-4 w-4" /> Added</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> Add to cart</>
          )}
        </button>
        <button
          type="button"
          onClick={() => onWish(current.id)}
          aria-label={wished[current.id] ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={!!wished[current.id]}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${wished[current.id] ? "border-[#EF4444] bg-[#EF4444] text-white" : "border-[#E5E7EB] text-slate-500 hover:text-[#EF4444]"}`}
        >
          <Heart className={`h-4 w-4 ${wished[current.id] ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => flipCompare(current.id)}
          aria-label={compared[current.id] ? "Remove from compare" : "Add to compare"}
          aria-pressed={!!compared[current.id]}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${compared[current.id] ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-[#E5E7EB] text-slate-500 hover:text-[#0F172A]"}`}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}

export function FeaturePanels({
  groups,
  onAdd,
  added,
  wished,
  onWish,
}: {
  groups: Array<{ title: string; items: DemoProduct[] }>
  onAdd: (p: DemoProduct) => void
  added: Record<string, boolean>
  wished: Record<string, boolean>
  onWish: (id: string) => void
}) {
  const live = groups.filter((g) => g.items.length > 0)
  if (live.length === 0) return null
  return (
    <section aria-label="Featured product panels" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
      <div className="flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
        {live.map((g) => (
          <FeaturePanel key={g.title} title={g.title} items={g.items} onAdd={onAdd} added={added} wished={wished} onWish={onWish} />
        ))}
      </div>
    </section>
  )
}

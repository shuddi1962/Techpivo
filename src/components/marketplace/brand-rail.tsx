import Link from "next/link"
import {
  CURATED_BRAND_NAMES,
  brandDefByName,
  brandsInCatalog,
  type BrandDef,
} from "@/lib/marketplace-brands"

function BrandTile({ b, live }: { b: BrandDef; live: boolean }) {
  return (
    <Link
      href={`/marketplace?q=${encodeURIComponent(b.name)}`}
      title={live ? `Shop ${b.name} — in stock now` : `Shop ${b.name} — restocking soon`}
      aria-label={`Shop ${b.name} products${live ? "" : " (restocking soon)"}`}
      className="group relative mr-3 flex w-36 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className={`absolute right-2.5 top-2.5 h-2 w-2 rounded-full ${live ? "bg-[#10B981]" : "bg-slate-300"}`}
        title={live ? "In stock now" : "Restocking soon"}
      />
      <span className="flex h-9 items-center justify-center" aria-hidden>
        {b.path ? (
          <svg viewBox="0 0 24 24" className="h-8 w-auto transition-transform duration-300 group-hover:scale-110" role="img">
            <path d={b.path} fill={b.color} />
          </svg>
        ) : (
          <span
            className="text-xl font-extrabold tracking-tight transition-transform duration-300 group-hover:scale-110"
            style={{ color: b.color, textTransform: b.lowercase ? "lowercase" : "uppercase" }}
          >
            {b.name}
          </span>
        )}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-[#B45309]">
        {b.name}
      </span>
    </Link>
  )
}

// "Top Brands" — the house brands are always pinned; any brand detected in
// the LIVE catalog that isn't pinned yet is appended automatically (a new
// import joins the rail on its own via realtime + 30s poll upstream).
// Tapping a tile searches the store for that brand. The dot tells the
// truth: green = in stock now, grey = restocking soon.
export function BrandRail({
  products,
}: {
  products: Array<{ product_name: string; product_description?: string | null }>
}) {
  const found = brandsInCatalog(products)
  const liveSet = new Set(found.map((s) => s.def.name))
  const pinned = CURATED_BRAND_NAMES.map((n) => brandDefByName(n)).filter((d): d is BrandDef => !!d)
  const extras = found.map((s) => s.def).filter((d) => !CURATED_BRAND_NAMES.includes(d.name))
  const tiles = [...pinned, ...extras]
  if (tiles.length === 0) return null
  // Repeat the set so the strip always looks full and the -50% loop
  // stays seamless (even reps only).
  const reps = tiles.length <= 2 ? 6 : tiles.length <= 4 ? 4 : 2
  const loop = Array.from({ length: reps }).flatMap(() => tiles)
  return (
    <section aria-label="Top brands" className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">Genuine products</span>
          <h2 className="text-lg font-bold text-[#0F172A]">Top Brands</h2>
        </div>
        <span className="hidden text-[11px] font-bold uppercase text-slate-400 sm:block">Tap a brand to shop it</span>
      </div>
      <div className="brand-rail-mask overflow-hidden">
        <div className="brand-rail-track flex w-max">
          {loop.map((b, i) => (
            <BrandTile key={`${b.name}-${i}`} b={b} live={liveSet.has(b.name)} />
          ))}
        </div>
      </div>
    </section>
  )
}

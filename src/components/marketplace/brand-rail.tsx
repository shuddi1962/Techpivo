import Link from "next/link"
import { brandsInCatalog, type BrandDef } from "@/lib/marketplace-brands"

function BrandTile({ b }: { b: BrandDef }) {
  return (
    <Link
      href={`/marketplace?q=${encodeURIComponent(b.name)}`}
      title={`Shop ${b.name}`}
      aria-label={`Shop ${b.name} products`}
      className="group mr-3 flex w-36 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
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

// "Top Brands" — derived from the LIVE catalog, never hardcoded. A tile
// appears only while that brand is actually in stock; a newly imported
// brand joins the rail on its own (realtime + 30s poll upstream). Tapping
// a tile searches the store for that brand's products. Empty catalog
// match = the whole section stays hidden (no dead promises).
export function BrandRail({
  products,
}: {
  products: Array<{ product_name: string; product_description?: string | null }>
}) {
  const found = brandsInCatalog(products)
  if (found.length === 0) return null
  // Repeat the set so the strip always looks full and the -50% loop
  // stays seamless (even reps only): 1 brand → 6 tiles, 2 → 4, else ×2.
  const reps = found.length === 1 ? 6 : found.length === 2 ? 4 : 2
  const loop = Array.from({ length: reps }).flatMap(() => found)
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
          {loop.map((s, i) => (
            <BrandTile key={`${s.def.name}-${i}`} b={s.def} />
          ))}
        </div>
      </div>
    </section>
  )
}

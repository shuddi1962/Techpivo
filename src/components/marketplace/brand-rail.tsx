import Link from "next/link"
import { siIntel, siJbl, siSamsung, siSony, siXiaomi } from "simple-icons"

interface BrandDef {
  name: string
  q: string
  path?: string
  color: string
  wordmark?: boolean
  lowercase?: boolean
}

// Official vector marks (simple-icons) in official brand colors.
// Sony's registered brand color is white, so it renders in black on the
// light tile — the same monochrome wordmark Sony uses on light surfaces.
// Anker + Logitech have no simple-icons mark, so they render as styled
// wordmarks in their official brand colors.
const BRANDS: BrandDef[] = [
  { name: "Samsung", q: "samsung", path: siSamsung.path, color: `#${siSamsung.hex}` },
  { name: "Sony", q: "sony", path: siSony.path, color: "#111111" },
  { name: "Intel", q: "intel", path: siIntel.path, color: `#${siIntel.hex}` },
  { name: "JBL", q: "jbl", path: siJbl.path, color: `#${siJbl.hex}` },
  { name: "Anker", q: "anker", color: "#00A9CE", wordmark: true },
  { name: "Logitech", q: "logitech", color: "#2B2D42", wordmark: true, lowercase: true },
  { name: "Xiaomi", q: "xiaomi", path: siXiaomi.path, color: `#${siXiaomi.hex}` },
]

function BrandTile({ b }: { b: BrandDef }) {
  return (
    <Link
      href={`/marketplace?q=${encodeURIComponent(b.q)}`}
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

// "Top Brands" — infinite auto-slideshow. Duplicated list + CSS keyframes
// translate the track -50% for a seamless loop; pauses on hover/touch.
export function BrandRail() {
  const loop = [...BRANDS, ...BRANDS]
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
            <BrandTile key={`${b.q}-${i}`} b={b} />
          ))}
        </div>
      </div>
    </section>
  )
}

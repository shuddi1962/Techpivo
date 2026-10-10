import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { MarketplaceHeader, MarketplaceFooter } from "./marketplace-header"

// Shared traditional storefront shell: full-width header, centered content,
// breadcrumb trail, full-width footer with separation.
export function StorePageShell({
  trail,
  children,
}: {
  trail: Array<{ label: string; href?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
          <Link href="/marketplace" className="hover:text-[#0F172A]">Home</Link>
          {trail.map((t) => (
            <span key={t.label} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              {t.href ? (
                <Link href={t.href} className="hover:text-[#0F172A]">{t.label}</Link>
              ) : (
                <span className="font-medium text-[#0F172A]">{t.label}</span>
              )}
            </span>
          ))}
        </nav>
        {children}
      </main>
      <MarketplaceFooter />
    </div>
  )
}

export function CollectionHero({
  kicker,
  title,
  copy,
  theme = "dark",
  image = "",
  links = {},
}: {
  kicker: string
  title: string
  copy: string
  theme?: "dark" | "red" | "orange"
  image?: string
  links?: Record<string, string>
}) {
  const bg =
    theme === "red"
      ? "linear-gradient(120deg, #DC2626 0%, #7F1D1D 100%)"
      : theme === "orange"
        ? "linear-gradient(120deg, #F59E0B 0%, #EA580C 60%, #DC2626 100%)"
        : "linear-gradient(120deg, #23272E 0%, #14171C 100%)"
  // Uploaded banner: shown in FULL like the homepage hero (h-auto w-full,
  // never cropped) with the title band beneath — any ratio fits.
  if (image.trim()) {
    const dest = links[image.trim()] || ""
    const heroImg = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.trim()} alt={title} loading="eager" decoding="async" className="block h-auto w-full" />
    )
    return (
      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        {dest ? (
          <Link href={dest} aria-label={title} className="block">{heroImg}</Link>
        ) : heroImg}
        <div className="p-6 sm:p-8 text-white" style={{ background: bg }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">{kicker}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">{copy}</p>
        </div>
      </section>
    )
  }
  return (
    <section className="overflow-hidden rounded-2xl p-6 sm:p-8 text-white" style={{ background: bg }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">{kicker}</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/80">{copy}</p>
    </section>
  )
}

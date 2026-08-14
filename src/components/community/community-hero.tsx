import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface CommunityHeroProps {
  badge: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
  imageUrl?: string | null;
  children?: ReactNode;
}

/**
 * Shared community hero — one consistent brand design across every
 * community page (forum, quiz, polls, events, leaderboard, topics...).
 * Navy brand gradient + amber badge + Syne display title; optionally
 * shows a banner image with dark overlay.
 */
export function CommunityHero({
  badge,
  title,
  subtitle,
  icon,
  backHref,
  backLabel,
  imageUrl,
  children,
}: CommunityHeroProps) {
  return (
    <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b]">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/85" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.18),transparent_55%)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
        {backHref && (
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel || "Back"}
          </Link>
        )}
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
            {icon}
            {badge}
          </div>
          <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/75">{subtitle}</p>
          )}
        </div>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { ShieldCheck, Medal, BadgeCheck } from 'lucide-react';

export type ExpertTier = 'none' | 'contributor' | 'specialist';

interface Props {
  /** contribution-derived tier — never fabricated credentials */
  tier: ExpertTier;
  acceptedCount?: number;
  className?: string;
}

/**
 * Data-derived contribution indicators only. Tiers are computed from real
 * contribution metrics (accepted answers, answer quality) — never claimed.
 */
export function ExpertBadge({ tier, acceptedCount = 0, className }: Props) {
  if (tier === 'none') return null;
  const base = cn('inline-flex items-center gap-1 text-[11px] font-medium', className);
  if (tier === 'specialist') {
    return (
      <span className={cn(base, 'text-verified')} title={`Verified contributor · ${acceptedCount} accepted answers`}>
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Verified Contributor
      </span>
    );
  }
  return (
    <span className={cn(base, 'text-info')} title={`Top contributor · ${acceptedCount} accepted answers`}>
      <Medal className="h-3.5 w-3.5" aria-hidden />
      Top Contributor
    </span>
  );
}

export function ModeratorBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium text-verified', className)} title="Site moderator">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      Moderator
    </span>
  );
}
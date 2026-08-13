import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon, SearchX } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({ icon: Icon = SearchX, title, description, actionLabel, actionHref, className }: EmptyStateProps) {
  return (
    <div className={cn('border border-dashed border-borderSoft rounded-xl bg-surface px-6 py-12 text-center', className)}>
      <Icon className="h-10 w-10 mx-auto mb-4 text-textSecondary/50" aria-hidden />
      <h3 className="text-base font-semibold text-textPrimary mb-1.5">{title}</h3>
      {description && <p className="text-sm text-textSecondary max-w-md mx-auto mb-5">{description}</p>}
      {actionLabel && actionHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "Couldn't load content", message = 'Something went wrong while fetching this content.', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('border border-danger/30 bg-danger/5 rounded-xl px-6 py-10 text-center', className)} role="alert">
      <h3 className="text-base font-semibold text-textPrimary mb-1.5">{title}</h3>
      <p className="text-sm text-textSecondary max-w-md mx-auto mb-5">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
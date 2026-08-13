import { Skeleton } from '@/components/ui/skeleton';

export function QuestionSkeleton() {
  return (
    <div className="border border-borderSoft rounded-xl bg-surface p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading community feed">
      {Array.from({ length: count }).map((_, i) => (
        <QuestionSkeleton key={i} />
      ))}
    </div>
  );
}

export function AnswerSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading answers">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 border border-borderSoft rounded-xl bg-surface p-5">
          <div className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-8 w-9 rounded-md" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-8 w-9 rounded-md" />
          </div>
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PollSkeleton() {
  return (
    <div className="border border-borderSoft rounded-xl bg-surface p-5 space-y-3" aria-busy="true">
      <Skeleton className="h-5 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-3/4 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function QuizSkeleton() {
  return (
    <div className="border border-borderSoft rounded-xl bg-surface p-5 space-y-3" aria-busy="true">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="border border-borderSoft rounded-xl bg-surface p-6 space-y-4" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}
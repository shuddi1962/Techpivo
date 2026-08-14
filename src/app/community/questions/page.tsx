'use client';

import { CommunityFeed } from '@/components/community/community-feed';

export default function QuestionsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-textPrimary font-[family-name:var(--font-syne)]">Questions</h1>
        <p className="text-sm text-textSecondary mt-1">
          Get help with real tech problems — or share what you know to build reputation.
        </p>
      </div>
      <CommunityFeed
        rails={['open', 'unanswered', 'solved']}
        initialRail="open"
        emptyTitle="No open questions"
        emptyDescription="Ask the first question and the community will help."
      />
    </div>
  );
}
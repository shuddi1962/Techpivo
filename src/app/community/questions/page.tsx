'use client';

import { Sparkles } from 'lucide-react';
import { CommunityFeed } from '@/components/community/community-feed';
import { CommunityHero } from '@/components/community/community-hero';

export default function QuestionsPage() {
  return (
    <div>
      <CommunityHero
        badge="Questions"
        title="Ask the Community"
        subtitle="Get help with real tech problems — or share what you know to build reputation."
        icon={<Sparkles className="h-3.5 w-3.5" />}
        backHref="/community"
        backLabel="Back to Community"
        imageUrl={null}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <CommunityFeed
          rails={['open', 'unanswered', 'solved']}
          initialRail="open"
          emptyTitle="No open questions"
          emptyDescription="Ask the first question and the community will help."
        />
      </div>
    </div>
  );
}
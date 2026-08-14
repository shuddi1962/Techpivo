import { Suspense } from 'react';
import { Metadata } from 'next';
import { CommunitySearch } from './community-search';

export const metadata: Metadata = {
  title: 'Search the Community',
  description: 'Search TechPivo community posts, topics, and members.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-textSecondary">Loading search…</div>}>
      <CommunitySearch />
    </Suspense>
  );
}
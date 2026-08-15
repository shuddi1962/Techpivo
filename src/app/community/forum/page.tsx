import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/constants';
import { CommunityHero } from '@/components/community/community-hero';
import { ForumListing } from '@/components/community/forum-listing';

export const metadata = {
  title: 'Forum — TechPivo Community',
  description: 'Join discussions about programming, cybersecurity, AI, and more.',
};

export default function ForumPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Community", url: `${SITE_URL}/community` },
        { name: "Forum" },
      ])} />
      <div className="min-h-screen bg-background">
      {/* Hero */}
      <CommunityHero
        badge="Community Forum"
        title="Discussions"
        subtitle="Ask questions, share knowledge, and help fellow tech enthusiasts."
        icon={<Sparkles className="h-3.5 w-3.5" />}
        backHref="/community"
        backLabel="Back to Community"
        imageUrl={null}
      >
        <Link
          href="/community/forum/new"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-all duration-200 hover:bg-white/90"
        >
          <Plus className="h-4 w-4" /> New Discussion
        </Link>
      </CommunityHero>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <ForumListing />
      </div>
    </div>
    </>
  );
}

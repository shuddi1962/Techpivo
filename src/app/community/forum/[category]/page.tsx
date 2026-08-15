import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next/types';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { CommunityHero } from '@/components/community/community-hero';
import { ForumListing } from '@/components/community/forum-listing';
import { getForumCategories } from '@/lib/community';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const name = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const description = `Browse ${name} discussions on the TechPivo forum. Join the conversation about technology topics.`
  return {
    title: `${name} — ${SITE_NAME} Forum`,
    description,
    alternates: { canonical: `${SITE_URL}/community/forum/${category}` },
    openGraph: {
      title: `${name} — ${SITE_NAME} Forum`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${name} — ${SITE_NAME} Forum`,
      description,
    },
  }
}

export default async function ForumCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categories = await getForumCategories();
  const currentCat = categories.find(c => c.slug === category);

  return (
    <div className="min-h-screen bg-background">
      <CommunityHero
        badge="Forum · Discussion"
        title={currentCat?.name || category}
        subtitle={currentCat?.description || `Browse ${currentCat?.name || category} discussions on the TechPivo forum.`}
        icon={currentCat?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentCat.image_url} alt="" aria-hidden className="h-5 w-5 rounded object-cover" />
        ) : undefined}
        backHref="/community/forum"
        backLabel="Back to Forum"
        imageUrl={currentCat?.image_url || null}
      >
        <Link
          href="/community/forum/new"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-all duration-200 hover:bg-white/90"
        >
          <Plus className="h-4 w-4" /> New Discussion
        </Link>
      </CommunityHero>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <ForumListing categorySlug={category} />
      </div>
    </div>
  );
}

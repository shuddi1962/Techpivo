import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTopicBySlug, getTopicPosts, getTopicFollowerCount, getTopicPostCount, getMyTopicFollow } from '@/lib/community-server';
import { type CommunityPost } from '@/lib/community-types';
import { TopicHub } from './topic-hub';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const topic = await getTopicBySlug(supabase, slug);
  if (!topic) return { title: 'Topic not found' };
  return {
    title: `${topic.name} topic — TechPivo Community`,
    description: topic.description || `Discussions tagged under ${topic.name} in the TechPivo community.`,
  };
}

export default async function TopicHubPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const topic = await getTopicBySlug(supabase, slug);
  if (!topic) notFound();

  const [{ posts, next_cursor, has_more }, followerCount, postCount] = await Promise.all([
    getTopicPosts<CommunityPost>(supabase, topic.id, { limit: 15 }),
    getTopicFollowerCount(topic.id),
    getTopicPostCount(supabase, topic.id),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const myFollow = user ? await getMyTopicFollow(supabase, topic.id, user.id) : false;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${topic.name} topic`,
    description: topic.description || undefined,
    url: `https://techpivo.com/community/topics/${topic.slug}`,
    isPartOf: { '@type': 'CollectionPage', name: 'TechPivo Community', url: 'https://techpivo.com/community' },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Community', item: 'https://techpivo.com/community' },
      { '@type': 'ListItem', position: 2, name: 'Topics', item: 'https://techpivo.com/community/topics' },
      { '@type': 'ListItem', position: 3, name: topic.name },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <TopicHub
        slug={slug}
        initialTopic={{
          id: topic.id,
          slug: topic.slug,
          name: topic.name,
          description: topic.description,
          icon: topic.icon,
          color: topic.color,
        }}
        initialPosts={posts}
        initialFollowerCount={followerCount}
        initialPostCount={postCount}
        initialHasMore={has_more}
        initialNextCursor={next_cursor}
        initialMyFollow={myFollow}
      />
    </>
  );
}
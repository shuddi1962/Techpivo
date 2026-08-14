import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { findPostBySlugOrId, type AuthorShape } from '@/lib/community-server';
import { qaPageSchema, discussionForumPostingSchema, breadcrumbSchema } from '@/lib/jsonld';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { JsonLd } from '@/components/ui/jsonld';
import AnswerPage from './answer-page';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const POST_SELECT = 'id, slug, title, content, content_type, created_at, updated_at, author_id, accepted_reply_id, reply_count';

interface AnswerPost {
  id: string;
  slug: string | null;
  title: string;
  content: string | null;
  content_type: string;
  created_at: string;
  updated_at: string | null;
  author_id: string | null;
  accepted_reply_id: string | null;
  reply_count: number | null;
}

const stripMd = (s: string | null) => (s || '').replace(/[#>*`\[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await findPostBySlugOrId<AnswerPost>(supabase, slug, POST_SELECT);
  if (!post) return { title: 'Not Found' };
  const canonical = `${SITE_URL}/answers/${post.slug ?? post.id}`;
  const description = stripMd(post.content).slice(0, 155) || post.title;
  return {
    title: `${post.title} — TechPivo Community`,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      type: post.content_type === 'question' ? 'article' : 'website',
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description,
    },
  };
}

export default async function AnswerPageWrapper({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await findPostBySlugOrId<AnswerPost>(supabase, slug, POST_SELECT);
  if (!post) notFound();

  const url = `${SITE_URL}/answers/${post.slug ?? post.id}`;
  let author: AuthorShape | null = null;
  if (post.author_id) {
    const { data: p } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', post.author_id)
      .maybeSingle();
    author = p as AuthorShape | null;
  }
  const authorName = author?.full_name || author?.username || null;

  let acceptedText: string | null = null;
  let acceptedAuthor: string | null = null;
  if (post.accepted_reply_id) {
    const { data: accepted } = await supabase
      .from('forum_replies')
      .select('content, author_id, created_at')
      .eq('id', post.accepted_reply_id)
      .maybeSingle();
    if (accepted) {
      acceptedText = stripMd(accepted.content).slice(0, 500) || null;
      if (accepted.author_id) {
        const { data: ap } = await supabase
          .from('user_profiles')
          .select('username, full_name')
          .eq('id', accepted.author_id)
          .maybeSingle();
        acceptedAuthor = (ap as { username?: string | null; full_name?: string | null } | null)?.full_name ?? null;
        if (!acceptedAuthor) acceptedAuthor = (ap as { username?: string | null } | null)?.username ?? null;
      }
    }
  }

  const schemas = [
    post.content_type === 'question'
      ? qaPageSchema({
          title: post.title,
          description: stripMd(post.content).slice(0, 300) || undefined,
          url,
          datePublished: post.created_at,
          dateModified: post.updated_at ?? undefined,
          authorName,
          answerCount: post.reply_count ?? 0,
          acceptedAnswer: acceptedText
            ? { text: acceptedText, authorName: acceptedAuthor, datePublished: undefined }
            : null,
        })
      : discussionForumPostingSchema({
          title: post.title,
          text: stripMd(post.content),
          url,
          datePublished: post.created_at,
          dateModified: post.updated_at ?? undefined,
          authorName,
        }),
    breadcrumbSchema([
      { name: 'Community', url: `${SITE_URL}/community` },
      { name: 'Answers', url: `${SITE_URL}/community/questions` },
      { name: post.title },
    ]),
  ];

  return (
    <>
      {schemas.map((s, i) => (
        <JsonLd key={i} data={s} />
      ))}
      <Suspense fallback={<div className="py-10 text-center text-sm text-textSecondary">Loading…</div>}>
        <AnswerPage />
      </Suspense>
    </>
  );
}
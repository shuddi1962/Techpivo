import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * forum_posts/forum_replies.author_id FK → auth.users, and user_profiles.id FK
 * → auth.users, so PostgREST CANNOT embed user_profiles via those FKs
 * (`user_profiles!forum_posts_author_id_fkey` fails with 400). Select plain
 * rows (author_id included), then batch-fetch profiles and attach `author`.
 */
export type AuthorShape = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level?: number;
  reputation?: number;
};

type RowWithAuthor = { author_id?: string | null };

export async function enrichAuthors<T extends RowWithAuthor>(
  items: T[],
  supabase: SupabaseClient
): Promise<Array<T & { author: AuthorShape | null }>> {
  if (!items.length) return items.map(i => ({ ...i, author: null }));
  const ids = [...new Set(items.map(i => i.author_id).filter((v): v is string => Boolean(v)))];
  const map = new Map<string, AuthorShape>();
  if (ids.length > 0) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url, level, reputation')
      .in('id', ids);
    for (const p of (data ?? []) as AuthorShape[]) map.set(p.id, p);
  }
  return items.map(i => ({ ...i, author: i.author_id ? map.get(i.author_id) ?? null : null }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Look up a forum post by slug (primary) or raw UUID id — NEVER use PostgREST
 * `.or(slug.eq.X,id.eq.X)` (it type-checks the whole OR and 400s on non-UUID). */
export async function findPostBySlugOrId<T>(
  supabase: SupabaseClient,
  value: string,
  select: string
): Promise<{ data: T | null }> {
  const bySlug = await supabase.from('forum_posts').select(select).eq('slug', value).maybeSingle();
  if (bySlug.data) return bySlug as { data: T | null };
  if (UUID_RE.test(value)) return (await supabase.from('forum_posts').select(select).eq('id', value).maybeSingle()) as { data: T | null };
  return bySlug as { data: T | null };
}

export type TopicShape = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at?: string;
};

export async function getTopicBySlug(supabase: SupabaseClient, slug: string): Promise<TopicShape | null> {
  const { data } = await supabase
    .from('topics')
    .select('id, slug, name, description, icon, color, created_at')
    .eq('slug', slug)
    .eq('is_approved', true)
    .maybeSingle();
  return (data as TopicShape | null) ?? null;
}

export async function getTopicPosts<T extends RowWithAuthor & { created_at?: string | null }>(
  supabase: SupabaseClient,
  topicId: string,
  opts: { cursor?: string | null; limit?: number } = {}
): Promise<{ posts: Array<T & { author: AuthorShape | null }>; next_cursor: string | null; has_more: boolean }> {
  const limit = Math.min(opts.limit ?? 20, 50);
  const { data: links } = await supabase.from('post_topics').select('post_id').eq('topic_id', topicId);
  const postIds = (links ?? []).map(l => l.post_id);
  if (postIds.length === 0) return { posts: [], next_cursor: null, has_more: false };
  let query = supabase
    .from('forum_posts')
    .select('*, category:forum_categories(name, slug, icon), topics:post_topics(topic:topics(id, slug, name))')
    .eq('is_locked', false)
    .in('id', postIds)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (opts.cursor) query = query.lt('created_at', opts.cursor);
  const { data } = await query;
  const rows = (data ?? []) as T[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const normalized = page.map(row => {
    // PostgREST returns post_topics[{topic:{id,slug,name}}] — flatten for PostCard/TopicChip.
    const nested = (row as unknown as Record<string, unknown>).topics;
    const flat = Array.isArray(nested)
      ? nested
          .map(x => (x && typeof x === 'object' ? (x as { topic?: unknown }).topic : null))
          .filter((t): t is { id: string; slug: string; name: string } => Boolean(t && typeof t === 'object' && (t as { id?: unknown }).id))
      : [];
    return { ...row, topics: flat };
  }) as T[];
  const enriched = await enrichAuthors(normalized, supabase);
  return {
    posts: enriched,
    next_cursor: hasMore ? String(rows[limit - 1].created_at) : null,
    has_more: hasMore,
  };
}

export async function getTopicFollowerCount(topicId: string): Promise<number> {
  // topic_follows RLS is owner-only (auth.uid() = user_id) — a session client
  // would return only the viewer's own follows. Counts are public aggregates,
  // so bypass RLS with the service client.
  const { createServiceClient } = await import('@/lib/admin-auth');
  const service = createServiceClient();
  const { count } = await service.from('topic_follows').select('*', { count: 'exact', head: true }).eq('topic_id', topicId);
  return count ?? 0;
}

export async function getTopicPostCount(supabase: SupabaseClient, topicId: string): Promise<number> {
  const { data } = await supabase.from('post_topics').select('post_id').eq('topic_id', topicId);
  return data?.length ?? 0;
}

export async function getMyTopicFollow(supabase: SupabaseClient, topicId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.from('topic_follows').select('topic_id').eq('user_id', userId).eq('topic_id', topicId).maybeSingle();
  return Boolean(data);
}
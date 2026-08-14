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

type RowWithAuthor = { author_id?: string | null } & Record<string, unknown>;

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
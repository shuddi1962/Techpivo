import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RAILS = new Set(['for_you', 'following', 'trending', 'latest', 'unanswered', 'experts', 'open', 'solved']);
const SELECT = '*, author:user_profiles!forum_posts_author_id_fkey(username, full_name, avatar_url, level), category:forum_categories(name, slug, icon)';
const LIMIT = 20;

type FeedItem = Record<string, unknown>;

async function baseQuery(supabase: Awaited<ReturnType<typeof createClient>>, rail: string, cursor: string | null) {
  const q = supabase
    .from('forum_posts')
    .select(SELECT)
    .eq('is_locked', false)
    .limit(LIMIT);

  switch (rail) {
    case 'latest':
      q.order('created_at', { ascending: false });
      break;
    case 'trending': {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      q.gte('created_at', since)
        .order('vote_count', { ascending: false })
        .order('reply_count', { ascending: false })
        .order('created_at', { ascending: false });
      break;
    }
    case 'unanswered':
      q.eq('content_type', 'question')
        .in('question_status', ['new', 'needs_context', 'unanswered'])
        .order('created_at', { ascending: false });
      break;
    case 'open':
      q.eq('content_type', 'question')
        .in('question_status', ['new', 'needs_context', 'unanswered', 'active', 'answered'])
        .order('created_at', { ascending: false });
      break;
    case 'solved':
      q.eq('content_type', 'question')
        .in('question_status', ['solved'])
        .order('created_at', { ascending: false });
      break;
    case 'experts': {
      const { data: experts } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('is_public', true)
        .order('reputation', { ascending: false })
        .limit(12);
      const ids = (experts ?? []).map(e => e.id);
      if (ids.length > 0) {
        q.in('author_id', ids).order('created_at', { ascending: false });
        return { q, ids };
      }
      q.order('created_at', { ascending: false });
      return { q, ids };
    }
    case 'following': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { q, following: null, ids: [] as string[] };
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(300);
      const ids = (follows ?? []).map(f => f.following_id);
      if (ids.length > 0) q.in('author_id', ids);
      q.order('created_at', { ascending: false });
      return { q, following: true, ids };
    }
    default:
      q.order('created_at', { ascending: false });
  }

  if (cursor) {
    q.lt('created_at', cursor);
  }
  return { q, ids: [] as string[] };
}

export async function GET(request: NextRequest) {
  const railParam = request.nextUrl.searchParams.get('rail') || 'for_you';
  const rail = RAILS.has(railParam) ? railParam : 'for_you';
  const cursor = request.nextUrl.searchParams.get('cursor');
  const limit = Math.min(40, Math.max(5, Number(request.nextUrl.searchParams.get('limit')) || LIMIT));

  const supabase = await createClient();
  const { q, following, ids } = await baseQuery(supabase, rail, cursor);

  const { data: raw } = await q.limit(limit);
  let items: FeedItem[] = (raw ?? []) as FeedItem[];

  // for_you = interleave trending + latest (no user model yet)
  if (rail === 'for_you') {
    const seen = new Set(items.map((i: FeedItem) => (i as { id: string }).id));
    const { data: extra } = await supabase
      .from('forum_posts')
      .select(SELECT)
      .eq('is_locked', false)
      .order('vote_count', { ascending: false })
      .order('reply_count', { ascending: false })
      .limit(10);
    const merged: FeedItem[] = [...items];
    let ti = 0;
    for (const e of (extra ?? []) as FeedItem[]) {
      const id = (e as { id: string }).id;
      if (seen.has(id)) continue;
      seen.add(id);
      merged.splice(Math.min(ti * 2 + 1, merged.length), 0, e);
      ti++;
    }
    items = merged.slice(0, limit);
  }

  if (rail === 'following' && following === null) {
    return NextResponse.json({ rail, items: [], next_cursor: null, has_more: false, requires_auth: true });
  }

  const last = items[items.length - 1] as { created_at?: string } | undefined;
  const has_more = items.length >= limit;

  return NextResponse.json({
    rail,
    items,
    next_cursor: last?.created_at ?? null,
    has_more,
    experts_fallback: rail === 'experts' && ids.length === 0,
  });
}
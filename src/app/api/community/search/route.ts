import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { enrichAuthors } from '@/lib/community-server';

export const dynamic = 'force-dynamic';

const POST_SELECT = '*, category:forum_categories(name, slug, icon), topics:post_topics(topic:topics(id, slug, name))';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 80) ?? '';
  const type = request.nextUrl.searchParams.get('type') ?? 'all';
  if (q.length < 2) {
    return NextResponse.json({ posts: [], topics: [], users: [], query: q });
  }

  const rl = checkRateLimit(`community-search:${clientIp(request)}`, RATE_LIMITS.search);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down and try again in a moment.' }, { status: 429 });
  }

  const supabase = await createClient();
  const term = `%${q}%`;
  const wantsPosts = type === 'all' || type === 'posts';
  const wantsTopics = type === 'all' || type === 'topics';
  const wantsUsers = type === 'all' || type === 'users';

  const [postRes, topicRes, userRes] = await Promise.all([
    wantsPosts
      ? supabase
          .from('forum_posts')
          .select(POST_SELECT)
          .eq('is_locked', false)
          .ilike('title', term)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as unknown[] }),
    wantsTopics
      ? supabase
          .from('topics')
          .select('id, slug, name, description, icon, color')
          .eq('is_approved', true)
          .ilike('name', term)
          .order('name', { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [] as unknown[] }),
    wantsUsers
      ? supabase
          .from('user_profiles')
          .select('id, username, full_name, avatar_url, level, reputation')
          .eq('is_public', true)
          .not('username', 'is', null)
          .or(`username.ilike.${term},full_name.ilike.${term}`)
          .order('reputation', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const flatPosts = (postRes.data ?? []).map(row => {
    // post_topics embed arrives as [{topic:{id,slug,name}}] — flatten for PostCard/TopicChip.
    const nested = (row as Record<string, unknown>).topics;
    const topics = Array.isArray(nested)
      ? nested
          .map(x => (x && typeof x === 'object' ? (x as { topic?: unknown }).topic : null))
          .filter((t): t is { id: string; slug: string; name: string } => Boolean(t && typeof t === 'object' && (t as { id?: unknown }).id))
      : [];
    return { ...row, topics };
  });
  const posts = await enrichAuthors(flatPosts, supabase);

  const postIds = posts.map(p => p.id).filter(Boolean) as string[];
  let my_votes: { target_id: string; vote: string }[] = [];
  if (postIds.length) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: votes } = await supabase
        .from('forum_votes')
        .select('post_id, reply_id, vote_type')
        .eq('user_id', user.id)
        .or(`post_id.in.(${postIds.join(',')})`);
      my_votes = (votes ?? []).map(v => ({ target_id: v.post_id ?? v.reply_id, vote: v.vote_type === 1 ? 'up' : 'down' }));
    }
  }

  return NextResponse.json({
    query: q,
    posts,
    topics: topicRes.data ?? [],
    users: userRes.data ?? [],
    my_votes,
  });
}
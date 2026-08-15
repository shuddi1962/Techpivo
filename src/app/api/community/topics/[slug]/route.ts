import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { enrichAuthors } from '@/lib/community-server';
import { isSameOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

async function countTopicFollowers(topicId: string): Promise<number> {
  // topic_follows RLS is owner-only — a session client would count only the
  // viewer's own follows. Counts are public aggregates → service client.
  const { createServiceClient } = await import('@/lib/admin-auth');
  const service = createServiceClient();
  const { count } = await service.from('topic_follows').select('*', { count: 'exact', head: true }).eq('topic_id', topicId);
  return count ?? 0;
}

const POST_SELECT = '*, category:forum_categories(name, slug, icon)';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from('topics')
    .select('id, slug, name, description, icon, color')
    .eq('slug', slug)
    .eq('is_approved', true)
    .single();
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

  const cursor = request.nextUrl.searchParams.get('cursor');
  const limit = Math.min(30, Math.max(5, Number(request.nextUrl.searchParams.get('limit')) || 15));

  let query = supabase
    .from('forum_posts')
    .select(POST_SELECT)
    .eq('is_locked', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  const [{ data: links }, followerCount] = await Promise.all([
    supabase.from('post_topics').select('post_id').eq('topic_id', topic.id),
    countTopicFollowers(topic.id),
  ]);
  const postIds = (links || []).map(l => l.post_id);
  if (postIds.length === 0) {
    return NextResponse.json({ topic, posts: [], next_cursor: null, has_more: false, follower_count: followerCount || 0, my_follow: false, post_count: 0, my_votes: [] });
  }
  query = query.in('id', postIds);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: raw } = await query.limit(limit + 1);
  const posts = await enrichAuthors((raw || []).slice(0, limit), supabase);

  const { data: { user } } = await supabase.auth.getUser();
  let my_follow = false;
  let my_votes: { target_id: string; vote: string }[] = [];
  if (user) {
    const [followRes, votesRes] = await Promise.all([
      supabase.from('topic_follows').select('id').eq('user_id', user.id).eq('topic_id', topic.id).maybeSingle(),
      supabase
        .from('forum_votes')
        .select('post_id, reply_id, vote_type')
        .eq('user_id', user.id)
        .or(`post_id.in.(${postIds.join(',')})`),
    ]);
    my_follow = Boolean(followRes.data);
    my_votes = (votesRes.data ?? []).map(v => ({ target_id: v.post_id ?? v.reply_id, vote: v.vote_type === 1 ? 'up' : 'down' }));
  }

  return NextResponse.json({
    topic,
    posts,
    next_cursor: (raw || []).length > limit ? posts[posts.length - 1]?.created_at ?? null : null,
    has_more: (raw || []).length > limit,
    follower_count: followerCount || 0,
    my_follow,
    my_votes,
    post_count: postIds.length,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`topic-follow:${clientIp(request)}`, RATE_LIMITS.follow);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  if (action !== 'follow' && action !== 'unfollow') {
    return NextResponse.json({ error: 'action must be follow or unfollow' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: topic } = await supabase
    .from('topics')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

  if (action === 'follow') {
    await supabase.from('topic_follows').upsert(
      { user_id: user.id, topic_id: topic.id },
      { onConflict: 'user_id,topic_id' }
    );
  } else {
    await supabase.from('topic_follows').delete().eq('user_id', user.id).eq('topic_id', topic.id);
  }

  const { createServiceClient } = await import('@/lib/admin-auth');
  const { count } = await createServiceClient()
    .from('topic_follows')
    .select('id', { count: 'exact', head: true })
    .eq('topic_id', topic.id);

  return NextResponse.json({ ok: true, follower_count: count || 0, my_follow: action === 'follow' });
}
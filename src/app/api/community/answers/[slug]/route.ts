import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

const POST_SELECT = `
  *,
  author:user_profiles!forum_posts_author_id_fkey(username, full_name, avatar_url, level, reputation),
  category:forum_categories(name, slug, icon),
  topics:post_topics(topic:topics(slug, name))
`;

const REPLY_SELECT = `
  *,
  author:user_profiles!forum_replies_author_id_fkey(username, full_name, avatar_url, level, reputation)
`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('forum_posts')
    .select(POST_SELECT)
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();

  if (!post) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  if (post.content_type !== 'question') {
    return NextResponse.json({ error: 'Not a question', redirect: `/community/forum/${post.category?.slug ?? 'general'}/${post.id}` }, { status: 301 });
  }

  await supabase.rpc('increment_views', { target_id: post.id, target_type: 'forum' });

  const sort = request.nextUrl.searchParams.get('sort') || 'best';
  let query = supabase
    .from('forum_replies')
    .select(REPLY_SELECT)
    .eq('post_id', post.id);

  if (sort === 'newest') query = query.order('created_at', { ascending: false });
  else if (sort === 'oldest') query = query.order('created_at', { ascending: true });
  else
    query = query
      .order('is_accepted', { ascending: false })
      .order('rank_score', { ascending: false })
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true });

  const { data: replies } = await query;

  const { data: related } = await supabase
    .from('forum_posts')
    .select('id, title, slug, reply_count, vote_count, question_status, created_at')
    .eq('content_type', 'question')
    .neq('id', post.id)
    .eq('category_id', post.category_id)
    .order('created_at', { ascending: false })
    .limit(4);

  const { data: { user } } = await supabase.auth.getUser();
  let my_votes: { target_id: string; vote: string }[] = [];
  if (user) {
    const { data: votes } = await supabase
      .from('forum_votes')
      .select('target_id, vote')
      .eq('user_id', user.id)
      .in('target_id', [post.id, ...(replies ?? []).map(r => r.id)]);
    my_votes = votes || [];
  }

  return NextResponse.json({
    post,
    replies: replies || [],
    related: related || [],
    my_votes,
    current_user: user ? { id: user.id } : null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rl = checkRateLimit(`answer:${clientIp(request)}`, RATE_LIMITS.replyCreate);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many replies. Try again later.' }, { status: 429 });

  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (content.length < 15 || content.length > 20000) {
    return NextResponse.json({ error: 'Answer must be between 15 and 20,000 characters.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: post } = await supabase
    .from('forum_posts')
    .select('id, title, author_id, question_status, slug')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();
  if (!post) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  if (post.question_status === 'archived' || post.question_status === 'solved') {
    return NextResponse.json({ error: 'This question is closed for new answers.' }, { status: 409 });
  }

  const { data: reply, error } = await supabase
    .from('forum_replies')
    .insert({ post_id: post.id, author_id: user.id, content, reply_type: 'answer' })
    .select(REPLY_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Counts + rank + status
  await supabase.rpc('increment_reply_count', { target_post_id: post.id });
  await supabase.rpc('refresh_reply_rank', { target_post_id: post.id });
  if (post.question_status === 'new' || post.question_status === 'needs_context' || post.question_status === 'unanswered') {
    await supabase.from('forum_posts').update({ question_status: 'active' }).eq('id', post.id);
  }

  // XP for answering (+25)
  await supabase.rpc('award_xp', {
    target_user_id: user.id,
    xp_amount: 25,
    action_name: 'forum_answer',
    desc_text: `Answered "${post.title.slice(0, 80)}"`,
    ref_id: reply.id,
    ref_type: 'forum_reply',
  });

  // Notify the question author (service-role — insert is not owner-scoped)
  if (post.author_id !== user.id) {
    const service = createServiceClient();
    await service.from('user_notifications').insert({
      user_id: post.author_id,
      type: 'answer',
      title: 'New answer to your question',
      message: `${user.user_metadata?.full_name || 'Someone'} answered "${post.title.slice(0, 80)}"`,
      link: `/answers/${post.slug ?? post.id}?focus=${reply.id}`,
    });
  }

  return NextResponse.json({ reply }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const replyId = typeof body.reply_id === 'string' ? body.reply_id : '';
  if (!replyId) return NextResponse.json({ error: 'reply_id is required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: post } = await supabase
    .from('forum_posts')
    .select('id, title, slug, author_id, bounty_points, accepted_reply_id')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();
  if (!post) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  if (post.author_id !== user.id) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!me || !['admin', 'editor'].includes(me.role)) {
      return NextResponse.json({ error: 'Only the question author can accept an answer.' }, { status: 403 });
    }
  }

  const { data: reply } = await supabase
    .from('forum_replies')
    .select('id, author_id')
    .eq('id', replyId)
    .eq('post_id', post.id)
    .single();
  if (!reply) return NextResponse.json({ error: 'Answer not found on this question.' }, { status: 404 });

  if (post.accepted_reply_id) {
    return NextResponse.json({ error: 'This question already has an accepted answer.' }, { status: 409 });
  }

  await supabase.from('forum_posts').update({
    accepted_reply_id: reply.id,
    question_status: 'solved',
    is_solved: true,
  }).eq('id', post.id);
  await supabase.from('forum_replies').update({
    is_accepted: true,
    accepted_by: user.id,
    accepted_at: new Date().toISOString(),
  }).eq('id', reply.id);
  await supabase.rpc('refresh_reply_rank', { target_post_id: post.id });

  const bounty = post.bounty_points && post.bounty_points > 0 ? post.bounty_points : 10;
  await supabase.rpc('award_reputation', {
    target_user_id: reply.author_id,
    points: bounty,
    signal: 'answer_accepted',
    src_type: 'forum_reply',
    src_id: reply.id,
  });
  await supabase.rpc('award_xp', {
    target_user_id: reply.author_id,
    xp_amount: 15,
    action_name: 'accepted_answer',
    desc_text: `Accepted answer on "${post.title.slice(0, 80)}"`,
    ref_id: reply.id,
    ref_type: 'forum_reply',
  });

  if (reply.author_id !== user.id) {
    const service = createServiceClient();
    await service.from('user_notifications').insert({
      user_id: reply.author_id,
      type: 'accepted_answer',
      title: 'Your answer was accepted',
      message: `Your answer earned ${bounty} reputation on "${post.title.slice(0, 80)}"`,
      link: `/answers/${post.slug ?? post.id}?focus=${reply.id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
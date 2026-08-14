import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`vote:${clientIp(request)}`, RATE_LIMITS.vote);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many votes. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { post_id, reply_id, vote_type } = body;

  if (vote_type !== 'up' && vote_type !== 'down') {
    return NextResponse.json({ error: 'vote_type must be up or down' }, { status: 400 });
  }
  if ((post_id && reply_id) || (!post_id && !reply_id)) {
    return NextResponse.json({ error: 'Exactly one of post_id or reply_id is required' }, { status: 400 });
  }

  // Validate target exists before voting
  const targetTable = post_id ? 'forum_posts' : 'forum_replies';
  const { data: target } = await supabase
    .from(targetTable)
    .select('id, author_id')
    .eq('id', post_id || reply_id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: 'Target not found' }, { status: 404 });
  }

  // Anti-sybil: no self-votes (voting on your own post/reply inflates counts)
  if (target.author_id && target.author_id === user.id) {
    return NextResponse.json({ error: 'You cannot vote on your own content.' }, { status: 400 });
  }

  // Check existing vote
  const query = supabase.from('forum_votes').select('id, vote_type').eq('user_id', user.id);
  if (post_id) query.eq('post_id', post_id);
  if (reply_id) query.eq('reply_id', reply_id);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    if (existing.vote_type === vote_type) {
      // Remove vote
      const { error } = await supabase.from('forum_votes').delete().eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      // Change vote
      const { error } = await supabase.from('forum_votes').update({ vote_type }).eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    // New vote
    const { error } = await supabase.from('forum_votes').insert({
      user_id: user.id,
      post_id: post_id || null,
      reply_id: reply_id || null,
      vote_type,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update counts via SECURITY DEFINER RPCs (RLS-safe: users vote on others' posts)
  if (post_id) {
    await supabase.rpc('update_post_vote_count', { target_post_id: post_id });
  }
  if (reply_id) {
    await supabase.rpc('update_reply_vote_count', { target_reply_id: reply_id });
  }

  return NextResponse.json({ success: true });
}

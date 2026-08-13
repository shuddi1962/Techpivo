import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(`vote:${clientIp(request)}`, RATE_LIMITS.vote);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many votes. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { post_id, reply_id, vote_type } = body;

  // Check existing vote
  const query = supabase.from('forum_votes').select('id, vote_type').eq('user_id', user.id);
  if (post_id) query.eq('post_id', post_id);
  if (reply_id) query.eq('reply_id', reply_id);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    if (existing.vote_type === vote_type) {
      // Remove vote
      await supabase.from('forum_votes').delete().eq('id', existing.id);
    } else {
      // Change vote
      await supabase.from('forum_votes').update({ vote_type }).eq('id', existing.id);
    }
  } else {
    // New vote
    await supabase.from('forum_votes').insert({
      user_id: user.id,
      post_id: post_id || null,
      reply_id: reply_id || null,
      vote_type,
    });
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

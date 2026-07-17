import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

  // Update counts
  if (post_id) {
    const { data: votes } = await supabase.from('forum_votes').select('vote_type').eq('post_id', post_id);
    const count = (votes || []).reduce((sum: number, v: any) => sum + v.vote_type, 0);
    await supabase.from('forum_posts').update({ vote_count: count }).eq('id', post_id);
  }
  if (reply_id) {
    const { data: votes } = await supabase.from('forum_votes').select('vote_type').eq('reply_id', reply_id);
    const count = (votes || []).reduce((sum: number, v: any) => sum + v.vote_type, 0);
    await supabase.from('forum_replies').update({ vote_count: count }).eq('id', reply_id);
  }

  return NextResponse.json({ success: true });
}

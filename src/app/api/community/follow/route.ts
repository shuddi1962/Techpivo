import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { target_user_id } = body;
  if (!target_user_id) return NextResponse.json({ error: 'Missing target user' }, { status: 400 });
  if (target_user_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  // Check if already following
  const { data: existing } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', target_user_id)
    .single();

  if (existing) {
    // Unfollow
    await supabase.from('user_follows').delete().eq('id', existing.id);
    return NextResponse.json({ following: false });
  } else {
    // Follow
    await supabase.from('user_follows').insert({
      follower_id: user.id,
      following_id: target_user_id,
    });
    return NextResponse.json({ following: true });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target_user_id = searchParams.get('user_id');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!target_user_id) return NextResponse.json({ following: false, follower_count: 0, following_count: 0 });

  const { count: followerCount } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', target_user_id);

  const { count: followingCount } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', target_user_id);

  let isFollowing = false;
  if (user) {
    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', target_user_id)
      .single();
    isFollowing = !!data;
  }

  return NextResponse.json({ following: isFollowing, follower_count: followerCount || 0, following_count: followingCount || 0 });
}

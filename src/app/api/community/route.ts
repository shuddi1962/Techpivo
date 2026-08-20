import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const section = searchParams.get('section') || 'all';
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  switch (section) {
    case 'leaderboard': {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, avatar_url, level, xp, reputation')
        .eq('is_public', true)
        .order('xp', { ascending: false })
        .limit(50);
      return NextResponse.json({ entries: data || [] });
    }

    case 'quizzes': {
      const { data } = await supabase
        .from('quizzes')
        .select('id, title, description, category, image_url, difficulty, time_limit, question_count, is_published, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      return NextResponse.json({ quizzes: data || [] });
    }

    case 'polls': {
      const { data } = await supabase
        .from('polls')
        .select('*, options:poll_options(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return NextResponse.json({ polls: data || [] });
    }

    case 'forum-categories': {
      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return NextResponse.json({ categories: data || [] });
    }

    case 'forum-posts': {
      const categoryId = searchParams.get('category_id');
      let query = supabase
        .from('forum_posts')
        .select('*, author:user_profiles(username, full_name, avatar_url, level), category:forum_categories(name, slug, icon)')
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(20);
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data } = await query;
      return NextResponse.json({ posts: data || [] });
    }

    case 'notifications': {
      if (!user) return NextResponse.json({ notifications: [] });
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return NextResponse.json({ notifications: data || [] });
    }

    case 'profile': {
      if (!user) return NextResponse.json({ profile: null });
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ profile: data });
    }

    default:
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`community-hub:${clientIp(request)}`, RATE_LIMITS.communityHub);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  switch (action) {
    case 'vote': {
      const { poll_id, option_id } = body;
      // Option must belong to the poll
      const { data: opt } = await supabase
        .from('poll_options')
        .select('id')
        .eq('id', option_id)
        .eq('poll_id', poll_id)
        .maybeSingle();
      if (!opt) {
        return NextResponse.json({ error: 'That option does not exist in this poll.' }, { status: 400 });
      }
      // Upsert is race-safe: poll_votes is UNIQUE (poll_id, user_id); an
      // existing vote returns no row -> 400 and counts can never double.
      const { data: inserted, error } = await supabase
        .from('poll_votes')
        .upsert({ poll_id, option_id, user_id: user.id }, { onConflict: 'poll_id,user_id', ignoreDuplicates: true })
        .select('id');
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      if (!inserted || inserted.length === 0) {
        return NextResponse.json({ error: 'You have already voted in this poll.' }, { status: 400 });
      }
      const { error: rpcError } = await supabase.rpc('increment_poll_votes', { poll_id, option_id });
      if (rpcError) {
        await supabase.from('poll_votes').delete().eq('poll_id', poll_id).eq('user_id', user.id).eq('option_id', option_id);
        return NextResponse.json({ error: rpcError.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    case 'bookmark': {
      const { item_type, item_id, folder } = body;
      const { error } = await supabase
        .from('user_bookmarks')
        .upsert({ user_id: user.id, item_type, item_id, folder: folder || 'default' });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    case 'follow': {
      const { following_id } = body;
      if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: user.id, following_id });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    case 'unfollow': {
      const { following_id } = body;
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', following_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    case 'comment': {
      const { post_id, content, parent_id } = body;
      const { data, error } = await supabase
        .from('article_discussions')
        .insert({ post_id, author_id: user.id, content, parent_id })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ discussion: data });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

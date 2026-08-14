import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ history: [] });
  const { data } = await supabase
    .from('user_reading_history')
    .select('id, post_id, progress, completed, updated_at, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);
  const rows = data || [];
  const postIds = rows.map(r => r.post_id).filter(Boolean);
  let posts: { id: string; title: string; slug: string }[] = [];
  if (postIds.length > 0) {
    const { data: postRows } = await supabase
      .from('posts')
      .select('id, title, slug')
      .in('id', postIds);
    posts = (postRows || []) as { id: string; title: string; slug: string }[];
  }
  const byId = new Map(posts.map(p => [p.id, p]));
  const history = rows.map(r => {
    const post = byId.get(r.post_id);
    return {
      id: r.id,
      post_id: r.post_id,
      title: post?.title ?? null,
      slug: post?.slug ?? null,
      progress: r.progress,
      completed: r.completed,
      last_read: r.updated_at,
      created_at: r.created_at,
    };
  });
  return NextResponse.json({ history });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`history:${clientIp(request)}`, RATE_LIMITS.history);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!body.post_id) {
    return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
  }

  const progress = typeof body.progress === 'number' ? Math.min(Math.max(body.progress, 0), 100) : 0;
  const { error } = await supabase.from('user_reading_history').upsert({
    user_id: user.id,
    post_id: body.post_id,
    progress,
    completed: !!body.completed,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,post_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
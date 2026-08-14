import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ history: [] });
  const { data } = await supabase
    .from('user_reading_history')
    .select('id, post_id, title, progress, completed, last_read, created_at')
    .eq('user_id', user.id)
    .order('last_read', { ascending: false })
    .limit(50);
  return NextResponse.json({ history: data || [] });
}

export async function POST(request: NextRequest) {
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
    title: typeof body.title === 'string' ? body.title.slice(0, 300) : null,
    progress,
    completed: !!body.completed,
    last_read: new Date().toISOString(),
  }, { onConflict: 'user_id,post_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
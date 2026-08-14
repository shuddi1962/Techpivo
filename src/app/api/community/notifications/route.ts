import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

const PREF_KEYS = [
  'email_notifications',
  'push_notifications',
  'forum_replies',
  'quiz_results',
  'new_followers',
  'article_comments',
  'badges_earned',
  'weekly_digest',
] as const;

const DEFAULT_PREFS = {
  email_notifications: true,
  push_notifications: true,
  forum_replies: true,
  quiz_results: true,
  new_followers: true,
  article_comments: true,
  badges_earned: true,
  weekly_digest: false,
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [], preferences: null, unread: 0 });

  const countOnly = request.nextUrl.searchParams.get('count') === 'true';
  const [notifRes, profileRes] = await Promise.all([
    supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('user_profiles').select('notification_preferences').eq('id', user.id).maybeSingle(),
  ]);

  if (countOnly) {
    const { count } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    return NextResponse.json({ unread: count || 0 });
  }

  const stored = (profileRes.data?.notification_preferences ?? {}) as Record<string, boolean>;
  return NextResponse.json({
    notifications: notifRes.data || [],
    preferences: { ...DEFAULT_PREFS, ...stored },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`notif-read:${clientIp(request)}`, RATE_LIMITS.notificationPrefs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action === 'read_all' ? 'read_all' : 'read';

  if (action === 'read_all') {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`notif-prefs:${clientIp(request)}`, RATE_LIMITS.notificationPrefs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prefs: Record<string, boolean> = {};
  for (const key of PREF_KEYS) {
    if (typeof body[key] === 'boolean') prefs[key] = body[key];
  }
  if (Object.keys(prefs).length === 0) {
    return NextResponse.json({ error: 'No valid preference keys provided' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .maybeSingle();

  const merged = { ...DEFAULT_PREFS, ...((profile?.notification_preferences ?? {}) as Record<string, boolean>), ...prefs };

  const { error } = await supabase
    .from('user_profiles')
    .update({ notification_preferences: merged, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ preferences: merged });
}
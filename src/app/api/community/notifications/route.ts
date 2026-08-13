import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [], preferences: null });

  const [notifRes, prefsRes] = await Promise.all([
    supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('user_notification_settings').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  return NextResponse.json({
    notifications: notifRes.data || [],
    preferences: prefsRes.data ? { ...DEFAULT_PREFS, ...prefsRes.data } : DEFAULT_PREFS,
  });
}

export async function PUT(request: NextRequest) {
  const rl = checkRateLimit(`notif-prefs:${clientIp(request)}`, { limit: 60, windowMs: 60 * 60 * 1000 });
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

  const { error } = await supabase
    .from('user_notification_settings')
    .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ preferences: { ...DEFAULT_PREFS, ...prefs } });
}
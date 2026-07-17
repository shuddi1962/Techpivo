import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [], preferences: null });

  const [notifRes, profileRes] = await Promise.all([
    supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('user_profiles').select('id').eq('id', user.id).single(),
  ]);

  return NextResponse.json({
    notifications: notifRes.data || [],
    preferences: profileRes.data ? {
      email_notifications: true,
      push_notifications: true,
      forum_replies: true,
      quiz_results: true,
      new_followers: true,
      article_comments: true,
      badges_earned: true,
      weekly_digest: false,
    } : null,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = ['email_notifications', 'push_notifications', 'forum_replies', 'quiz_results', 'new_followers', 'article_comments', 'badges_earned', 'weekly_digest'];
  const prefs: Record<string, boolean> = {};
  for (const key of allowed) {
    if (typeof body[key] === 'boolean') prefs[key] = body[key];
  }

  const { error } = await supabase.from('user_profiles').update({
    updated_at: new Date().toISOString(),
  }).eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ preferences: prefs });
}

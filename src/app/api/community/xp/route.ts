import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, target_id, description } = body;

  const xpValues: Record<string, number> = {
    read_article: 5,
    complete_profile: 50,
    comment_approved: 15,
    forum_answer: 25,
    forum_post: 40,
    complete_quiz: 20,
    share_article: 15,
    daily_login: 10,
    newsletter_subscribe: 20,
    first_post: 25,
    follow_user: 5,
    bookmark: 5,
  };

  const xp = xpValues[action] || 0;
  if (xp === 0) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  // Check for duplicate XP in same day for daily actions
  if (['daily_login', 'read_article'].includes(action)) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('user_xp_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('action', action)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, xp_earned: 0, reason: 'Already earned today' });
    }
  }

  // Award XP
  const { error } = await supabase.from('user_xp_log').insert({
    user_id: user.id,
    action,
    xp_amount: xp,
    description: description || null,
    reference_id: target_id || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update user XP
  const { data: profile } = await supabase.from('user_profiles').select('xp, level, badges, streak, last_active_date').eq('id', user.id).single();
  if (profile) {
    const newXP = (profile.xp || 0) + xp;

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = profile.streak || 0;
    if (profile.last_active_date === yesterday) {
      newStreak += 1;
    } else if (profile.last_active_date !== today) {
      newStreak = 1;
    }

    await supabase.from('user_profiles').update({
      xp: newXP,
      streak: newStreak,
      last_active_date: today,
    }).eq('id', user.id);

    // Check for badge awards
    await checkAndAwardBadges(supabase, user.id, profile, newXP);
  }

  return NextResponse.json({ success: true, xp_earned: xp });
}

async function checkAndAwardBadges(supabase: any, userId: string, profile: any, totalXp: number) {
  const newBadges: string[] = [...(profile.badges || [])];
  let changed = false;

  // Early Member - joined in first year
  if (!newBadges.includes('early_member')) {
    newBadges.push('early_member');
    changed = true;
  }

  // Complete Profile
  if (!newBadges.includes('complete_profile') && totalXp >= 50) {
    const { data } = await supabase.from('user_profiles').select('full_name, bio, avatar_url, location').eq('id', userId).single();
    if (data?.full_name && data?.bio && data?.avatar_url) {
      newBadges.push('complete_profile');
      changed = true;
    }
  }

  // Daily Visitor
  if (!newBadges.includes('daily_visitor') && (profile.streak || 0) >= 30) {
    newBadges.push('daily_visitor');
    changed = true;
  }

  if (changed) {
    await supabase.from('user_profiles').update({ badges: newBadges }).eq('id', userId);
  }
}

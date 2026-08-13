import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

const XP_VALUES: Record<string, number> = {
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

/** Actions a client may self-award. Server-awarded actions (forum_post,
 *  forum_answer, complete_quiz, comment_approved) are emitted by their own
 *  routes and MUST NOT be claimable here. */
const CLIENT_ACTIONS = new Set([
  'read_article',
  'share_article',
  'daily_login',
  'bookmark',
  'follow_user',
  'complete_profile',
  'newsletter_subscribe',
]);

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = checkRateLimit(`xp:${ip}`, RATE_LIMITS.xp);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, target_id } = body;

  const xp = XP_VALUES[action] || 0;
  if (xp === 0) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  if (!CLIENT_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Action is awarded by the server' }, { status: 403 });
  }

  // Dedupe: any client action can only be earned once per day (per target for
  // per-item actions). Prevents XP farming by re-posting the same action.
  const today = new Date().toISOString().split('T')[0];
  const query = supabase
    .from('user_xp_log')
    .select('id')
    .eq('user_id', user.id)
    .eq('reason', action)
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`);

  if (target_id) query.eq('reference_id', target_id);
  else query.is('reference_id', null);

  const { data: existing } = await query.limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, xp_earned: 0, reason: 'Already earned today' });
  }

  // Award XP
  const { error } = await supabase.from('user_xp_log').insert({
    user_id: user.id,
    amount: xp,
    reason: action,
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

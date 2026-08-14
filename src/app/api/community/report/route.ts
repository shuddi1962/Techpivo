import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

const TARGET_TYPES = new Set(['forum_post', 'forum_reply', 'comment', 'user']);
const REASONS = new Set([
  'spam', 'harassment', 'hate_speech', 'misinformation', 'plagiarism',
  'nsfw', 'doxxing', 'scam', 'other',
]);

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`report:${clientIp(request)}`, RATE_LIMITS.report);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many reports. Try again later.' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to report content.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const targetType = typeof body.target_type === 'string' ? body.target_type : '';
  const targetId = typeof body.target_id === 'string' ? body.target_id.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason : '';
  const details = typeof body.details === 'string' ? body.details.trim().slice(0, 1000) : '';

  if (!TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: 'Invalid target type.' }, { status: 400 });
  }
  if (!targetId || targetId.length > 100) {
    return NextResponse.json({ error: 'Invalid target.' }, { status: 400 });
  }
  if (!REASONS.has(reason)) {
    return NextResponse.json({ error: 'Invalid reason.' }, { status: 400 });
  }

  // Prevent duplicate open reports from the same reporter.
  const { data: existing } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .in('status', ['pending', 'under_review'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already reported this content.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('content_reports')
    .insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason, details, status: 'pending' })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
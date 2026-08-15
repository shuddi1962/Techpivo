import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';
import { isSameOrigin } from '@/lib/csrf';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('polls')
    .select('*, options:poll_options(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return NextResponse.json({ polls: data || [] });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const rl = checkRateLimit(`poll-vote:${clientIp(request)}`, RATE_LIMITS.pollVote);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many poll votes. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { poll_id, option_id } = body;
  if (!poll_id || !option_id) {
    return NextResponse.json({ error: 'poll_id and option_id are required' }, { status: 400 });
  }

  // Friendly duplicate check (unique constraint poll_votes_poll_id_user_id_key)
  const { data: existing } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', poll_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You have already voted in this poll.' }, { status: 400 });
  }

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

  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id, option_id, user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: rpcError } = await supabase.rpc('increment_poll_votes', { poll_id, option_id });
  if (rpcError) {
    // Roll back the vote so counts and rows stay consistent
    await supabase.from('poll_votes').delete().eq('poll_id', poll_id).eq('user_id', user.id).eq('option_id', option_id);
    return NextResponse.json({ error: rpcError.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

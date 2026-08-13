import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const supabase = await createClient();

  let query = supabase
    .from('community_events')
    .select('*')
    .eq('is_published', true)
    .order('start_date', { ascending: true });

  if (type && type !== 'all') {
    query = query.eq('event_type', type);
  }

  const { data } = await query;
  const events = data || [];

  let myRsvps: string[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .eq('user_id', user.id);
    myRsvps = (rsvps || []).filter(r => r.status === 'going').map(r => r.event_id);
  }

  return NextResponse.json({ events, my_rsvps: myRsvps });
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(`event-rsvp:${clientIp(request)}`, RATE_LIMITS.eventRsvp);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many RSVP changes. Try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { event_id, action } = body;
  if (!event_id) return NextResponse.json({ error: 'event_id is required' }, { status: 400 });

  if (action === 'cancel') {
    const { error: delError } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', event_id)
      .eq('user_id', user.id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 400 });

    await supabase.rpc('increment_event_rsvps', { event_id, delta: -1 });
    return NextResponse.json({ success: true, rsvp: false });
  }

  // action === 'rsvp' (default)
  const { error: upsertError } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id, user_id: user.id, status: 'going' },
      { onConflict: 'event_id,user_id' }
    );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  await supabase.rpc('increment_event_rsvps', { event_id, delta: 1 });
  return NextResponse.json({ success: true, rsvp: true });
}

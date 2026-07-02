import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  return NextResponse.json({ events: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('community_events')
    .insert({
      title: body.title,
      description: body.description,
      event_type: body.event_type || 'other',
      location: body.location,
      url: body.url,
      start_date: body.start_date,
      end_date: body.end_date,
      is_virtual: body.is_virtual || false,
      max_participants: body.max_participants,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}

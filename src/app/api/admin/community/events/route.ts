import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, createServiceClient } from '@/lib/admin-auth';

const EVENT_TYPES = ['conference', 'meetup', 'hackathon', 'webinar', 'workshop', 'launch', 'other'];
const MAX_TITLE = 160;
const MAX_DESC = 4000;

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(['admin', 'editor'], request);
  if (!auth.ok) return auth.response;

  const service = createServiceClient();
  const { data, error } = await service
    .from('community_events')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ events: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['admin', 'editor'], request);
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action || 'create';
  const service = createServiceClient();

  if (action === 'toggle') {
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { data: row } = await service
      .from('community_events')
      .select('is_published')
      .eq('id', body.id)
      .single();
    const next = !row?.is_published;
    const { data, error } = await service
      .from('community_events')
      .update({ is_published: next })
      .eq('id', body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ event: data });
  }

  if (action === 'delete') {
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { error } = await service.from('community_events').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // action === 'create' | 'update'
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (title.length > MAX_TITLE) return NextResponse.json({ error: 'title too long' }, { status: 400 });
  const event_type = EVENT_TYPES.includes(body.event_type) ? body.event_type : 'other';
  if (!body.start_date) return NextResponse.json({ error: 'start_date is required' }, { status: 400 });

  const payload = {
    title,
    description: body.description ? String(body.description).slice(0, MAX_DESC) : null,
    event_type,
    location: body.location ? String(body.location).slice(0, 200) : null,
    url: body.url ? String(body.url).slice(0, 500) : null,
    start_date: body.start_date,
    end_date: body.end_date || null,
    is_virtual: !!body.is_virtual,
    max_participants: body.max_participants ? Math.max(1, Math.min(999999, Number(body.max_participants))) : null,
    is_published: body.is_published !== false,
    image_url: body.image_url ? String(body.image_url).slice(0, 1000) : null,
  };

  if (action === 'update') {
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { data, error } = await service
      .from('community_events')
      .update({ ...payload, created_by: undefined })
      .eq('id', body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ event: data });
  }

  const { data, error } = await service
    .from('community_events')
    .insert({ ...payload, created_by: auth.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, createServiceClient } from '@/lib/admin-auth';

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
    const { data: row } = await service.from('polls').select('is_active').eq('id', body.id).single();
    const next = !row?.is_active;
    const { data, error } = await service
      .from('polls')
      .update({ is_active: next })
      .eq('id', body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ poll: data });
  }

  if (action === 'delete') {
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { error } = await service.from('polls').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  // Create poll
  const { data: poll, error: pollError } = await service
    .from('polls')
    .insert({
      title,
      description: body.description ? String(body.description).slice(0, 1000) : null,
      image_url: body.image_url ? String(body.image_url).slice(0, 1000) : null,
      is_active: true,
    })
    .select()
    .single();

  if (pollError) return NextResponse.json({ error: pollError.message }, { status: 400 });

  // Create options
  if (body.options?.length) {
    const options = body.options.map((text: string, i: number) => ({
      poll_id: poll.id,
      text,
      sort_order: i,
    }));
    const { error: oError } = await service.from('poll_options').insert(options);
    if (oError) return NextResponse.json({ error: oError.message }, { status: 400 });
  }

  return NextResponse.json({ poll });
}
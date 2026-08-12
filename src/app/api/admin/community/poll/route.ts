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

  const service = createServiceClient();

  // Create poll
  const { data: poll, error: pollError } = await service
    .from('polls')
    .insert({
      title: body.title,
      description: body.description || null,
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

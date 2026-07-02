import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Create poll
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      title: body.title,
      description: body.description,
      created_by: user.id,
    })
    .select()
    .single();

  if (pollError) return NextResponse.json({ error: pollError.message }, { status: 400 });

  // Create options
  if (body.options?.length) {
    const options = body.options.map((text: string) => ({
      poll_id: poll.id,
      text,
    }));
    await supabase.from('poll_options').insert(options);
  }

  return NextResponse.json({ poll });
}

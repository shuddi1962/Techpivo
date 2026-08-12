import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: id,
      user_id: user.id,
      score: body.score || 0,
      total_questions: body.total_questions || 0,
      correct_answers: body.correct_answers || 0,
      time_taken: body.time_taken || null,
      answers: body.answers || {},
      completed: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update quiz stats (SECURITY DEFINER RPC — RLS would block direct updates)
  try {
    await supabase.rpc('increment_quiz_stats', { qid: id, new_score: body.score || 0 });
  } catch (e) {
    console.error('increment_quiz_stats failed:', e);
  }

  // Award XP for quiz completion
  try {
    await supabase.rpc('award_xp', {
      target_user_id: user.id,
      xp_amount: 20,
      action_name: 'complete_quiz',
      desc: `Completed quiz: ${id}`,
    });
  } catch (e) {
    console.error('award_xp failed:', e);
  }

  return NextResponse.json({ attempt: data });
}

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

  // Update quiz stats
  try {
    await supabase.rpc('increment_quiz_stats', { qid: id });
  } catch {
    const { data: quiz } = await supabase.from('quizzes').select('attempt_count, avg_score').eq('id', id).single();
    if (quiz) {
      const newCount = (quiz.attempt_count || 0) + 1;
      const newAvg = ((quiz.avg_score || 0) * (quiz.attempt_count || 0) + (body.score || 0)) / newCount;
      await supabase.from('quizzes').update({ attempt_count: newCount, avg_score: newAvg }).eq('id', id);
    }
  }

  // Award XP for quiz completion
  try {
    await supabase.rpc('award_xp', {
      target_user_id: user.id,
      xp_amount: 20,
      action_name: 'complete_quiz',
      desc: `Completed quiz: ${id}`,
    });
  } catch { /* XP function may not exist yet */ }

  return NextResponse.json({ attempt: data });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Quiz payload for the runner. `correct_answer`/`explanation` are NEVER sent
 *  to the client — grading happens server-side on attempt submission. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, description, category, image_url, difficulty, time_limit, question_count, is_published, created_at, community_post_id')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, quiz_id, question, question_type, options, points, sort_order')
    .eq('quiz_id', id)
    .order('sort_order');

  return NextResponse.json({ quiz, questions: questions || [] });
}

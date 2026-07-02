import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Create quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      title: body.title,
      description: body.description,
      category: body.category,
      difficulty: body.difficulty || 'medium',
      question_count: body.questions?.length || 0,
      is_published: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 400 });

  // Create questions
  if (body.questions?.length) {
    const questions = body.questions.map((q: any, i: number) => ({
      quiz_id: quiz.id,
      question: q.question,
      question_type: q.question_type || 'multiple_choice',
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      points: q.points || 1,
      sort_order: i,
    }));
    await supabase.from('quiz_questions').insert(questions);
  }

  return NextResponse.json({ quiz });
}

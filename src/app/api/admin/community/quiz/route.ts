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

  // Create quiz
  const { data: quiz, error: quizError } = await service
    .from('quizzes')
    .insert({
      title: body.title,
      description: body.description,
      category: body.category || null,
      difficulty: body.difficulty || 'medium',
      question_count: body.questions?.length || 0,
      is_published: true,
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
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      points: q.points || 1,
      sort_order: i,
    }));
    const { error: qError } = await service.from('quiz_questions').insert(questions);
    if (qError) return NextResponse.json({ error: qError.message }, { status: 400 });
  }

  return NextResponse.json({ quiz });
}

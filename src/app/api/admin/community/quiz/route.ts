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
    const { data: row } = await service.from('quizzes').select('is_published').eq('id', body.id).single();
    const next = !row?.is_published;
    const { data, error } = await service
      .from('quizzes')
      .update({ is_published: next })
      .eq('id', body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ quiz: data });
  }

  if (action === 'delete') {
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { error } = await service.from('quizzes').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  // Create quiz
  const { data: quiz, error: quizError } = await service
    .from('quizzes')
    .insert({
      title,
      description: body.description ? String(body.description).slice(0, 1000) : null,
      category: body.category || null,
      difficulty: body.difficulty || 'medium',
      question_count: body.questions?.length || 0,
      image_url: body.image_url ? String(body.image_url).slice(0, 1000) : null,
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
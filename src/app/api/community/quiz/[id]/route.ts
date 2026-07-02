import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', id)
    .order('sort_order');

  return NextResponse.json({ quiz, questions: questions || [] });
}

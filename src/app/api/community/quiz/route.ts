import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Public quiz cards — correct_answer/explanation are NEVER sent to the client.
 *  Grading happens server-side on attempt submission. */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('quizzes')
    .select('id, title, description, category, image_url, difficulty, time_limit, question_count, is_published, created_at, community_post_id')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  return NextResponse.json({ quizzes: data || [] });
}
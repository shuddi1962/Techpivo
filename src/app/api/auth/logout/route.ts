import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Proceed with clearing session regardless
  }
  // Clear all possible Supabase auth cookie variants
  const cookieNames = response.cookies.getAll().map(c => c.name);
  for (const name of cookieNames) {
    if (name.includes('sb-') || name.includes('supabase')) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  }
  return response;
}

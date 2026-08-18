import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/csrf';
import { auditLog } from '@/lib/audit-log';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  const ua = request.headers.get("user-agent") || null
  const response = NextResponse.json({ success: true });
  let userId: string | null = null
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
    await supabase.auth.signOut();
  } catch {
    // Proceed with clearing session regardless
  }
  void auditLog({ user_id: userId, action: "logout", entity_type: "auth", ip_address: ip, user_agent: ua })
  // Clear all possible Supabase auth cookie variants
  const cookieNames = response.cookies.getAll().map(c => c.name);
  for (const name of cookieNames) {
    if (name.includes('sb-') || name.includes('supabase')) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  }
  return response;
}

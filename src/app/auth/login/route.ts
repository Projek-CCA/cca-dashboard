import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Fetch user profile to get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    const role = profile?.role || 'editor';

    // Determine redirect based on role
    const redirectMap: Record<string, string> = {
      admin: '/dashboard',
      project_manager: '/dashboard',
      qc: '/qc',
      editor: '/editor/tasks',
    };

    const redirect = redirectMap[role as string] || '/dashboard';

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
      redirect,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

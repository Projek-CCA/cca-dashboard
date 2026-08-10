import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Wrap everything so Next.js never renders an HTML error page —
  // the client always gets valid JSON, even on catastrophic failures.
  try {
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch (err) {
      console.error('[auth/login] Failed to create Supabase client:', err);
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Guard against null user (should not happen when error is null, but be safe)
    if (!data.user) {
      console.error('[auth/login] signInWithPassword succeeded but user is null');
      return NextResponse.json({ error: 'Authentication failed — no user returned' }, { status: 500 });
    }

    // Fetch user profile to get role and client_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[auth/login] Profile fetch error:', profileError);
    }

    const role = profile?.role || 'editor';
    const client_id = profile?.client_id ?? undefined;

    // Determine redirect based on role
    const redirectMap: Record<string, string> = {
      admin: '/dashboard',
      project_manager: '/dashboard',
      qc: '/qc',
      editor: '/editor/tasks',
      client: '/calendar',
    };

    const redirect = redirectMap[role as string] || '/dashboard';

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        client_id,
      },
      redirect,
    });
  } catch (err) {
    // Last-resort catch — ensures JSON even if something unexpected throws
    console.error('[auth/login] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
